/**
 * GroundedScout — autonomous agent over GroundedFacts (Creditcoin CC3 Testnet).
 *
 * Roles (each is a decision the agent makes on its own, logged with the alternatives it rejected):
 *   R1 TARGETING   pick which agents to work on: open bounties first (money), then registry activity
 *   R2 TWO-WAY     collect evidence that HELPS an agent (senior reviewers) and evidence that HURTS it
 *                  (higher feedback indices, negatives, revocations, reviewer-owns-agents, clone siblings)
 *                  — the bounty pays both the same, so the agent has no side
 *   R3 TIMING      before spending gas: skip proofs another scout already admitted (txSeen), and prove
 *                  now only when bounty value covers cost; otherwise wait and say why
 *   R4 CONSUMER    act on its own thresholds: hire an agent through AgentHireEscrow when the facts pass,
 *                  or fund a CoverageBounty so the market fills the gap
 *
 * The contract re-derives every fact from proven bytes; nothing the agent decides is trusted. No LLM.
 */
import { ethers } from "ethers";
import { writeFileSync } from "node:fs";

// ---------- config ----------
const CHAIN_KEY = 3n;
const REP_REG = "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63";
const ID_REG = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432";
const BLOCKSCOUT = "https://eth.blockscout.com";
const PROVER = process.env.PROVER_API ?? "https://proof-gen-api.cc3-testnet.creditcoin.network/api/v1";
const CC3_RPC = process.env.CC3_RPC ?? "https://rpc.cc3-testnet.creditcoin.network";
const BUCKET_BLOCKS = 216_000n;
const GAS_PRICE_WEI = 500_000_000n; // 0.5 gwei on CC3 testnet

const SIG_NEW_FEEDBACK = ethers.id("NewFeedback(uint256,address,uint64,int128,uint8,string,string,string,string,string,bytes32)");
const SIG_FEEDBACK_REVOKED = ethers.id("FeedbackRevoked(uint256,address,uint64)");
const SIG_REGISTERED = ethers.id("Registered(uint256,string,address)");

const FACTS_ABI = [
  "function record((uint64,uint64,bytes,(bytes32,(bytes32,bool)[]),(bytes32,bytes32[]))[]) returns (uint256)",
  "function facts(uint64,uint256,uint64,uint32) view returns ((uint64 breadthRaw,uint64 breadthGrounded,uint64 breadthIndependent,uint64 gapCount,uint64 negatives,uint64 cloneDensityLB,uint64 registrantSiblings,uint64 uriSiblings,uint64 sameTxSiblings,uint64 firstRegisteredHeight))",
  "function txSeen(bytes32) view returns (bool)",
  "function txKeyOf(uint64,uint64,uint64) pure returns (bytes32)",
];
const BOUNTY_ABI = [
  "function bountyCount() view returns (uint256)",
  "function bounties(uint256) view returns (address funder,uint64 chainKey,uint256 agentId,uint64 minAge,uint32 minDepth,uint64 k,uint64 c,uint256 amount,uint64 expiry,bytes32 decision,bool open)",
  "function fund(uint64,uint256,uint64,uint32,uint64,uint64,uint64) payable returns (uint256)",
  "function proveAndClaim(uint256,(uint64,uint64,bytes,(bytes32,(bytes32,bool)[]),(bytes32,bytes32[]))[])",
];
const ESCROW_ABI = [
  "function quote(uint64,uint256,(uint64,uint32,uint64,uint64,uint16,uint16)) view returns (uint256 riskBps,uint16 premiumBps,uint64 gapCount,(uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64) f)",
  "function hire(uint64,uint256,(uint64,uint32,uint64,uint64,uint16,uint16),uint64) payable returns (uint256)",
];

type Thresholds = { minAge: bigint; minDepth: number; k: number; c: number };
type Candidate = { kind: "feedback" | "registered" | "activity" | "negative" | "revoked" | "higherIndex" | "reviewerOwnsAgent" | "cloneSibling"; direction: "helps" | "hurts" | "neutral"; txHash: string; height: bigint; reviewer?: string; note: string; estGas: number };
type Target = { agentId: string; why: string; bountyId?: number; bountyWei?: bigint; thresholds: Thresholds };

const argv = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? "true"]; }));
const ownThr: Thresholds = { minAge: BigInt(argv.minAge ?? 1_300_000), minDepth: Number(argv.minDepth ?? 3), k: Number(argv.k ?? 3), c: Number(argv.c ?? 5) };
const gasBudget = Number(argv.gasBudget ?? 6_000_000);
const maxTargets = Number(argv.maxTargets ?? 3);
const live = !!process.env.PRIVATE_KEY && !!argv.facts;
const provider = new ethers.JsonRpcProvider(CC3_RPC);
const wallet = live ? new ethers.Wallet(process.env.PRIVATE_KEY!, provider) : undefined;
const facts = argv.facts ? new ethers.Contract(argv.facts, FACTS_ABI, wallet ?? provider) : undefined;
const bounty = argv.bounty ? new ethers.Contract(argv.bounty, BOUNTY_ABI, wallet ?? provider) : undefined;
const escrow = argv.escrow ? new ethers.Contract(argv.escrow, ESCROW_ABI, wallet ?? provider) : undefined;

// ---------- helpers ----------
const log = (s: string) => console.log(s);
async function getJson(url: string) { const r = await fetch(url, { headers: { "user-agent": "grounded-scout" } }); if (!r.ok) throw new Error(`${r.status} ${url}`); return r.json(); }
const pad32 = (x: bigint | string) => ethers.zeroPadValue(typeof x === "bigint" ? ethers.toBeHex(x) : x, 32);
async function getLogs(address: string, topic0: string, opts: { topic1?: string; topic2?: string; fromBlock?: number } = {}) {
  let u = `${BLOCKSCOUT}/api?module=logs&action=getLogs&fromBlock=${opts.fromBlock ?? 0}&toBlock=latest&address=${address}&topic0=${topic0}`;
  if (opts.topic1) u += `&topic1=${opts.topic1}&topic0_1_opr=and`;
  if (opts.topic2) u += `&topic2=${opts.topic2}&topic0_2_opr=and`;
  const d = await getJson(u); return Array.isArray(d.result) ? d.result : [];
}
const addrOf = (topic: string) => ("0x" + topic.slice(26)).toLowerCase();
function estimateGas(kind: Candidate["kind"], height: bigint, attested: bigint): number {
  const roots = 90 + Math.floor(Number(attested - height) / 13_000);
  const precompile = 110_000 + 600 * roots;
  const decode = kind === "feedback" || kind === "negative" || kind === "higherIndex" ? 260_000 : kind === "registered" || kind === "cloneSibling" || kind === "reviewerOwnsAgent" ? 440_000 : 130_000;
  return precompile + decode;
}
async function attestedHeight(): Promise<bigint> { return BigInt((await getJson(`${PROVER}/attested-height/${CHAIN_KEY}`)).attestedHeight); }
async function reviewerHistory(addr: string, before: bigint) {
  const d = await getJson(`${BLOCKSCOUT}/api?module=account&action=txlist&address=${addr}&sort=asc&page=1&offset=40`);
  const txs: any[] = Array.isArray(d.result) ? d.result : [];
  const mine = txs.filter((t) => (t.from ?? "").toLowerCase() === addr && BigInt(t.blockNumber) < before);
  const byBucket = new Map<bigint, any>();
  for (const t of mine) { const b = BigInt(t.blockNumber) / BUCKET_BLOCKS; if (!byBucket.has(b)) byBucket.set(b, t); }
  return [...byBucket.values()].sort((a, b) => Number(BigInt(a.blockNumber) - BigInt(b.blockNumber)));
}
const decodeFb = (data: string) => ethers.AbiCoder.defaultAbiCoder().decode(["uint64", "int128", "uint8", "string", "string", "string", "string", "bytes32"], data);

// ---------- R1 targeting ----------
async function chooseTargets(attested: bigint): Promise<Target[]> {
  const targets: Target[] = [];
  if (argv.agents) { for (const a of String(argv.agents).split(",")) targets.push({ agentId: a, why: "operator-specified", thresholds: ownThr }); }
  // money first: open bounties on-chain
  if (bounty) {
    const n = Number(await bounty.bountyCount());
    for (let i = 0; i < n; i++) {
      const b = await bounty.bounties(i);
      if (!b.open || b.chainKey !== CHAIN_KEY) continue;
      targets.push({ agentId: b.agentId.toString(), why: `open bounty #${i} ${ethers.formatEther(b.amount)} tCTC`, bountyId: i, bountyWei: b.amount, thresholds: { minAge: b.minAge, minDepth: Number(b.minDepth), k: Number(b.k), c: Number(b.c) } });
    }
  }
  // then registry activity: most-reviewed agents in the last ~7 days (cheap to cover, likely to be hired)
  if (targets.length < maxTargets) {
    const recent = await getLogs(REP_REG, SIG_NEW_FEEDBACK, { fromBlock: Number(attested - 50_400n) });
    const count = new Map<string, number>();
    for (const l of recent) { const id = BigInt(l.topics[1]).toString(); count.set(id, (count.get(id) ?? 0) + 1); }
    const ranked = [...count.entries()].sort((a, b) => b[1] - a[1]);
    log(`[R1] registry scan: ${recent.length} feedbacks / ${count.size} agents in last 7 days; top ${ranked.slice(0, 5).map(([a, n]) => `${a}(${n})`).join(" ")}`);
    for (const [id, n] of ranked) { if (targets.length >= maxTargets) break; if (!targets.find((t) => t.agentId === id)) targets.push({ agentId: id, why: `${n} feedbacks in last 7 days`, thresholds: ownThr }); }
  }
  const chosen = targets.slice(0, maxTargets);
  log(`[R1] targets: ${chosen.map((t) => `${t.agentId} (${t.why})`).join(" · ")}` + (targets.length > maxTargets ? ` · skipped ${targets.length - maxTargets} (maxTargets)` : ""));
  return chosen;
}

// ---------- R2 two-way evidence ----------
async function gatherEvidence(t: Target, attested: bigint) {
  const fbLogs = await getLogs(REP_REG, SIG_NEW_FEEDBACK, { topic1: pad32(BigInt(t.agentId)) });
  const rvLogs = await getLogs(REP_REG, SIG_FEEDBACK_REVOKED, { topic1: pad32(BigInt(t.agentId)) });
  const regLogs = await getLogs(ID_REG, SIG_REGISTERED, { topic1: pad32(BigInt(t.agentId)) });
  const helps: { reviewer: string; cands: Candidate[]; age: bigint; depth: number; cost: number }[] = [];
  const hurts: Candidate[] = [];
  const neutral: Candidate[] = [];
  const byReviewer = new Map<string, any[]>();
  for (const l of fbLogs) { const rv = addrOf(l.topics[2]); (byReviewer.get(rv) ?? byReviewer.set(rv, []).get(rv)!).push(l); }
  if (regLogs.length) { const r = regLogs[0]; neutral.push({ kind: "registered", direction: "neutral", txHash: r.transactionHash, height: BigInt(r.blockNumber), note: "Registered: owner, registrant, uri, same-tx siblings", estGas: estimateGas("registered", BigInt(r.blockNumber), attested) }); }
  for (const l of rvLogs) hurts.push({ kind: "revoked", direction: "hurts", txHash: l.transactionHash, height: BigInt(l.blockNumber), reviewer: addrOf(l.topics[2]), note: `revocation by ${addrOf(l.topics[2]).slice(0, 10)}`, estGas: estimateGas("activity", BigInt(l.blockNumber), attested) });
  for (const [rv, logs] of byReviewer) {
    logs.sort((a, b) => Number(BigInt(a.blockNumber) - BigInt(b.blockNumber)));
    const first = logs[0]; const fh = BigInt(first.blockNumber);
    // helps: earliest feedback + seniority
    const hist = await reviewerHistory(rv, fh);
    const cands: Candidate[] = [{ kind: "feedback", direction: "helps", txHash: first.transactionHash, height: fh, reviewer: rv, note: `earliest feedback by ${rv.slice(0, 10)}`, estGas: estimateGas("feedback", fh, attested) }];
    let age = 0n, depth = 1;
    if (hist.length) { age = fh - BigInt(hist[0].blockNumber); for (const tx of hist.slice(0, Math.max(1, t.thresholds.minDepth - 1))) { cands.push({ kind: "activity", direction: "helps", txHash: tx.hash, height: BigInt(tx.blockNumber), reviewer: rv, note: `activity of ${rv.slice(0, 10)} @${tx.blockNumber}`, estGas: estimateGas("activity", BigInt(tx.blockNumber), attested) }); depth++; } }
    helps.push({ reviewer: rv, cands, age, depth, cost: cands.reduce((s, c) => s + c.estGas, 0) });
    // hurts: negatives, higher indices, reviewer owns agents
    for (const l of logs) { const [idx, value] = decodeFb(l.data); if (BigInt(value) < 0n) hurts.push({ kind: "negative", direction: "hurts", txHash: l.transactionHash, height: BigInt(l.blockNumber), reviewer: rv, note: `negative feedback #${idx} by ${rv.slice(0, 10)}`, estGas: estimateGas("negative", BigInt(l.blockNumber), attested) }); }
    if (logs.length > 1) { const last = logs[logs.length - 1]; const [idx] = decodeFb(last.data); hurts.push({ kind: "higherIndex", direction: "hurts", txHash: last.transactionHash, height: BigInt(last.blockNumber), reviewer: rv, note: `latest index #${idx} by ${rv.slice(0, 10)} (exposes gaps)`, estGas: estimateGas("higherIndex", BigInt(last.blockNumber), attested) }); }
    const owned = await getLogs(ID_REG, SIG_REGISTERED, { topic2: pad32(rv) });
    if (owned.length) hurts.push({ kind: "reviewerOwnsAgent", direction: "hurts", txHash: owned[0].transactionHash, height: BigInt(owned[0].blockNumber), reviewer: rv, note: `reviewer ${rv.slice(0, 10)} owns ${owned.length} agent(s) → not independent`, estGas: estimateGas("reviewerOwnsAgent", BigInt(owned[0].blockNumber), attested) });
  }
  // clone siblings by owner (lower-bound density for the consumer's `c`)
  if (regLogs.length) { const owner = addrOf(regLogs[0].topics[2]); const sibs = (await getLogs(ID_REG, SIG_REGISTERED, { topic2: pad32(owner) })).filter((l) => BigInt(l.topics[1]).toString() !== t.agentId); for (const s of sibs.slice(0, t.thresholds.c)) hurts.push({ kind: "cloneSibling", direction: "hurts", txHash: s.transactionHash, height: BigInt(s.blockNumber), note: `sibling agent ${BigInt(s.topics[1])} of owner ${owner.slice(0, 10)} (${sibs.length} total)`, estGas: estimateGas("cloneSibling", BigInt(s.blockNumber), attested) }); }
  return { fbLogs, byReviewer, helps, hurts, neutral };
}

// ---------- R3 timing / R2 selection ----------
async function alreadyAdmitted(c: Candidate): Promise<boolean> {
  if (!facts) return false;
  try { const p = await getJson(`${PROVER}/proof-by-tx/${CHAIN_KEY}/${c.txHash}`); return await facts.txSeen(await facts.txKeyOf(CHAIN_KEY, p.headerNumber, p.txIndex)); } catch { return false; }
}
function decide(t: Target, ev: Awaited<ReturnType<typeof gatherEvidence>>) {
  const thr = t.thresholds; const chosen: Candidate[] = []; const rejected: { c: Candidate; why: string }[] = []; let spent = 0;
  for (const c of ev.neutral) { chosen.push(c); spent += c.estGas; }
  // hurts first: they change the decision tuple most often (gaps, independence, clones) and pay the same
  for (const c of ev.hurts) { if (spent + c.estGas > gasBudget) { rejected.push({ c, why: "over gas budget" }); continue; } chosen.push(c); spent += c.estGas; }
  const groundable = ev.helps.filter((o) => o.age >= thr.minAge && o.depth >= thr.minDepth).sort((a, b) => a.cost - b.cost);
  let grounded = 0;
  for (const o of groundable) {
    if (grounded >= thr.k) { o.cands.forEach((c) => rejected.push({ c, why: `k=${thr.k} reached; more would not change the decision` })); continue; }
    if (spent + o.cost > gasBudget) { o.cands.forEach((c) => rejected.push({ c, why: `over gas budget (${spent}+${o.cost}>${gasBudget})` })); continue; }
    chosen.push(...o.cands); spent += o.cost; grounded++;
  }
  for (const o of ev.helps) if (!groundable.includes(o)) o.cands.forEach((c) => rejected.push({ c, why: `cannot be grounded: age ${o.age} < ${thr.minAge} or depth ${o.depth} < ${thr.minDepth}` }));
  return { chosen, rejected, spent, grounded };
}

// ---------- main ----------
async function main() {
  const attested = await attestedHeight();
  log(`[scout] attested mainnet height ${attested} · own thresholds ${JSON.stringify({ ...ownThr, minAge: ownThr.minAge.toString() })} · budget ${gasBudget} gas · ${live ? "LIVE" : "DRY-RUN"}`);
  const targets = await chooseTargets(attested);
  const iface = new ethers.Interface(FACTS_ABI);
  for (const t of targets) {
    log(`\n[agent ${t.agentId}] ${t.why}`);
    const ev = await gatherEvidence(t, attested);
    log(`[R2] evidence: ${ev.fbLogs.length} feedbacks / ${ev.byReviewer.size} reviewers · helps ${ev.helps.length} reviewers · hurts ${ev.hurts.length} (${ev.hurts.map((h) => h.kind).join(",") || "none"})`);
    const d = decide(t, ev);
    // R3: drop what another scout already admitted; prove now only if it pays
    const fresh: Candidate[] = []; for (const c of d.chosen) { if (await alreadyAdmitted(c)) d.rejected.push({ c, why: "already admitted on-chain by someone else (txSeen)" }); else fresh.push(c); }
    const costWei = BigInt(fresh.reduce((s, c) => s + c.estGas, 0)) * GAS_PRICE_WEI;
    const worth = t.bountyWei === undefined ? true : t.bountyWei >= costWei;
    log(`[R3] ${fresh.length} proofs to submit (~${fresh.reduce((s, c) => s + c.estGas, 0)} gas ≈ ${ethers.formatEther(costWei)} tCTC)` + (t.bountyWei !== undefined ? ` vs bounty ${ethers.formatEther(t.bountyWei)} tCTC → ${worth ? "prove now" : "WAIT (bounty below cost)"}` : ""));
    for (const c of fresh) log(`   + ${c.direction.padEnd(7)} ${c.kind.padEnd(17)} ${c.txHash.slice(0, 12)} @${c.height} ~${c.estGas}  ${c.note}`);
    for (const r of d.rejected.slice(0, 8)) log(`   - ${r.c.direction.padEnd(7)} ${r.c.kind.padEnd(17)} ${r.c.txHash.slice(0, 12)} : ${r.why}`);
    if (d.rejected.length > 8) log(`   - … ${d.rejected.length - 8} more rejected`);
    log(`[R2] expected after: breadthGrounded ${d.grounded} (k=${t.thresholds.k}) · hurts submitted ${fresh.filter((c) => c.direction === "hurts").length}`);
    // proofs
    const proofs: any[] = [];
    for (const c of fresh) { try { const p = await getJson(`${PROVER}/proof-by-tx/${CHAIN_KEY}/${c.txHash}`); proofs.push([BigInt(p.chainKey), BigInt(p.headerNumber), p.txBytes, [p.merkleProof.root, p.merkleProof.siblings.map((s: any) => [s.hash, s.isLeft])], [p.continuityProof.lowerEndpointDigest, p.continuityProof.roots]]); } catch (e: any) { log(`   proof FAILED ${c.txHash.slice(0, 12)}: ${e.message}`); } }
    const out = `plans/agent-${t.agentId}-${Date.now()}.json`;
    writeFileSync(out, JSON.stringify({ target: { ...t, bountyWei: t.bountyWei?.toString(), thresholds: { ...t.thresholds, minAge: t.thresholds.minAge.toString() } }, chosen: fresh.map((c) => ({ ...c, height: c.height.toString() })), rejected: d.rejected.map((r) => ({ ...r, c: { ...r.c, height: r.c.height.toString() } })), proofs: proofs.length }, null, 1));
    log(`[plan] ${out} · ${proofs.length} proofs fetched`);
    if (!live || !worth || proofs.length === 0) continue;
    // submit: via bounty (atomic claim) or plain record, ≤4 proofs per tx
    for (let i = 0; i < proofs.length; i += 4) {
      const slice = proofs.slice(i, i + 4);
      const tx = t.bountyId !== undefined && i === 0 ? await bounty!.proveAndClaim(t.bountyId, slice) : await facts!.record(slice);
      log(`[tx] ${tx.hash}`); const rc = await tx.wait(); log(`[tx] mined block ${rc?.blockNumber} gasUsed ${rc?.gasUsed}`);
    }
    // R4: act as a consumer on own thresholds
    if (escrow && argv.hireWei) {
      const p = [ownThr.minAge, ownThr.minDepth, ownThr.k, ownThr.c, 100, 2000];
      const q = await escrow.quote(CHAIN_KEY, t.agentId, p);
      const f = await facts!.facts(CHAIN_KEY, t.agentId, ownThr.minAge, ownThr.minDepth);
      const pass = q.gapCount === 0n && f.breadthGrounded >= BigInt(ownThr.k);
      log(`[R4] facts: grounded ${f.breadthGrounded}/${ownThr.k} independent ${f.breadthIndependent} gaps ${f.gapCount} negatives ${f.negatives} cloneLB ${f.cloneDensityLB} → premium ${q.premiumBps} bps → ${pass ? "HIRE" : "FUND BOUNTY instead"}`);
      if (pass) { const tx = await escrow.hire(CHAIN_KEY, t.agentId, p, BigInt(Math.floor(Date.now() / 1000) + 86400), { value: BigInt(argv.hireWei) }); log(`[R4] hired: ${tx.hash}`); await tx.wait(); }
      else if (bounty) { const tx = await bounty.fund(CHAIN_KEY, t.agentId, ownThr.minAge, ownThr.minDepth, ownThr.k, ownThr.c, BigInt(Math.floor(Date.now() / 1000) + 7 * 86400), { value: BigInt(argv.hireWei) / 10n }); log(`[R4] bounty funded: ${tx.hash}`); await tx.wait(); }
    }
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
