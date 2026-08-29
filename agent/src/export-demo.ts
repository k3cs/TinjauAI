/**
 * Export demo data for the web UI from scout plans + prover proofs, using the same fact rules as the contract.
 *   npx tsx src/export-demo.ts plans/agent-34135-*.json plans/agent-50283-*.json > ../web/public/demo/facts.json
 */
import { ethers } from "ethers";
import { readFileSync } from "node:fs";

const PROVER = process.env.PROVER_API ?? "https://proof-gen-api.cc3-testnet.creditcoin.network/api/v1";
const REP_REG = "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63".toLowerCase();
const ID_REG = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432".toLowerCase();
const SIG_NEW_FEEDBACK = ethers.id("NewFeedback(uint256,address,uint64,int128,uint8,string,string,string,string,string,bytes32)");
const SIG_REGISTERED = ethers.id("Registered(uint256,string,address)");
const SIG_TRANSFER = ethers.id("Transfer(address,address,uint256)");
const BUCKET = 216_000n;
const coder = ethers.AbiCoder.defaultAbiCoder();

function decodeTx(txBytes: string) {
  const [txType, chunks] = coder.decode(["uint8", "bytes[]"], txBytes);
  const [, , from] = coder.decode(["uint64", "uint64", "address", "bool", "address", "uint256", "bytes"], chunks[0]);
  const receiptIdx = Number(txType) <= 2 ? 2 : 3;
  const [status, , logs] = coder.decode(["uint8", "uint64", "tuple(address,bytes32[],bytes)[]", "bytes"], chunks[receiptIdx]);
  return { from: (from as string).toLowerCase(), status: Number(status), logs: (logs as any[]).map((l) => ({ address: (l[0] as string).toLowerCase(), topics: l[1] as string[], data: l[2] as string })) };
}

async function agentFromPlan(path: string) {
  const plan = JSON.parse(readFileSync(path, "utf8"));
  const agentId: string = plan.target?.agentId ?? plan.agentId;
  const thr = plan.target?.thresholds ?? plan.thresholds;
  const oldest = new Map<string, bigint>(); const buckets = new Map<string, Set<bigint>>();
  const pairs = new Map<string, { first: bigint; maxIndex: bigint; proven: Set<bigint>; negatives: number }>();
  const owners = new Map<string, number>(); // owner -> proven agents registered
  let owner = "", registrant = "", uriHash = "", registeredHeight = 0n, sameTxSiblings = 0;
  const proofs: any[] = [];
  for (const c of plan.chosen) {
    const p = await (await fetch(`${PROVER}/proof-by-tx/3/${c.txHash}`)).json();
    if (!p.txBytes) continue;
    const h = BigInt(p.headerNumber); const tx = decodeTx(p.txBytes);
    proofs.push({ kind: c.kind, direction: c.direction, txHash: c.txHash, height: p.headerNumber, txIndex: p.txIndex, roots: p.continuityProof.roots.length, from: tx.from, note: c.note });
    oldest.set(tx.from, oldest.has(tx.from) ? (h < oldest.get(tx.from)! ? h : oldest.get(tx.from)!) : h);
    if (!buckets.has(tx.from)) buckets.set(tx.from, new Set()); buckets.get(tx.from)!.add(h / BUCKET);
    if (tx.status !== 1) continue;
    let regInTx = 0;
    for (const l of tx.logs) {
      if (l.address === REP_REG && l.topics[0] === SIG_NEW_FEEDBACK && BigInt(l.topics[1]).toString() === agentId) {
        const client = ("0x" + l.topics[2].slice(26)).toLowerCase();
        const [index, value] = coder.decode(["uint64", "int128", "uint8", "string", "string", "string", "string", "bytes32"], l.data);
        const pr = pairs.get(client) ?? { first: h, maxIndex: 0n, proven: new Set<bigint>(), negatives: 0 };
        if (h < pr.first) pr.first = h; if (BigInt(index) > pr.maxIndex) pr.maxIndex = BigInt(index); pr.proven.add(BigInt(index)); if (BigInt(value) < 0n) pr.negatives++;
        pairs.set(client, pr);
      } else if (l.address === ID_REG && l.topics[0] === SIG_REGISTERED) {
        const o = ("0x" + l.topics[2].slice(26)).toLowerCase(); owners.set(o, (owners.get(o) ?? 0) + 1); regInTx++;
        if (BigInt(l.topics[1]).toString() === agentId) { owner = o; registrant = tx.from; registeredHeight = h; const [uri] = coder.decode(["string"], l.data); uriHash = ethers.keccak256(ethers.toUtf8Bytes(uri)); }
      } else if (l.address === ID_REG && l.topics[0] === SIG_TRANSFER && BigInt(l.topics[3]).toString() === agentId) {
        const from = ("0x" + l.topics[1].slice(26)).toLowerCase(); const to = ("0x" + l.topics[2].slice(26)).toLowerCase();
        if (from !== ethers.ZeroAddress && from === owner) { owners.set(from, (owners.get(from) ?? 1) - 1); owners.set(to, (owners.get(to) ?? 0) + 1); owner = to; }
      }
    }
    if (regInTx > 1 && proofs[proofs.length - 1].kind === "registered") sameTxSiblings = regInTx - 1;
  }
  const reviewers = [...pairs.entries()].map(([client, pr]) => {
    const o = oldest.get(client); const age = o && pr.first > o ? pr.first - o : 0n; const depth = buckets.get(client)?.size ?? 0;
    return { client, firstFeedbackHeight: pr.first.toString(), oldestHeight: o?.toString() ?? null, ageBlocks: age.toString(), depth, maxIndex: pr.maxIndex.toString(), proven: pr.proven.size, negatives: pr.negatives, ownsAgents: owners.get(client) ?? 0 };
  });
  const grounded = (minAge: bigint, minDepth: number) => reviewers.filter((r) => BigInt(r.ageBlocks) >= minAge && r.depth >= minDepth && (minAge === 0n || BigInt(r.ageBlocks) > 0n)).length;
  const facts = {
    breadthRaw: reviewers.length, breadthGrounded: grounded(BigInt(thr.minAge), Number(thr.minDepth)),
    breadthIndependent: reviewers.filter((r) => r.ownsAgents === 0 && r.client !== owner).length,
    gapCount: reviewers.filter((r) => BigInt(r.maxIndex) > BigInt(r.proven)).length,
    negatives: reviewers.reduce((s, r) => s + r.negatives, 0),
    cloneDensityLB: Math.max(0, (owners.get(owner) ?? 1) - 1), registrantSiblings: 0, uriSiblings: 0, sameTxSiblings, firstRegisteredHeight: registeredHeight.toString(),
  };
  return { agentId, thresholds: thr, owner, registrant, uriHash, facts, reviewers, proofs, decisions: { chosen: plan.chosen, rejected: plan.rejected.slice(0, 40) }, source: { plan: path.split("/").pop(), generatedAt: new Date().toISOString(), mode: "demo" } };
}

async function main() {
  const out: any = { agents: {}, chainKey: 3, registries: { identity: ID_REG, reputation: REP_REG }, note: "Recomputed off-chain from the same Attestcoin proofs the contract admits; see agent/src/verify.ts" };
  for (const p of process.argv.slice(2)) { const a = await agentFromPlan(p); out.agents[a.agentId] = a; console.error(`agent ${a.agentId}: facts ${JSON.stringify(a.facts)} reviewers ${a.reviewers.length} proofs ${a.proofs.length}`); }
  console.log(JSON.stringify(out, null, 1));
}
main().catch((e) => { console.error(e); process.exit(1); });
