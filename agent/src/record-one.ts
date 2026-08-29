/** Record one proven tx: npx tsx src/record-one.ts <chainKey> <txHash> [<txHash>...]  (needs FACTS, PRIVATE_KEY, CC3_RPC) */
import { ethers } from "ethers";
const PROVER = process.env.PROVER_API ?? "https://proof-gen-api.cc3-testnet.creditcoin.network/api/v1";
const ABI = ["function record((uint64,uint64,bytes,(bytes32,(bytes32,bool)[]),(bytes32,bytes32[]))[]) returns (uint256)", "function txRegisteredCount(bytes32) view returns (uint64)", "function txKeyOf(uint64,uint64,uint64) pure returns (bytes32)"];
async function main() {
  const [chainKey, ...hashes] = process.argv.slice(2);
  const provider = new ethers.JsonRpcProvider(process.env.CC3_RPC); const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const facts = new ethers.Contract(process.env.FACTS!, ABI, wallet);
  const proofs: any[] = []; const meta: any[] = [];
  for (const h of hashes) {
    const p = await (await fetch(`${PROVER}/proof-by-tx/${chainKey}/${h}`)).json();
    if (!p.txBytes) { console.log(`no proof for ${h}: ${JSON.stringify(p).slice(0, 120)}`); continue; }
    proofs.push([BigInt(p.chainKey), BigInt(p.headerNumber), p.txBytes, [p.merkleProof.root, p.merkleProof.siblings.map((s: any) => [s.hash, s.isLeft])], [p.continuityProof.lowerEndpointDigest, p.continuityProof.roots]]);
    meta.push({ h, height: p.headerNumber, txIndex: p.txIndex, roots: p.continuityProof.roots.length, txBytes: (p.txBytes.length - 2) / 2 });
    console.log(`proof ${h.slice(0, 12)} chainKey ${p.chainKey} height ${p.headerNumber} txIndex ${p.txIndex} roots ${p.continuityProof.roots.length} txBytes ${(p.txBytes.length - 2) / 2}B`);
  }
  if (!proofs.length) return;
  const tx = await facts.record(proofs); console.log(`[tx] ${tx.hash}`); const rc = await tx.wait(); console.log(`[tx] mined block ${rc?.blockNumber} gasUsed ${rc?.gasUsed} status ${rc?.status}`);
  for (const m of meta) { const key = await facts.txKeyOf(chainKey, m.height, m.txIndex); console.log(`txRegisteredCount(${m.h.slice(0, 10)}) = ${await facts.txRegisteredCount(key)}`); }
}
main().catch((e) => { console.error(e.shortMessage ?? e); process.exit(1); });
