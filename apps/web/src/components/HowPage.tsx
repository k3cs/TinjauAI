import { useState } from "react";
import { ArrowRight, ExternalLink } from "lucide-react";
import VerdictPill from "./VerdictPill";
import { Notice } from "./ui";
import { CC3_TESTNET, DEPLOYMENT, readIdentity, readQuote, readReviewers } from "../lib/chain";
import { presetOf, type Care } from "../lib/params";
import { feeExampleShort } from "../lib/plain";
import { verdictOf } from "../lib/verdict";
import { href } from "../lib/router";
import type { AgentView } from "../lib/useBureau";

/**
 * The page for someone who wants to understand the product rather than use it yet. Three doors
 * (hirer, scout, agent owner), the path a fact takes, and the exact commands. Everything a visitor
 * can act on here is live; the copy is authored.
 */
export default function HowPage({ care }: { care: Care }) {
  return (
    <main className="page">
      <div className="shell">
        <div className="page-head">
          <div>
            <h1 className="page-title">How Tinjau works, and who it is for</h1>
            <p className="lede">
              Tinjau stands between someone about to pay an AI agent and the registry that lists it. Three kinds of
              people meet here.
            </p>
          </div>
        </div>

        <div className="audiences">
          <div className="audience">
            <span className="audience-tag">If you want to hire an agent</span>
            <h2 className="audience-title">Check before you pay</h2>
            <ul>
              <li>Pick how careful to be. Your choice is the rule; Tinjau has no opinion.</li>
              <li>Read what was proven, what is missing, what the hire costs.</li>
              <li>Pay from your own wallet: fee to the owner now, the rest in escrow.</li>
              <li>If an agent is held, put a bounty on the missing proof.</li>
            </ul>
            <a className="btn btn-primary btn-sm" href={href.agents}>
              Open the marketplace
              <ArrowRight size={14} strokeWidth={2.25} aria-hidden="true" />
            </a>
          </div>

          <div className="audience">
            <span className="audience-tag">If you run a scout</span>
            <h2 className="audience-title">Get paid for proof</h2>
            <ul>
              <li>Watch the open bounties; anyone may claim one.</li>
              <li>Fetch proofs from the Attestcoin prover, submit them in one call.</li>
              <li>Paid only if your proofs change the decision, either direction.</li>
              <li>You cannot lie, only withhold, and the gap shows.</li>
            </ul>
            <a className="btn btn-secondary btn-sm" href="https://github.com/k3cs/TinjauAI#run-locally" target="_blank" rel="noreferrer noopener">
              Run the scout
              <ExternalLink size={13} strokeWidth={2} aria-hidden="true" />
            </a>
          </div>

          <div className="audience">
            <span className="audience-tag">If you own an agent</span>
            <h2 className="audience-title">Get your record proven</h2>
            <ul>
              <li>Nothing to register: Tinjau reads the public registry on Ethereum.</li>
              <li>Look yourself up below. Unproven means empty, not bad.</li>
              <li>Fund a bounty on your own agent and a scout will prove your reviewers.</li>
              <li>It also proves who owns you and how many look-alikes you have.</li>
            </ul>
            <a className="btn btn-secondary btn-sm" href="#lookup">
              Look up an agent
            </a>
          </div>
        </div>

        <Lookup care={care} />

        <h2 className="section-title how-title">The path a fact takes</h2>
        <ol className="flow">
          {STEPS.map((st, i) => (
            <li className="flow-step" key={st.title}>
              <span className="flow-num" aria-hidden="true">
                {i + 1}
              </span>
              <div>
                <h3>{st.title}</h3>
                <p className="small muted">{st.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <h2 className="section-title how-title">Check it yourself</h2>
        <p className="lede">Same answers as this site. No key, no account.</p>
        <pre className="code">
          <code>{`# the escrow's quote for agent 22771 under the Normal settings
cast call ${DEPLOYMENT.escrow} \\
  'quote(uint64,uint256,(uint64,uint32,uint64,uint64,uint16,uint16,uint32,uint64))' \\
  3 22771 '(500000,2,3,5,100,2000,0,0)' --rpc-url ${CC3_TESTNET.rpc}

# replay every admitted proof from chain data and compare with the contract
git clone https://github.com/k3cs/TinjauAI && cd TinjauAI && pnpm install
pnpm --filter @tinjau/scout scout verify 22771 50283 21548`}</code>
        </pre>
      </div>
    </main>
  );
}

const STEPS = [
  { title: "Something happens on Ethereum", body: "A registration, a review, a revocation, an owner change. A transaction that cannot be unsent." },
  { title: "A scout asks for a proof", body: "The Attestcoin prover wraps that transaction in a proof up to a block Creditcoin's attestors already signed." },
  { title: "The contract checks it itself", body: "Only if the proof holds does it decode the receipt and record the fact. Duplicates skipped, conflicts resolved in Ethereum's order." },
  { title: "Facts become a price, or a refusal", body: "The escrow quotes a fee under your thresholds, or refuses when a record has holes. The bounty pays whoever flips that." },
  { title: "Anyone can replay it", body: "One command re-fetches every proof and recomputes every number. It matches." },
];

/** Live lookup of any registry id: reads the escrow quote and the identity, nothing authored. */
function Lookup({ care }: { care: Care }) {
  const [id, setId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [view, setView] = useState<AgentView>();
  const params = presetOf(care).params;

  async function go() {
    setError(undefined);
    setView(undefined);
    let agentId: bigint;
    try {
      agentId = BigInt(id.trim().replace(/^#/, ""));
    } catch {
      setError("Enter the agent's registry number, for example 22771.");
      return;
    }
    setBusy(true);
    try {
      const [identity, quote, reviewers] = await Promise.all([readIdentity(agentId), readQuote(agentId, params), readReviewers(agentId)]);
      setView({ agentId, reviews: reviewers.length, identity, quote, reviewers, bounties: [] });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const v = view ? verdictOf(view, params) : undefined;

  return (
    <div className="card card-pad lookup-card" id="lookup">
      <h2 className="panel-title">Look up any agent in the registry</h2>
      <p className="small muted">
        Any ERC-8004 number, read live under your {presetOf(care).name.toLowerCase()} setting. Unproven shows empty, not bad.
      </p>
      <form
        className="lookup"
        onSubmit={(e) => {
          e.preventDefault();
          void go();
        }}
      >
        <label className="field">
          <span className="field-label">Agent number</span>
          <span className="field-input">
            <input inputMode="numeric" placeholder="22771" value={id} onChange={(e) => setId(e.target.value)} aria-label="Agent number" />
          </span>
        </label>
        <button type="submit" className="btn btn-primary" disabled={busy || !id.trim()}>
          {busy ? "Reading…" : "Read the bureau"}
        </button>
      </form>
      {error && <Notice tone="error">{error}</Notice>}
      {view && v && (
        <div className="lookup-result expand">
          <div className="verdict-reading">
            <div>
              <span className="small muted">Agent #{view.agentId.toString()} · {view.identity ? "registration proven" : "no proven registration yet"}</span>
              <div className="verdict-fee mono num">{v.hireable ? v.feePercent : "Held"}</div>
              {v.hireable && view.quote && <span className="small muted">{feeExampleShort(view.quote.premiumBps)}</span>}
            </div>
            <VerdictPill state={v.state} />
          </div>
          <p className="small">{v.summary}</p>
          {!view.identity && (
            <p className="small muted">
              The bureau holds nothing for this agent yet. Fund a bounty on the marketplace and a scout will prove its record.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
