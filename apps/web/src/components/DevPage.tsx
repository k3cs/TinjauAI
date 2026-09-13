import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { CC3_TESTNET, DEPLOYMENT } from "../lib/chain";
import { href } from "../lib/router";

const REPO = "https://github.com/k3cs/TinjauAI";

/**
 * For the reader who wants to call Tinjau rather than browse it. An agent asks the MCP server, a
 * program reads the contracts directly, a service calls the read API. Every snippet here runs against
 * the deployment this site is reading; nothing is pseudocode.
 */
export default function DevPage() {
  return (
    <main className="page">
      <div className="shell">
        <div className="page-head">
          <div>
            <h1 className="page-title">Use Tinjau from your own code</h1>
            <p className="lede">
              This site is one consumer of the bureau, not the bureau. An agent can ask it before hiring; a marketplace
              can gate a payout on it; anyone can read the contracts directly.
            </p>
          </div>
        </div>

        <section className="dev-block">
          <h2 className="section-title">1 · As an MCP server, for an AI agent</h2>
          <p className="muted measure">
            MCP is how an AI assistant picks up tools. Point yours at Tinjau and it gains three.
          </p>

          <div className="tools">
            {TOOLS.map((t) => (
              <div className="tool" key={t.name}>
                <code className="tool-name">{t.name}</code>
                <p className="small muted">{t.what}</p>
                <p className="small mono faint">{t.args}</p>
              </div>
            ))}
          </div>

          <h3 className="dev-sub">Run it over stdio</h3>
          <Snippet
            code={`git clone ${REPO} && cd TinjauAI
pnpm install
cd apps/mcp-server && pnpm stdio`}
          />

          <h3 className="dev-sub">Register it with a client</h3>
          <p className="small muted measure">Any MCP client takes the same shape. Add it, restart.</p>
          <Snippet
            code={`{
  "mcpServers": {
    "tinjau": {
      "command": "pnpm",
      "args": ["--dir", "/path/to/TinjauAI/apps/mcp-server", "stdio"],
      "env": { "CC3_RPC": "${CC3_TESTNET.rpc}" }
    }
  }
}`}
          />

          <h3 className="dev-sub">What the agent then does</h3>
          <p className="small muted measure">
            A house rule worth giving it: before paying any ERC-8004 agent, call <code>tinjau_facts</code> and refuse
            when the record has holes. The escrow enforces that on-chain anyway; the tool call saves the gas.
          </p>
        </section>

        <section className="dev-block">
          <h2 className="section-title">2 · Straight from the contracts</h2>
          <p className="muted measure">
            No SDK. Three verified contracts; any EVM client reads them, any contract consumes them through{" "}
            <code>IAgentFacts</code>.
          </p>
          <dl className="dev-addresses">
            {[
              ["GroundedFacts", "facts(chainKey, agentId, minAge, minDepth)", DEPLOYMENT.facts],
              ["AgentHireEscrow", "quote(chainKey, agentId, params)", DEPLOYMENT.escrow],
              ["CoverageBounty", "fund(...) · proveAndClaim(id, proofs)", DEPLOYMENT.bounty],
            ].map(([name, fn, addr]) => (
              <div className="dev-address" key={addr}>
                <dt>
                  <span className="mono">{name}</span>
                  <a href={`${CC3_TESTNET.explorer}/address/${addr}`} target="_blank" rel="noreferrer noopener" className="mono small">
                    {addr.slice(0, 8)}…{addr.slice(-6)}
                    <ExternalLink size={12} strokeWidth={2} aria-hidden="true" />
                  </a>
                </dt>
                <dd className="small mono faint">{fn}</dd>
              </div>
            ))}
          </dl>
          <Snippet
            code={`# facts for agent 22771 under the Normal thresholds
cast call ${DEPLOYMENT.facts} \\
  'facts(uint64,uint256,uint64,uint32)' 3 22771 500000 2 \\
  --rpc-url ${CC3_TESTNET.rpc}`}
          />
          <p className="small muted measure">
            In Solidity: import <code>IAgentFacts</code>, call <code>facts(...)</code>, gate your payout on{" "}
            <code>gapCount == 0</code> and whatever else you need. That is all <code>AgentHireEscrow</code> does; it has
            no privileges you lack.
          </p>
        </section>

        <section className="dev-block">
          <h2 className="section-title">3 · As a read API</h2>
          <p className="muted measure">
            A small Hono service for anything that would rather speak HTTP than RPC, plus the claim reader.
          </p>
          <Snippet
            code={`cd apps/server && pnpm dev           # :8787

GET /facts/3/22771?minAge=500000&minDepth=2
GET /quote/3/22771
GET /agents/3/22771/reviewers
GET /claims/3/50283                   # LLM reads claims, the prover decides
GET /scout/log`}
          />
        </section>

        <section className="dev-block">
          <h2 className="section-title">Run a scout</h2>
          <p className="muted measure">
            Anyone can carry proofs and be paid for the ones that change a decision. The scout in the repository is a
            reference, not a requirement.
          </p>
          <Snippet
            code={`cd services/scout
pnpm scout scout --agents=22771,50283 --maxTargets=2   # dry run, no key
pnpm scout verify 22771 50283 21548                    # replay from chain data
PRIVATE_KEY=0x… pnpm scout scout --live                # submit for real`}
          />
          <p className="small muted measure">
            A claim pays only when the proofs in that call flip the decision. Evidence against an agent pays the same as
            evidence for it.
          </p>
          <div className="dev-links">
            <a className="btn btn-primary btn-sm" href={REPO} target="_blank" rel="noreferrer noopener">
              Repository and README
              <ExternalLink size={13} strokeWidth={2} aria-hidden="true" />
            </a>
            <a className="btn btn-secondary btn-sm" href={href.how}>
              How the whole thing works
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}

const TOOLS = [
  {
    name: "tinjau_facts",
    what: "Verified reviewers, holes, reviewers who own agents, look-alikes, attestors, freshness.",
    args: "chainKey, agentId, minAge, minDepth",
  },
  {
    name: "tinjau_quote",
    what: "What the hire costs under your thresholds, and whether the escrow would refuse it.",
    args: "chainKey, agentId, minAge, minDepth, k, c",
  },
  {
    name: "tinjau_verify",
    what: "Replays every admitted proof from chain data and compares with the contract, so an agent can check the bureau instead of trusting it.",
    args: "agentId",
  },
];

function Snippet({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="snippet">
      <button
        type="button"
        className="snippet-copy btn btn-secondary btn-sm"
        onClick={() => {
          void navigator.clipboard?.writeText(code);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        }}
      >
        {copied ? <Check size={13} strokeWidth={2.5} aria-hidden="true" /> : <Copy size={13} strokeWidth={2} aria-hidden="true" />}
        {copied ? "Copied" : "Copy"}
      </button>
      <pre className="code">
        <code>{code}</code>
      </pre>
    </div>
  );
}
