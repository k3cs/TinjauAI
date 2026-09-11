import { JsonRpcProvider } from "ethers";
import { DEPLOYMENT } from "./config.js";
import { Tinjau } from "./contracts.js";
import { FactsModel } from "./facts-model.js";
import { ProverClient } from "./prover.js";

/** Public RPCs used to map (height, txIndex) back to a source tx hash. Blocks, not state: no archive needed. */
export const SOURCE_RPC: Record<number, string> = {
  1: "https://ethereum-sepolia-rpc.publicnode.com",
  3: "https://ethereum-rpc.publicnode.com",
};

export interface AdmittedRef {
  chainKey: number;
  height: bigint;
  txIndex: bigint;
  attestors: number;
  cc3Tx: string;
  sourceTx?: string;
}

/**
 * Independent audit of the bureau: read every TxAdmitted event from GroundedFacts, find each source
 * transaction on Ethereum by (block, index), fetch its proof again from the Attestcoin prover, and
 * replay it through the off-chain FactsModel. Needs no file from whoever submitted the proofs.
 */
export async function recomputeFromChain(opts: { tinjau?: Tinjau; prover?: ProverClient; sourceRpc?: Record<number, string>; log?: (l: string) => void } = {}) {
  const tinjau = opts.tinjau ?? new Tinjau();
  const prover = opts.prover ?? new ProverClient();
  const rpcs = opts.sourceRpc ?? SOURCE_RPC;
  const log = opts.log ?? (() => {});
  const provider = tinjau.facts.runner!.provider!;
  const deploy = await provider.getTransactionReceipt(DEPLOYMENT.txs.facts);
  const events = await tinjau.facts.queryFilter(tinjau.facts.filters.TxAdmitted(), deploy?.blockNumber ?? 0);
  const refs: AdmittedRef[] = events.map((e) => {
    const a = (e as unknown as { args: [bigint, bigint, bigint, string, bigint] }).args;
    return { chainKey: Number(a[0]), height: a[1], txIndex: a[2], attestors: Number(a[4]), cc3Tx: e.transactionHash };
  });
  log(`recompute: ${refs.length} admitted source txs from ${events.length} TxAdmitted events`);

  const sources = new Map<number, JsonRpcProvider>();
  const model = new FactsModel();
  for (const r of refs) {
    let src = sources.get(r.chainKey);
    if (!src) sources.set(r.chainKey, (src = new JsonRpcProvider(rpcs[r.chainKey], undefined, { staticNetwork: true })));
    const raw = (await src.send("eth_getTransactionByBlockNumberAndIndex", ["0x" + r.height.toString(16), "0x" + r.txIndex.toString(16)])) as { hash: string } | null;
    if (!raw) throw new Error(`source tx not found at ${r.chainKey}:${r.height}:${r.txIndex}`);
    r.sourceTx = raw.hash;
    const p = await prover.proofByTx(r.chainKey, raw.hash);
    model.admit({ chainKey: r.chainKey, height: BigInt(p.headerNumber), txIndex: BigInt(p.txIndex), txBytes: p.txBytes, attestors: r.attestors });
  }
  return { model, refs };
}
