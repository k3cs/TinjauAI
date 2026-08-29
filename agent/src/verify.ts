/**
 * Independent verifier: recompute GroundedFacts' per-reviewer facts from a scout plan's proofs,
 * off-chain, using only the proven `txBytes` (same decoding as the contract). Anyone can run this
 * to check that the on-chain facts follow from the published proofs.
 *   npx tsx src/verify.ts plans/agent-34135-*.json
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
  const [nonce, gasLimit, from] = coder.decode(["uint64", "uint64", "address", "bool", "address", "uint256", "bytes"], chunks[0]);
  const receiptIdx = Number(txType) <= 2 ? 2 : 3;
  const [status, gasUsed, logs] = coder.decode(["uint8", "uint64", "tuple(address,bytes32[],bytes)[]", "bytes"], chunks[receiptIdx]);
  return { from: (from as string).toLowerCase(), status: Number(status), logs: (logs as any[]).map((l) => ({ address: (l[0] as string).toLowerCase(), topics: l[1] as string[], data: l[2] as string })) };
}

async function main() {
  const plan = JSON.parse(readFileSync(process.argv[2], "utf8"));
  const thr = plan.thresholds;
  const oldest = new Map<string, bigint>(); const buckets = new Map<string, Set<bigint>>();
  const pairs = new Map<string, { first: bigint; maxIndex: bigint; proven: Set<bigint>; negatives: number }>();
  let agentOwner = "", registrant = "";
  for (const c of plan.chosen) {
    const p = await (await fetch(`${PROVER}/proof-by-tx/3/${c.txHash}`)).json();
    const h = BigInt(p.headerNumber);
    const tx = decodeTx(p.txBytes);
    // activity of sender
    oldest.set(tx.from, oldest.has(tx.from) ? (h < oldest.get(tx.from)! ? h : oldest.get(tx.from)!) : h);
    if (!buckets.has(tx.from)) buckets.set(tx.from, new Set()); buckets.get(tx.from)!.add(h / BUCKET);
    if (tx.status !== 1) continue;
    for (const l of tx.logs) {
      if (l.address === REP_REG && l.topics[0] === SIG_NEW_FEEDBACK) {
        const agentId = BigInt(l.topics[1]); if (agentId.toString() !== plan.agentId) continue;
        const client = ("0x" + l.topics[2].slice(26)).toLowerCase();
        const [index, value] = coder.decode(["uint64", "int128", "uint8", "string", "string", "string", "string", "bytes32"], l.data);
        const pr = pairs.get(client) ?? { first: h, maxIndex: 0n, proven: new Set<bigint>(), negatives: 0 };
        if (h < pr.first) pr.first = h; if (BigInt(index) > pr.maxIndex) pr.maxIndex = BigInt(index); pr.proven.add(BigInt(index)); if (BigInt(value) < 0n) pr.negatives++;
        pairs.set(client, pr);
      } else if (l.address === ID_REG && l.topics[0] === SIG_REGISTERED && BigInt(l.topics[1]).toString() === plan.agentId) {
        agentOwner = ("0x" + l.topics[2].slice(26)).toLowerCase(); registrant = tx.from;
      } else if (l.address === ID_REG && l.topics[0] === SIG_TRANSFER && BigInt(l.topics[3]).toString() === plan.agentId) {
        const to = ("0x" + l.topics[2].slice(26)).toLowerCase(); if (("0x" + l.topics[1].slice(26)).toLowerCase() === agentOwner) agentOwner = to;
      }
    }
  }
  let breadthRaw = 0, breadthGrounded = 0, gapCount = 0, negatives = 0;
  for (const [client, pr] of pairs) {
    breadthRaw++; negatives += pr.negatives; if (pr.maxIndex > BigInt(pr.proven.size)) gapCount++;
    const o = oldest.get(client); const age = o && pr.first > o ? pr.first - o : 0n; const depth = buckets.get(client)?.size ?? 0;
    const grounded = age >= BigInt(thr.minAge) && depth >= thr.minDepth && (BigInt(thr.minAge) === 0n || age > 0n);
    console.log(`reviewer ${client.slice(0, 10)} age=${age} depth=${depth} maxIndex=${pr.maxIndex} proven=${pr.proven.size} grounded=${grounded}`);
    if (grounded) breadthGrounded++;
  }
  console.log(JSON.stringify({ agentId: plan.agentId, owner: agentOwner, registrant, breadthRaw, breadthGrounded, gapCount, negatives, meetsK: breadthGrounded >= thr.k }, null, 1));
}
main().catch((e) => { console.error(e); process.exit(1); });
