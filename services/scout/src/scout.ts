import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { AbiCoder, keccak256, Wallet, formatEther } from "ethers";
import {
  CC3_TESTNET, DEPLOYMENT, ProverClient, Tinjau, cc3Provider, toContractProof,
  type ContractProof, type Facts, type HireParams, type ProofResponse,
} from "@tinjau/core";
import { Discovery, type ReviewerData } from "./discovery.js";
import { plan, short, type Decision, type Thresholds } from "./planner.js";

export interface ScoutOptions {
  chainKey: number;
  agents: bigint[];
  maxTargets: number;
  thresholds: Thresholds;
  gasBudget: number;
  maxReviewersScanned: number;
  helpShare: number;
  gapProofs: "conflicted" | "all" | "none";
  hireWei: bigint;
  maxPremiumBps: bigint;
  fundWei: bigint;
  privateKey?: string;
  plansDir: string;
  cacheDir: string;
  log: (line: string) => void;
}

export interface TxRecord {
  kind: "record" | "proveAndClaim" | "hire" | "fund";
  hash: string;
  block: number;
  gasUsed: string;
  proofs?: string[];
  note?: string;
}

export interface Plan {
  version: 3;
  mode: "dry-run" | "live";
  chainKey: number;
  agentId: string;
  target: { source: "bounty" | "cli" | "registry"; bountyId?: string; bountyAmount?: string; reason: string };
  thresholds: { minAge: string; minDepth: number; k: string; c: string };
  startedAt: string;
  attestedHeight: number;
  contracts: typeof DEPLOYMENT;
  decisions: Decision[];
  proofs: ProofResponse[];
  txs: TxRecord[];
  factsBefore?: Record<string, string | number | boolean>;
  factsAfter?: Record<string, string | number | boolean>;
  r3: string;
  r4: string;
}

const GAS_PRICE_WEI = 500_000_000n; // CC3 testnet gas price observed 11 Sep 2026 (cast gas-price)
const BATCH = 4;

export async function runScout(o: ScoutOptions) {
  const provider = cc3Provider();
  const signer = o.privateKey ? new Wallet(o.privateKey, provider) : undefined;
  const tinjau = signer ? Tinjau.withSigner(signer) : new Tinjau(provider);
  const prover = new ProverClient();
  const disc = new Discovery(o.chainKey, o.cacheDir);
  mkdirSync(o.plansDir, { recursive: true });
  const mode = signer ? "live" : "dry-run";
  o.log(`[scout] mode=${mode} chainKey=${o.chainKey} facts=${DEPLOYMENT.facts}${signer ? ` signer=${signer.address}` : ""}`);

  // ---------------- R1 targeting: open bounties first, then CLI agents, then most-reviewed agents
  type Target = Plan["target"] & { agentId: bigint };
  const targets: Target[] = [];
  const bounties = (await tinjau.openBounties()).filter((b) => b.chainKey === o.chainKey);
  for (const b of bounties) {
    targets.push({ agentId: b.agentId, source: "bounty", bountyId: b.id.toString(), bountyAmount: b.amount.toString(), reason: `open bounty #${b.id} (${formatEther(b.amount)} tCTC, expires ${new Date(Number(b.expiry) * 1000).toISOString()})` });
  }
  for (const a of o.agents) targets.push({ agentId: a, source: "cli", reason: "requested with --agents" });
  if (o.agents.length === 0) {
    const hot = await disc.mostReviewed(50_400, o.maxTargets * 2);
    for (const h of hot) targets.push({ agentId: h.agentId, source: "registry", reason: `${h.reviews} reviews in the last ~7 days` });
  }
  const unique: Target[] = [];
  for (const t of targets) if (!unique.some((u) => u.agentId === t.agentId)) unique.push(t);
  const chosen = unique.slice(0, o.maxTargets);
  for (const t of unique) o.log(`[R1] ${chosen.includes(t) ? "target" : "skip  "} agent ${t.agentId}: ${t.reason}${chosen.includes(t) ? "" : " (maxTargets reached)"}`);

  const results: Plan[] = [];
  for (const t of chosen) results.push(await scoutAgent(t, o, { tinjau, prover, disc, signer: !!signer }));
  return results;
}

async function scoutAgent(
  t: Plan["target"] & { agentId: bigint },
  o: ScoutOptions,
  ctx: { tinjau: Tinjau; prover: ProverClient; disc: Discovery; signer: boolean },
): Promise<Plan> {
  const { tinjau, prover, disc } = ctx;
  const th = o.thresholds;
  const attestedHeight = await prover.attestedHeight(o.chainKey);
  const agent = await disc.agent(t.agentId);
  o.log(`[R2] agent ${t.agentId}: ${agent.reviews.length} reviews, ${new Set(agent.reviews.map((r) => r.client)).size} reviewers, owner ${agent.registration ? short(agent.registration.owner) : "unknown"}, owner holds ${agent.ownerRegistrations.length} registration(s)`);

  // Scan the reviewers with the fewest reviews first: cheapest to prove completely.
  const counts = new Map<string, number>();
  for (const r of agent.reviews) counts.set(r.client, (counts.get(r.client) ?? 0) + 1);
  const toScan = [...counts.entries()].sort((a, b) => a[1] - b[1]).slice(0, o.maxReviewersScanned).map(([c]) => c);
  const reviewers = new Map<string, ReviewerData>();
  for (const c of toScan) reviewers.set(c.toLowerCase(), await disc.reviewer(c));

  // R3 input: which source txs are already admitted on-chain (by any scout)
  const admittedCache = new Map<string, boolean>();
  const keyOf = (h: number, i: number) => keccak256(AbiCoder.defaultAbiCoder().encode(["uint64", "uint64", "uint64"], [o.chainKey, h, i]));
  const candidates = new Set<string>();
  const pre = plan({ agent, reviewers, thresholds: th, gasBudget: o.gasBudget, attestedHeight, helpShare: o.helpShare, gapProofs: o.gapProofs, isAdmitted: () => false });
  for (const d of pre) if (d.tx !== "-") candidates.add(`${d.height}:${d.txIndex}`);
  for (const k of candidates) {
    const [h, i] = k.split(":").map(Number);
    admittedCache.set(k, await tinjau.facts.admittedTx(keyOf(h, i)));
  }
  const decisions = plan({ agent, reviewers, thresholds: th, gasBudget: o.gasBudget, attestedHeight, helpShare: o.helpShare, gapProofs: o.gapProofs, isAdmitted: (h, i) => admittedCache.get(`${h}:${i}`) ?? false });

  for (const d of decisions) {
    const tag = d.dir === "help" ? "+" : d.dir === "hurt" ? "-" : "=";
    o.log(`   ${tag} [${d.status}] ${d.role} ${d.tx === "-" ? "" : short(d.tx) + " "}${d.reason} :: ${d.why}${d.status === "chosen" ? ` (~${d.estGas} gas)` : ""}`);
  }

  const chosen = decisions.filter((d) => d.status === "chosen");
  const estGas = chosen.reduce((s, d) => s + d.estGas, 0);
  const estCost = BigInt(estGas) * GAS_PRICE_WEI;
  const already = decisions.filter((d) => d.status === "admitted").length;

  // ---------------- R3 timing
  let r3: string;
  let proveNow = chosen.length > 0;
  if (chosen.length === 0) r3 = `nothing new to prove (${already} already admitted by earlier runs) → 0 gas`;
  else if (t.source === "bounty") {
    proveNow = BigInt(t.bountyAmount!) >= estCost;
    r3 = `${chosen.length} proofs ≈ ${estGas} gas ≈ ${formatEther(estCost)} tCTC vs bounty ${formatEther(BigInt(t.bountyAmount!))} tCTC → ${proveNow ? "prove now" : "wait (bounty below cost)"}`;
  } else r3 = `${chosen.length} proofs ≈ ${estGas} gas ≈ ${formatEther(estCost)} tCTC; ${already} skipped as already admitted`;
  o.log(`[R3] ${r3}`);

  const proofs: ProofResponse[] = [];
  if (proveNow) {
    for (const d of chosen) {
      const p = await prover.proofByTx(o.chainKey, d.tx);
      if (p.txIndex !== d.txIndex || p.headerNumber !== d.height) throw new Error(`prover/discovery mismatch for ${d.tx}`);
      proofs.push(p);
    }
  }

  const factsBefore = await tinjau.readFacts(o.chainKey, t.agentId, th.minAge, th.minDepth);
  const txs: TxRecord[] = [];
  if (ctx.signer && proveNow && proofs.length) {
    const order = [...proofs];
    for (let i = 0; i < order.length; i += BATCH) {
      const batch = order.slice(i, i + BATCH);
      const cps: ContractProof[] = batch.map(toContractProof);
      let kind: TxRecord["kind"] = "record";
      if (t.bountyId !== undefined) {
        try {
          await tinjau.bounty.proveAndClaim.staticCall(BigInt(t.bountyId), cps);
          kind = "proveAndClaim";
        } catch {
          /* this batch does not flip the decision on its own: plain record */
        }
      }
      const tx = kind === "proveAndClaim" ? await tinjau.proveAndClaim(BigInt(t.bountyId!), cps) : await tinjau.record(cps);
      const rc = await tx.wait();
      txs.push({ kind, hash: tx.hash, block: rc!.blockNumber, gasUsed: rc!.gasUsed.toString(), proofs: batch.map((p) => p.txHash) });
      o.log(`[tx] ${kind} ${batch.length} proof(s) ${tx.hash} block ${rc!.blockNumber} gas ${rc!.gasUsed}`);
      if (kind === "proveAndClaim") {
        o.log(`[R3] bounty #${t.bountyId} claimed with this batch`);
        t = { ...t, bountyId: undefined };
      }
    }
  }
  const factsAfter = await tinjau.readFacts(o.chainKey, t.agentId, th.minAge, th.minDepth);

  // ---------------- R4 consumer: hire if the facts pass our own thresholds, else fund a bounty
  const params: HireParams = { minAge: th.minAge, minDepth: th.minDepth, k: th.k, c: th.c, baseBps: 100, maxBps: 2_000, minAttestors: 0, maxStaleness: 0n };
  let r4 = "";
  const registered = await tinjau.isRegistered(o.chainKey, t.agentId);
  if (!registered) r4 = "no hire: registration not proven on-chain yet";
  else {
    const q = await tinjau.readQuote(o.chainKey, t.agentId, params);
    const facts = q.facts;
    if (facts.gapCount > 0n) r4 = `no hire: gated (${facts.gapCount} reviewer(s) with unproven review indices)`;
    else if (facts.truncated) r4 = "no hire: facts truncated";
    else if (q.premiumBps > o.maxPremiumBps) r4 = `no hire: premium ${q.premiumBps} bps above my limit ${o.maxPremiumBps} bps`;
    else r4 = `HIRE: premium ${q.premiumBps} bps (risk ${q.riskBps} bps), grounded ${facts.breadthGrounded}/${th.k}, clones ${facts.cloneDensityLB}`;
    if (ctx.signer && r4.startsWith("HIRE") && o.hireWei > 0n) {
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 86_400);
      const tx = await tinjau.hire(o.chainKey, t.agentId, params, deadline, o.hireWei);
      const rc = await tx.wait();
      txs.push({ kind: "hire", hash: tx.hash, block: rc!.blockNumber, gasUsed: rc!.gasUsed.toString(), note: `${formatEther(o.hireWei)} tCTC, premium ${q.premiumBps} bps` });
      o.log(`[tx] hire ${tx.hash} block ${rc!.blockNumber} gas ${rc!.gasUsed}`);
    } else if (ctx.signer && !r4.startsWith("HIRE") && o.fundWei > 0n && t.source !== "bounty") {
      const expiry = BigInt(Math.floor(Date.now() / 1000) + 7 * 86_400);
      const tx = await tinjau.fund(o.chainKey, t.agentId, th.minAge, th.minDepth, th.k, th.c, expiry, o.fundWei);
      const rc = await tx.wait();
      txs.push({ kind: "fund", hash: tx.hash, block: rc!.blockNumber, gasUsed: rc!.gasUsed.toString(), note: `bounty ${formatEther(o.fundWei)} tCTC for evidence that changes the decision` });
      r4 += ` → funded a bounty (${formatEther(o.fundWei)} tCTC)`;
      o.log(`[tx] fund ${tx.hash}`);
    }
  }
  o.log(`[R4] agent ${t.agentId}: ${r4}`);

  const planOut: Plan = {
    version: 3,
    mode: ctx.signer ? "live" : "dry-run",
    chainKey: o.chainKey,
    agentId: t.agentId.toString(),
    target: { source: t.source, bountyId: t.bountyId, bountyAmount: t.bountyAmount, reason: t.reason },
    thresholds: { minAge: th.minAge.toString(), minDepth: th.minDepth, k: th.k.toString(), c: th.c.toString() },
    startedAt: new Date().toISOString(),
    attestedHeight,
    contracts: DEPLOYMENT,
    decisions,
    proofs,
    txs,
    factsBefore: plain(factsBefore),
    factsAfter: plain(factsAfter),
    r3,
    r4,
  };
  const file = join(o.plansDir, `agent-${t.agentId}-${Date.now()}.json`);
  writeFileSync(file, JSON.stringify(planOut, null, 2));
  o.log(`[plan] ${file}`);
  return planOut;
}

function plain(f: Facts): Record<string, string | number | boolean> {
  return Object.fromEntries(Object.entries(f).map(([k, v]) => [k, typeof v === "bigint" ? v.toString() : (v as number | boolean)]));
}

export { CC3_TESTNET };
