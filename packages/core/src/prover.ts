import { CC3_TESTNET } from "./config.js";

/** One proof as returned by the CC3 prover API `proof-by-tx/{chainKey}/{tx}`. */
export interface ProofResponse {
  chainKey: number;
  headerNumber: number;
  txIndex: number;
  txHash: string;
  txBytes: string;
  continuityProof: { lowerEndpointDigest: string; roots: string[] };
  merkleProof: { root: string; siblings: { hash: string; isLeft: boolean }[] };
  cached?: boolean;
  generatedAt?: string;
}

/** Proof in the shape `GroundedFacts.record` expects. */
export interface ContractProof {
  chainKey: bigint;
  height: bigint;
  encodedTx: string;
  merkleProof: { root: string; siblings: { hash: string; isLeft: boolean }[] };
  continuityProof: { lowerEndpointDigest: string; roots: string[] };
}

/** Batch in the shape `GroundedFacts.recordBatch` expects: parallel arrays, one shared continuity proof. */
export interface ContractBatch {
  chainKey: bigint;
  heights: bigint[];
  encodedTxs: string[];
  merkleProofs: { root: string; siblings: { hash: string; isLeft: boolean }[] }[];
  continuityProof: { lowerEndpointDigest: string; roots: string[] };
  /** Source tx hashes in member order, for logs and plans; not sent to the contract. */
  txHashes: string[];
}

/** The prover's `proof-batch-by-tx` answer: members keyed by header then by tx index. */
export interface BatchResponse {
  chainKey: number;
  fromHeader: number;
  toHeader: number;
  continuityProof: { lowerEndpointDigest: string; roots: string[] };
  merkleProofs: Record<string, Record<string, { txHash: string; txBytes: string; merkleProof: ProofResponse["merkleProof"] }>>;
}

export class ProverError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly retriable: boolean,
    readonly status: number,
  ) {
    super(`${code}: ${message}`);
  }
}

/** Attestcoin rejects source transactions above this size (docs.attestcoin.org, gas costs page). */
export const MAX_TX_BYTES = 500_000;

export interface ProverOptions {
  baseUrl?: string;
  retries?: number;
  retryDelayMs?: number;
  fetchImpl?: typeof fetch;
}

export class ProverClient {
  readonly baseUrl: string;
  private readonly retries: number;
  private readonly retryDelayMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: ProverOptions = {}) {
    this.baseUrl = (opts.baseUrl ?? CC3_TESTNET.prover).replace(/\/$/, "");
    this.retries = opts.retries ?? 3;
    this.retryDelayMs = opts.retryDelayMs ?? 5_000;
    // Bound to the global object on purpose. Stored unbound, `this.fetchImpl(...)` is invoked with
    // the client as its receiver, which Node tolerates and every browser rejects outright with
    // "Illegal invocation" — so the browser claim path failed before it ever reached the contract.
    this.fetchImpl = opts.fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  async attestedHeight(chainKey: number): Promise<number> {
    const r = await this.get<{ attestedHeight: number }>(`/attested-height/${chainKey}`);
    return r.attestedHeight;
  }

  async proofByTx(chainKey: number, txHash: string): Promise<ProofResponse> {
    return this.get<ProofResponse>(`/proof-by-tx/${chainKey}/${txHash}`);
  }

  /** Proofs sharing one continuity proof (all txs within one attestation window). */
  async proofBatch(chainKey: number, txHashes: string[]): Promise<BatchResponse> {
    return this.request<BatchResponse>(`/proof-batch-by-tx/${chainKey}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(txHashes) });
  }

  private get<T>(path: string): Promise<T> {
    return this.request<T>(path, {});
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    let last: unknown;
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const res = await this.fetchImpl(this.baseUrl + path, init);
        const text = await res.text();
        if (res.ok) return JSON.parse(text) as T;
        let body: { code?: string; message?: string; retriable?: boolean } = {};
        try {
          body = JSON.parse(text);
        } catch {
          body = { message: text.slice(0, 200) };
        }
        const err = new ProverError(body.code ?? `HTTP${res.status}`, body.message ?? "", body.retriable ?? res.status >= 500, res.status);
        if (!err.retriable) throw err;
        last = err;
      } catch (e) {
        if (e instanceof ProverError && !e.retriable) throw e;
        last = e;
      }
      if (attempt < this.retries) await sleep(this.retryDelayMs * (attempt + 1));
    }
    throw last;
  }
}

export function toContractProof(p: ProofResponse): ContractProof {
  return {
    chainKey: BigInt(p.chainKey),
    height: BigInt(p.headerNumber),
    encodedTx: p.txBytes,
    merkleProof: { root: p.merkleProof.root, siblings: p.merkleProof.siblings.map((s) => ({ hash: s.hash, isLeft: s.isLeft })) },
    continuityProof: { lowerEndpointDigest: p.continuityProof.lowerEndpointDigest, roots: [...p.continuityProof.roots] },
  };
}

/**
 * Flatten the prover's nested batch into the contract's parallel arrays. Ascending by header then
 * tx index; the precompile accepts any order (checked live), this just keeps plans readable.
 */
export function toContractBatch(b: BatchResponse): ContractBatch {
  const out: ContractBatch = { chainKey: BigInt(b.chainKey), heights: [], encodedTxs: [], merkleProofs: [], continuityProof: { lowerEndpointDigest: b.continuityProof.lowerEndpointDigest, roots: [...b.continuityProof.roots] }, txHashes: [] };
  for (const h of Object.keys(b.merkleProofs).map(Number).sort((a, c) => a - c)) {
    const inner = b.merkleProofs[String(h)];
    for (const k of Object.keys(inner).map(Number).sort((a, c) => a - c)) {
      const m = inner[String(k)];
      out.heights.push(BigInt(h));
      out.encodedTxs.push(m.txBytes);
      out.merkleProofs.push({ root: m.merkleProof.root, siblings: m.merkleProof.siblings.map((s) => ({ hash: s.hash, isLeft: s.isLeft })) });
      out.txHashes.push(m.txHash);
    }
  }
  return out;
}

export function txBytesLength(p: ProofResponse): number {
  return (p.txBytes.length - 2) / 2;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
