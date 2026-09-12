import { AbiCoder } from "ethers";
import { ProverClient, ProverError, TOPICS, sourceOf, toContractProof, verifyWithPrecompile } from "@tinjau/core";

/**
 * Claim reader (DEC-C). ERC-8004 reviews often carry a free-form `feedbackURI` whose JSON *claims*
 * a payment happened ("proof_of_payment": {network, tx}). Formats differ per marketplace, so an LLM
 * reads the document and proposes (network, txHash) pairs. The LLM decides nothing: every hash must
 * appear verbatim in the document, and only the Attestcoin prover and the BlockProver precompile
 * decide whether the claimed transaction exists on the claimed chain. Results are a report, never
 * facts on-chain.
 *
 * The reader runs on Gemini (Google AI Studio REST API, no SDK dependency). Free-tier quotas are
 * per model, so `MODELS` is a ladder: on a quota or availability error the reader falls to the next
 * model and keeps going. The model that actually answered is reported per review.
 */

// Checked against the live API on 12 Sep 2026: every model here answers `generateContent`.
// The 2.5 family returns 404 ("no longer available to new users") and is deliberately absent.
const DEFAULT_MODELS = ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"];

const MODELS = (process.env.TINJAU_CLAIMS_MODELS ?? process.env.TINJAU_CLAIMS_MODEL ?? DEFAULT_MODELS.join(","))
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

const GEMINI_BASE = process.env.GEMINI_API_BASE ?? "https://generativelanguage.googleapis.com/v1beta";

/** Response schema for the extraction step (Gemini structured output; a subset of OpenAPI schema). */
const CLAIMS_SCHEMA = {
  type: "object",
  properties: {
    claims: {
      type: "array",
      items: {
        type: "object",
        properties: {
          network: { type: "string", description: "Network or chain the document says the payment happened on, as written (e.g. 'ethereum', 'base', 'eip155:1')." },
          txHash: { type: "string", description: "Transaction hash exactly as it appears in the document." },
          quote: { type: "string", description: "Short verbatim excerpt of the document that states this claim." },
        },
        required: ["network", "txHash", "quote"],
        propertyOrdering: ["network", "txHash", "quote"],
      },
    },
  },
  required: ["claims"],
} as const;

const SYSTEM =
  "You read ERC-8004 feedback documents written by AI-agent marketplaces. List every claim that a payment or on-chain transaction happened, with the network and transaction hash exactly as written. If the document makes no such claim, return an empty list. Do not infer or normalise hashes.";

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
  /** Which model in the ladder actually read this document. */
  model?: string;
  note?: string;
}

export interface ClaimsReport {
  chainKey: number;
  agentId: string;
  /** The configured ladder, tried in order when a model runs out of quota. */
  models: string[];
  modelsUsed: string[];
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

export interface ExtractedClaim {
  network: string;
  txHash: string;
  quote: string;
}

export interface ExtractResult {
  claims: ExtractedClaim[];
  model?: string;
  /** Set when no model in the ladder could answer, or the one that did declined/returned nothing usable. */
  note?: string;
}

/** True for errors where trying the next model in the ladder is the right move (quota, overload, model gone). */
function shouldFallOver(status: number): boolean {
  return status === 429 || status === 503 || status === 500 || status === 404;
}

async function callGemini(model: string, apiKey: string, doc: string): Promise<{ ok: true; text: string } | { ok: false; status: number; detail: string }> {
  let res: Response;
  try {
    res = await fetch(`${GEMINI_BASE}/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      signal: AbortSignal.timeout(60_000),
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: "user", parts: [{ text: `Feedback document:\n\n${doc}` }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 4_000, responseMimeType: "application/json", responseSchema: CLAIMS_SCHEMA },
      }),
    });
  } catch (e) {
    return { ok: false, status: 503, detail: String((e as Error).message).slice(0, 160) };
  }
  if (!res.ok) return { ok: false, status: res.status, detail: (await res.text()).slice(0, 200) };
  const body = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[] };
  const cand = body.candidates?.[0];
  if (!cand || (cand.finishReason && !["STOP", "MAX_TOKENS"].includes(cand.finishReason))) {
    return { ok: false, status: 422, detail: `finishReason ${cand?.finishReason ?? "none"}` };
  }
  return { ok: true, text: (cand.content?.parts ?? []).map((p) => p.text ?? "").join("") };
}

/**
 * Ask each model in the ladder in turn until one answers. A quota or availability error moves to the
 * next model; a refusal or unparsable answer is reported for that document and does not retry, since
 * another model would read the same text.
 */
export async function extract(doc: string, apiKey = process.env.GEMINI_API_KEY, models = MODELS): Promise<ExtractResult> {
  if (!apiKey) return { claims: [], note: "GEMINI_API_KEY is not set" };
  const failures: string[] = [];
  for (const model of models) {
    const r = await callGemini(model, apiKey, doc);
    if (!r.ok) {
      failures.push(`${model}: ${r.status}`);
      if (shouldFallOver(r.status)) continue;
      return { claims: [], model, note: `model declined to read this document (${r.detail})` };
    }
    try {
      const parsed = JSON.parse(r.text) as { claims?: ExtractedClaim[] };
      const claims = (parsed.claims ?? []).filter((c) => typeof c?.network === "string" && typeof c?.txHash === "string");
      return { claims, model, ...(claims.length !== (parsed.claims ?? []).length ? { note: "some entries were dropped: wrong shape" } : {}) };
    } catch {
      return { claims: [], model, note: "model returned text that is not the requested JSON" };
    }
  }
  return { claims: [], note: `no model in the ladder answered (${failures.join(", ")})` };
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

export async function claimsReport(chainKey: number, agentId: bigint, opts: { maxReviews?: number; apiKey?: string } = {}): Promise<ClaimsReport> {
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
    const { claims, model, note } = await extract(doc, opts.apiKey);
    r.model = model;
    if (note) r.note = note;
    for (const c of claims) r.claims.push(await checkClaim(prover, doc, c));
    reviews.push(r);
  }
  const all = reviews.flatMap((r) => r.claims);
  const byVerdict: Record<string, number> = {};
  for (const c of all) byVerdict[c.verdict] = (byVerdict[c.verdict] ?? 0) + 1;
  return {
    chainKey,
    agentId: agentId.toString(),
    models: MODELS,
    modelsUsed: [...new Set(reviews.map((r) => r.model).filter((m): m is string => !!m))],
    generatedAt: new Date().toISOString(),
    reviewsScanned: logs.length,
    withUri: withUri.length,
    claims: all.length,
    byVerdict,
    reviews,
  };
}
