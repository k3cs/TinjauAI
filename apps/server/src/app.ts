import { Hono } from "hono";
import { cors } from "hono/cors";
import { DEPLOYMENT, SOURCES, Tinjau, type Facts, type HireParams } from "@tinjau/core";
import { claimsReport } from "./claims.js";
import { readCardDoc } from "./card.js";
import scoutSummary from "./data/scout-summary.json" with { type: "json" };

/**
 * Tinjau read API. Every number comes from the GroundedFacts contract on CC3 testnet (no database);
 * the claims route adds an LLM-read report that is explicitly not a fact.
 */
export const app = new Hono();
const tinjau = new Tinjau();

app.use("*", cors());

const json = (v: unknown) => JSON.parse(JSON.stringify(v, (_k, x) => (typeof x === "bigint" ? x.toString() : x)));
const num = (v: string | undefined, d: bigint) => (v === undefined || v === "" ? d : BigInt(v));
const key = (v: string) => {
  const k = Number(v);
  if (!SOURCES[k]) throw new HttpError(400, `unknown chainKey ${v} (1 = Sepolia, 3 = Ethereum mainnet)`);
  return k;
};

class HttpError extends Error {
  constructor(readonly status: 400 | 404, message: string) {
    super(message);
  }
}

app.onError((e, c) => c.json({ error: e.message }, e instanceof HttpError ? e.status : 500));

app.get("/", (c) =>
  c.json({
    name: "Tinjau: verified background checks for AI agents",
    contracts: DEPLOYMENT,
    routes: [
      "GET /health",
      "GET /facts/:chainKey/:agentId?minAge=500000&minDepth=2",
      "GET /quote/:chainKey/:agentId?minAge&minDepth&k&c&baseBps&maxBps&minAttestors&maxStaleness",
      "GET /agents/:chainKey/:agentId/reviewers",
      "GET /card/:agentId (the agent's own ERC-8004 registration, fetched verbatim)",
      "GET /scout/log",
      "GET /claims/:chainKey/:agentId (LLM-read report, not a fact)",
    ],
  }),
);

app.get("/health", async (c) => c.json({ ok: true, facts: DEPLOYMENT.facts, attestedTip: { 1: (await tinjau.attestedTip(1)).toString(), 3: (await tinjau.attestedTip(3)).toString() } }));

app.get("/facts/:chainKey/:agentId", async (c) => {
  const ck = key(c.req.param("chainKey"));
  const id = BigInt(c.req.param("agentId"));
  const minAge = num(c.req.query("minAge"), 500_000n);
  const minDepth = Number(c.req.query("minDepth") ?? 2);
  const [facts, registered, owner] = await Promise.all([tinjau.readFacts(ck, id, minAge, minDepth), tinjau.isRegistered(ck, id), tinjau.ownerOf(ck, id)]);
  return c.json(json({ chainKey: ck, agentId: id, thresholds: { minAge, minDepth }, registered, owner, facts }));
});

app.get("/quote/:chainKey/:agentId", async (c) => {
  const ck = key(c.req.param("chainKey"));
  const id = BigInt(c.req.param("agentId"));
  const q = c.req.query();
  const p: HireParams = {
    minAge: num(q.minAge, 500_000n),
    minDepth: Number(q.minDepth ?? 2),
    k: num(q.k, 3n),
    c: num(q.c, 5n),
    baseBps: Number(q.baseBps ?? 100),
    maxBps: Number(q.maxBps ?? 2_000),
    minAttestors: Number(q.minAttestors ?? 0),
    maxStaleness: num(q.maxStaleness, 0n),
  };
  const quote = await tinjau.readQuote(ck, id, p);
  const f: Facts = quote.facts;
  const gate = f.gapCount > 0n ? `Gated: ${f.gapCount} reviewer(s) with unproven review indices` : f.truncated ? "Truncated" : null;
  return c.json(json({ chainKey: ck, agentId: id, params: p, ...quote, costOfCreditPct: Number(quote.premiumBps) / 100, gate }));
});

app.get("/agents/:chainKey/:agentId/reviewers", async (c) => {
  const ck = key(c.req.param("chainKey"));
  const id = BigInt(c.req.param("agentId"));
  const clients = await tinjau.clientsOf(ck, id);
  const rows = await Promise.all(
    clients.slice(0, 64).map(async (client) => {
      const [pair, seniority, owns] = await Promise.all([tinjau.pairOf(ck, id, client), tinjau.seniority(ck, client), tinjau.ownsAgents(ck, client)]);
      return { client, ...pair, seniority, ownsAgents: owns };
    }),
  );
  return c.json(json({ chainKey: ck, agentId: id, reviewers: rows, total: clients.length }));
});

app.get("/card/:agentId", async (c) => {
  const doc = await readCardDoc(BigInt(c.req.param("agentId")));
  // Browsers cache this for a minute: the page asks for it only when it could not read the document
  // itself, and a registration does not change between two visitors.
  c.header("cache-control", "public, max-age=60");
  return c.json(doc);
});

app.get("/scout/log", (c) => c.json(scoutSummary));

app.get("/claims/:chainKey/:agentId", async (c) => {
  if (!process.env.GEMINI_API_KEY) throw new HttpError(400, "claims reader needs GEMINI_API_KEY on the server");
  const ck = key(c.req.param("chainKey"));
  const id = BigInt(c.req.param("agentId"));
  const report = await claimsReport(ck, id, { maxReviews: Number(c.req.query("max") ?? 8) });
  return c.json(report);
});
