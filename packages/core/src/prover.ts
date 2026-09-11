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
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  async attestedHeight(chainKey: number): Promise<number> {
    const r = await this.get<{ attestedHeight: number }>(`/attested-height/${chainKey}`);
    return r.attestedHeight;
  }

  async proofByTx(chainKey: number, txHash: string): Promise<ProofResponse> {
    return this.get<ProofResponse>(`/proof-by-tx/${chainKey}/${txHash}`);
  }

  /** Proofs sharing one continuity proof (all txs within one attestation window). */
  async proofBatch(chainKey: number, txHashes: string[]) {
    return this.request<{
      chainKey: number;
      fromHeader: number;
      toHeader: number;
      continuityProof: ProofResponse["continuityProof"];
      merkleProofs: Record<string, Record<string, { txHash: string; txBytes: string; merkleProof: ProofResponse["merkleProof"] }>>;
    }>(`/proof-batch-by-tx/${chainKey}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(txHashes) });
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

export function txBytesLength(p: ProofResponse): number {
  return (p.txBytes.length - 2) / 2;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
