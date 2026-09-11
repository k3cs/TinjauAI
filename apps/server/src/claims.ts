import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { AbiCoder } from "ethers";
import { ProverClient, ProverError, TOPICS, sourceOf, toContractProof, verifyWithPrecompile } from "@tinjau/core";

/**
 * Claim reader (DEC-C). ERC-8004 reviews often carry a free-form `feedbackURI` whose JSON *claims*
 * a payment happened ("proof_of_payment": {network, tx}). Formats differ per marketplace, so an LLM
 * reads the document and proposes (network, txHash) pairs. The LLM decides nothing: every hash must
 * appear verbatim in the document, and only the Attestcoin prover and the BlockProver precompile
 * decide whether the claimed transaction exists on the claimed chain. Results are a report, never
 * facts on-chain.
 */

const MODEL = process.env.TINJAU_CLAIMS_MODEL ?? "claude-opus-5";

const ClaimsSchema = z.object({
  claims: z.array(
    z.object({
      network: z.string().describe("Network or chain the document says the payment happened on, as written (e.g. 'ethereum', 'base', 'eip155:1')."),
      txHash: z.string().describe("Transaction hash exactly as it appears in the document."),
      quote: z.string().describe("Short verbatim excerpt of the document that states this claim."),
    }),
  ),
});

export type Verdict =
  | "proven" // prover returned a proof on the claimed chain and the precompile verified it
  | "not-on-claimed-chain" // prover: tx hash not found on the claimed (supported) chain
  | "unsupported-chain" // Attestcoin cannot read that chain today (only Ethereum mainnet and Sepolia)
  | "hash-not-in-document" // LLM output rejected: the hash is not in the source text
  | "malformed-hash"
  | "not-yet-attested"
  | "prover-error";

export interface ClaimResult {
  network: string;
  txHash: string;
  quote: string;
  chainKey?: number;
  verdict: Verdict;
  detail: string;
}

export interface ReviewClaims {
  client: string;
  feedbackIndex: string;
  reviewTx: string;
  feedbackURI: string;
  fetched: boolean;
  claims: ClaimResult[];
  note?: string;
}

export interface ClaimsReport {
  chainKey: number;
  agentId: string;
  model: string;
  generatedAt: string;
  reviewsScanned: number;
  withUri: number;
  claims: number;
  byVerdict: Record<string, number>;
  reviews: ReviewClaims[];
}

const coder = AbiCoder.defaultAbiCoder();

function networkToChainKey(network: string): number | undefined {
  const n = network.trim().toLowerCase();
  if (["ethereum", "eth", "mainnet", "ethereum mainnet", "eip155:1", "1", "homestead"].includes(n)) return 3;
  if (["sepolia", "ethereum sepolia", "eip155:11155111", "11155111"].includes(n)) return 1;
  return undefined;
}

async function fetchDoc(uri: string): Promise<string | undefined> {
  try {
    if (uri.startsWith("data:")) {
      const [meta, body] = uri.split(",", 2);
      return meta.includes(";base64") ? Buffer.from(body, "base64").toString("utf8") : decodeURIComponent(body);
    }
    const url = uri.startsWith("ipfs://") ? `https://ipfs.io/ipfs/${uri.slice(7)}` : uri;
    if (!/^https?:\/\//.test(url)) return undefined;
    const res = await fetch(url, { signal: AbortSignal.timeout(6_000), headers: { accept: "application/json,text/plain,*/*" } });
    if (!res.ok) return undefined;
    return (await res.text()).slice(0, 20_000);
  } catch {
    return undefined;
  }
}

async function extract(client: Anthropic, doc: string) {
  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 4_000,
    output_config: { effort: "low", format: zodOutputFormat(ClaimsSchema) },
    system:
      "You read ERC-8004 feedback documents written by AI-agent marketplaces. List every claim that a payment or on-chain transaction happened, with the network and transaction hash exactly as written. If the document makes no such claim, return an empty list. Do not infer or normalise hashes.",
    messages: [{ role: "user", content: `Feedback document:\n\n${doc}` }],
  });
  if (response.stop_reason === "refusal") return { claims: [], refused: true };
  return { claims: response.parsed_output?.claims ?? [], refused: false };
}

export async function checkClaim(prover: ProverClient, doc: string, c: { network: string; txHash: string; quote: string }): Promise<ClaimResult> {
  const base = { network: c.network, txHash: c.txHash, quote: c.quote.slice(0, 200) };
  if (!/^0x[0-9a-fA-F]{64}$/.test(c.txHash)) return { ...base, verdict: "malformed-hash", detail: "not a 32-byte hex hash" };
  if (!doc.toLowerCase().includes(c.txHash.toLowerCase())) {
    return { ...base, verdict: "hash-not-in-document", detail: "the model returned a hash that is not in the source text; discarded" };
  }
  const chainKey = networkToChainKey(c.network);
  if (chainKey === undefined) {
    return { ...base, verdict: "unsupported-chain", detail: "Attestcoin reads Ethereum mainnet and Sepolia only; this claim cannot be checked on Creditcoin" };
  }
  try {
    const p = await prover.proofByTx(chainKey, c.txHash);
    const ok = await verifyWithPrecompile(toContractProof(p));
    return ok
      ? { ...base, chainKey, verdict: "proven", detail: `included at ${sourceOf(chainKey).name} block ${p.headerNumber}; BlockProver verify = true (inclusion only, not amount or payee)` }
      : { ...base, chainKey, verdict: "prover-error", detail: "proof returned but the precompile rejected it" };
  } catch (e) {
    if (e instanceof ProverError && e.code === "TxHashNotFound") {
      return { ...base, chainKey, verdict: "not-on-claimed-chain", detail: `no such transaction on ${sourceOf(chainKey).name}` };
    }
    if (e instanceof ProverError && /NotReady|NotAttested/i.test(e.code)) {
      return { ...base, chainKey, verdict: "not-yet-attested", detail: e.message };
    }
    return { ...base, chainKey, verdict: "prover-error", detail: String((e as Error).message).slice(0, 160) };
  }
}

interface FeedbackLog {
  client: string;
  index: bigint;
  uri: string;
  tx: string;
}

/** NewFeedback logs for `agentId` from Blockscout v2 (discovery only), newest first. */
async function feedbackLogs(chainKey: number, agentId: bigint, maxPages = 4): Promise<FeedbackLog[]> {
  const src = sourceOf(chainKey);
  const topic = "0x" + agentId.toString(16).padStart(64, "0");
  const out: FeedbackLog[] = [];
  let qs = `topic=${topic}`;
  for (let page = 0; page < maxPages; page++) {
    const res = await fetch(`${src.blockscout}/api/v2/addresses/${src.reputationRegistry}/logs?${qs}`, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`blockscout ${res.status}`);
    const body = (await res.json()) as { items: { topics: (string | null)[]; data: string; transaction_hash: string }[]; next_page_params: Record<string, string | number> | null };
    for (const l of body.items) {
      if (l.topics[0] !== TOPICS.NewFeedback || l.topics[1] !== topic) continue;
      const d = coder.decode(["uint64", "int128", "uint8", "string", "string", "string", "string", "bytes32"], l.data);
      out.push({ client: "0x" + (l.topics[2] as string).slice(-40), index: d[0] as bigint, uri: d[6] as string, tx: l.transaction_hash });
    }
    if (!body.next_page_params) break;
    qs = new URLSearchParams({ ...Object.fromEntries(Object.entries(body.next_page_params).map(([k, v]) => [k, String(v)])) }).toString();
  }
  return out;
}

export async function claimsReport(chainKey: number, agentId: bigint, opts: { maxReviews?: number; anthropic?: Anthropic } = {}): Promise<ClaimsReport> {
  const client = opts.anthropic ?? new Anthropic();
  const prover = new ProverClient({ retries: 1, retryDelayMs: 1_000 });
  const logs = await feedbackLogs(chainKey, agentId);
  const withUri = logs.filter((l) => l.uri.length > 0);
  const reviews: ReviewClaims[] = [];
  for (const l of withUri.slice(0, opts.maxReviews ?? 8)) {
    const doc = await fetchDoc(l.uri);
    const r: ReviewClaims = { client: l.client, feedbackIndex: l.index.toString(), reviewTx: l.tx, feedbackURI: l.uri, fetched: !!doc, claims: [] };
    if (!doc) {
      r.note = "feedbackURI could not be fetched";
      reviews.push(r);
      continue;
    }
    const { claims, refused } = await extract(client, doc);
    if (refused) r.note = "model declined to read this document";
    for (const c of claims) r.claims.push(await checkClaim(prover, doc, c));
    reviews.push(r);
  }
  const all = reviews.flatMap((r) => r.claims);
  const byVerdict: Record<string, number> = {};
  for (const c of all) byVerdict[c.verdict] = (byVerdict[c.verdict] ?? 0) + 1;
  return {
    chainKey,
    agentId: agentId.toString(),
    model: MODEL,
    generatedAt: new Date().toISOString(),
    reviewsScanned: logs.length,
    withUri: withUri.length,
    claims: all.length,
    byVerdict,
    reviews,
  };
}
