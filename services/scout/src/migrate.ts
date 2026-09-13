/**
 * One-off (13 Sep 2026, DEC-F option b): re-admit into the current GroundedFacts every source
 * transaction that the 11 Sep deployment had admitted, so the bureau moves contracts without
 * losing a single proven fact. Reads TxAdmitted from the OLD contract, maps (height, txIndex) back
 * to the source hash, skips what the new contract already holds, fetches each proof again from the
 * prover and records it. Nothing here trusts a local file: the old contract's events are the list.
 *
 *   PRIVATE_KEY=… npx tsx --conditions=development src/migrate.ts 0xC045087Fd85Da4f2d981222b18E7e74c8040BC47
 */
import { Contract, JsonRpcProvider, Wallet } from "ethers";
import { ProverClient, SOURCE_RPC, Tinjau, cc3Provider, groundedFactsAbi, toContractProof } from "@tinjau/core";

const OLD = process.argv[2];
if (!OLD) throw new Error("usage: migrate.ts <old GroundedFacts address>");
const pk = process.env.PRIVATE_KEY;
if (!pk) throw new Error("PRIVATE_KEY missing");
const PER_TX = Number(process.env.PER_TX ?? 3);

const provider = cc3Provider();
const old = new Contract(OLD, groundedFactsAbi, provider);
const signer = new Wallet(pk, provider);
const tinjau = Tinjau.withSigner(signer);
const prover = new ProverClient();

type Ref = { chainKey: number; height: bigint; txIndex: bigint };
const key = (r: Ref) => `${r.chainKey}:${r.height}:${r.txIndex}`;

async function admitted(c: Contract): Promise<Ref[]> {
  const ev = await c.queryFilter(c.filters.TxAdmitted(), 5_470_000);
  return ev.map((e) => {
    const a = (e as unknown as { args: [bigint, bigint, bigint, string, bigint] }).args;
    return { chainKey: Number(a[0]), height: a[1], txIndex: a[2] };
  });
}

const oldRefs = await admitted(old);
const have = new Set((await admitted(tinjau.facts)).map(key));
// The current deployment may know fewer source chains than the old one (Sepolia was dropped on
// 12 Sep because its registry entries cost nothing to mint); those proofs are skipped, not migrated.
const known = new Set(((await tinjau.facts.chainKeys()) as bigint[]).map(Number));
const skipped = oldRefs.filter((r) => !known.has(r.chainKey));
const todo = oldRefs.filter((r) => !have.has(key(r)) && known.has(r.chainKey));
console.log(`old: ${oldRefs.length} admitted, new already has ${have.size}, to migrate: ${todo.length}, skipped (chain unknown to new contract): ${skipped.length}`);

const sources = new Map<number, JsonRpcProvider>();
const proofs: { ref: Ref; hash: string; proof: ReturnType<typeof toContractProof>; bytes: number }[] = [];
for (const r of todo) {
  let src = sources.get(r.chainKey);
  if (!src) sources.set(r.chainKey, (src = new JsonRpcProvider(SOURCE_RPC[r.chainKey], undefined, { staticNetwork: true })));
  const raw = (await src.send("eth_getTransactionByBlockNumberAndIndex", ["0x" + r.height.toString(16), "0x" + r.txIndex.toString(16)])) as { hash: string } | null;
  if (!raw) throw new Error(`source tx not found ${key(r)}`);
  const p = await prover.proofByTx(r.chainKey, raw.hash);
  const cp = toContractProof(p);
  proofs.push({ ref: r, hash: raw.hash, proof: cp, bytes: (cp.encodedTx.length - 2) / 2 });
  console.log(`proof ${key(r)} ${raw.hash} roots=${p.continuityProof.roots.length} bytes=${(cp.encodedTx.length - 2) / 2}`);
}

// Group by chainKey; large transactions (mass registration, >20 KB) go alone.
const groups: typeof proofs[] = [];
for (const ck of new Set(proofs.map((p) => p.ref.chainKey))) {
  let cur: typeof proofs = [];
  for (const p of proofs.filter((x) => x.ref.chainKey === ck)) {
    if (p.bytes > 20_000) { if (cur.length) groups.push(cur), (cur = []); groups.push([p]); continue; }
    cur.push(p);
    if (cur.length === PER_TX) groups.push(cur), (cur = []);
  }
  if (cur.length) groups.push(cur);
}

let total = 0n;
for (const g of groups) {
  const tx = await tinjau.record(g.map((p) => p.proof));
  const rc = await tx.wait();
  total += rc!.gasUsed;
  console.log(`[tx] record ${g.length} proof(s) ${tx.hash} block ${rc!.blockNumber} gas ${rc!.gasUsed} :: ${g.map((p) => p.hash.slice(0, 10)).join(" ")}`);
}
const after = await admitted(tinjau.facts);
console.log(`done: new contract now holds ${after.length} admitted source txs (old had ${oldRefs.length}); gas spent ${total}`);
