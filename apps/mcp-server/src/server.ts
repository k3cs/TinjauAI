import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DEPLOYMENT, SOURCES, Tinjau, cc3TxUrl, recomputeFromChain, type Facts } from "@tinjau/core";

const plain = (v: unknown) => JSON.parse(JSON.stringify(v, (_k, x) => (typeof x === "bigint" ? x.toString() : x)));
const text = (v: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(plain(v), null, 2) }] });

const chainKey = z.number().int().refine((k) => !!SOURCES[k], "chainKey must be 1 (Sepolia) or 3 (Ethereum mainnet)").default(3);
const agentId = z.string().regex(/^\d+$/).describe("ERC-8004 agentId");

/**
 * MCP surface of the Tinjau bureau. Agents call these tools before hiring another ERC-8004 agent.
 * Every number is read from GroundedFacts on Creditcoin CC3 testnet; `tinjau_verify` recomputes it
 * from the Attestcoin proofs instead of trusting the contract (or this server).
 */
export function createServer() {
  const server = new McpServer({ name: "tinjau", version: "3.0.0" });
  const tinjau = new Tinjau();

  server.registerTool(
    "tinjau_facts",
    {
      title: "Proven facts about an ERC-8004 agent",
      description:
        "Facts about an AI agent and its reviewers, admitted into Creditcoin only through Attestcoin proofs of Ethereum transactions. No score: you pass minAge (blocks a reviewer was active before reviewing) and minDepth (distinct ~30-day activity buckets).",
      inputSchema: { chainKey, agentId, minAge: z.number().int().nonnegative().default(500_000), minDepth: z.number().int().nonnegative().default(2) },
    },
    async ({ chainKey, agentId, minAge, minDepth }) => {
      const id = BigInt(agentId);
      const [facts, registered, owner] = await Promise.all([tinjau.readFacts(chainKey, id, BigInt(minAge), minDepth), tinjau.isRegistered(chainKey, id), tinjau.ownerOf(chainKey, id)]);
      return text({ source: { contract: DEPLOYMENT.facts, network: "Creditcoin CC3 testnet" }, chainKey, agentId, registered, owner, facts });
    },
  );

  server.registerTool(
    "tinjau_quote",
    {
      title: "Cost of credit for hiring an agent",
      description:
        "What AgentHireEscrow would charge to hire this agent under your thresholds: premium in basis points (the agent's cost of credit), risk, and whether the hire is gated (a reviewer has unproven review indices).",
      inputSchema: {
        chainKey,
        agentId,
        minAge: z.number().int().nonnegative().default(500_000),
        minDepth: z.number().int().nonnegative().default(2),
        k: z.number().int().positive().default(3).describe("grounded reviewers for full coverage"),
        c: z.number().int().nonnegative().default(5).describe("clone tolerance"),
        baseBps: z.number().int().min(0).max(10_000).default(100),
        maxBps: z.number().int().min(0).max(10_000).default(2_000),
      },
    },
    async (a) => {
      const q = await tinjau.readQuote(a.chainKey, BigInt(a.agentId), {
        minAge: BigInt(a.minAge), minDepth: a.minDepth, k: BigInt(a.k), c: BigInt(a.c), baseBps: a.baseBps, maxBps: a.maxBps, minAttestors: 0, maxStaleness: 0n,
      });
      const f: Facts = q.facts;
      const gate = f.gapCount > 0n ? `gated: ${f.gapCount} reviewer(s) with unproven review indices` : f.truncated ? "refused: facts truncated" : "hireable";
      return text({ escrow: DEPLOYMENT.escrow, agentId: a.agentId, premiumBps: q.premiumBps, costOfCreditPct: Number(q.premiumBps) / 100, riskBps: q.riskBps, gate, facts: f });
    },
  );

  server.registerTool(
    "tinjau_verify",
    {
      title: "Recompute an agent's facts from the proofs",
      description:
        "Independent check: replays every transaction the bureau admitted (fetching each Attestcoin proof again) through an off-chain copy of the contract logic and compares the result with the on-chain facts. Slow (tens of seconds).",
      inputSchema: { chainKey, agentId, minAge: z.number().int().nonnegative().default(500_000), minDepth: z.number().int().nonnegative().default(2) },
    },
    async ({ chainKey, agentId, minAge, minDepth }) => {
      const id = BigInt(agentId);
      const { model, refs } = await recomputeFromChain({ tinjau });
      const off = model.facts(chainKey, id, BigInt(minAge), minDepth);
      const on = await tinjau.readFacts(chainKey, id, BigInt(minAge), minDepth);
      const mismatches = (Object.keys(off) as (keyof Facts)[]).filter((k) => off[k] !== on[k]);
      return text({
        agentId,
        identical: mismatches.length === 0,
        mismatches,
        onChain: on,
        recomputed: off,
        admittedTxs: refs.length,
        evidence: refs.map((r) => ({ source: r.sourceTx ? SOURCES[r.chainKey].txUrl(r.sourceTx) : null, creditcoin: cc3TxUrl(r.cc3Tx), attestors: r.attestors })),
      });
    },
  );

  return server;
}
