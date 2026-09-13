import { JsonRpcProvider } from "ethers";
import { DEPLOYMENT, sourceOf } from "./config.js";
import { Tinjau } from "./contracts.js";
import { FactsModel } from "./facts-model.js";
import { ProverClient } from "./prover.js";

/** Public RPCs used to map (height, txIndex) back to a source tx hash. Blocks, not state: no archive needed. */
export const SOURCE_RPC: Record<number, string> = {
  1: "https://ethereum-sepolia-rpc.publicnode.com",
  3: "https://ethereum-rpc.publicnode.com",
};

/**
 * Map (height, txIndex) to the source tx hash. Public Ethereum RPCs prune pre-merge history
 * (publicnode: "pruned history unavailable: requested 14306215, earliest available 15500000",
 * 13 Sep 2026), so when the RPC cannot answer, fall back to the chain's Blockscout block listing.
 * Either way the hash is only a lookup key: the proof fetched for it is what gets verified.
 */
async function sourceTxHash(src: JsonRpcProvider, r: AdmittedRef): Promise<string> {
  try {
    const raw = (await src.send("eth_getTransactionByBlockNumberAndIndex", ["0x" + r.height.toString(16), "0x" + r.txIndex.toString(16)])) as { hash: string } | null;
    if (raw?.hash) return raw.hash;
  } catch {
    /* fall through to Blockscout */
  }
  const base = `${sourceOf(r.chainKey).blockscout}/api/v2/blocks/${r.height}/transactions`;
  let params = "";
  for (let page = 0; page < 40; page++) {
    const res = await fetch(base + params);
    if (!res.ok) throw new Error(`blockscout ${res.status} for block ${r.height}`);
    const body = (await res.json()) as { items: { hash: string; position: number }[]; next_page_params: Record<string, string | number> | null };
    const hit = body.items.find((t) => BigInt(t.position) === r.txIndex);
    if (hit) return hit.hash;
    if (!body.next_page_params) break;
    params = "?" + new URLSearchParams(Object.entries(body.next_page_params).map(([k, v]) => [k, String(v)])).toString();
  }
  throw new Error(`source tx not found at ${r.chainKey}:${r.height}:${r.txIndex}`);
}

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
    r.sourceTx = await sourceTxHash(src, r);
    const p = await prover.proofByTx(r.chainKey, r.sourceTx);
    model.admit({ chainKey: r.chainKey, height: BigInt(p.headerNumber), txIndex: BigInt(p.txIndex), txBytes: p.txBytes, attestors: r.attestors });
  }
  return { model, refs };
}
