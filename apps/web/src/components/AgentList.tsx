import { useState } from "react";
import { ChevronDown, Lock, Check, Minus, AlertTriangle } from "lucide-react";
import { explain, feePercent, shortAddress, type Reason } from "../lib/plain";
import { ethDate } from "../lib/evidence";
import Evidence from "./Evidence";
import Reviewers from "./Reviewers";
import HirePanel from "./HirePanel";
import { presetOf, type Care } from "../lib/params";
import type { AgentView, BureauState } from "../lib/useBureau";

export default function AgentList({ care, bureau }: { care: Care; bureau: BureauState }) {
  return (
    <section className="band" id="agents">
      <div className="shell">
        <h2 className="section-title">Agents you could hire right now</h2>
        <p className="lede band-lede">
          These are real entries in the public registry on Ethereum. Tinjau does not rename them or give them badges:
          the number is the registry's own, and everything under it was proven before it appeared here.
        </p>

        {bureau.failed && (
          <p className="notice">
            Creditcoin is not answering right now, so no fees or verdicts can be shown. Nothing on this page is
            filled in from memory. Reload in a moment.
          </p>
        )}

        <ul className="agents">
          {bureau.agents.map((a) => (
            <AgentRow key={a.agentId.toString()} agent={a} care={care} tip={bureau.net?.attestedTip} loading={bureau.loading} />
          ))}
        </ul>
      </div>
    </section>
  );
}

function AgentRow({
  agent,
  care,
  tip,
  loading,
}: {
  agent: AgentView;
  care: Care;
  tip?: bigint;
  loading: boolean;
}) {
  const [openWhy, setOpenWhy] = useState(false);
  const [hiring, setHiring] = useState(false);
  const params = presetOf(care).params;

  if (!agent.quote) {
    return (
      <li className="agent">
        <div className="agent-head">
          <h3 className="agent-id">Agent #{agent.agentId.toString()}</h3>
          <p className="small">
            {loading ? "Asking the bureau…" : (agent.error ?? "The bureau could not be read for this agent.")}
          </p>
        </div>
      </li>
    );
  }

  const holes = agent.reviewers
    .filter((r) => r.missingReviews > 0n)
    .map((r) => ({ highest: r.highestReview, missing: r.missingReviews }));
  const v = explain(agent.quote, params, holes);
  const registered = agent.identity ? ethDate(agent.identity.registeredAtEthBlock, tip) : undefined;

  return (
    <li className={`agent${v.hireable ? "" : " is-held"}`}>
      <div className="agent-head">
        <div>
          <h3 className="agent-id">Agent #{agent.agentId.toString()}</h3>
          <p className="small agent-meta">
            {registered ? `In the registry since around ${registered}` : "In the registry"}
            {agent.identity ? ` · owner ${shortAddress(agent.identity.owner)}` : ""}
          </p>
        </div>

        <p className={`stamp${v.hireable ? "" : " stamp-held"}`}>
          {v.hireable ? <Check size={15} strokeWidth={2.5} /> : <Lock size={15} strokeWidth={2.5} />}
          <span>{v.stamp}</span>
        </p>
      </div>

      <p className="agent-summary">{v.summary}</p>
      <p className="small agent-origin">{agent.origin}</p>

      {v.block && (
        <div className="held">
          <p className="held-title">{v.block.title}</p>
          <p className="held-body">{v.block.explanation}</p>
        </div>
      )}

      <div className="agent-actions">
        {v.hireable ? (
          <button type="button" className="btn btn-ink" onClick={() => setHiring(!hiring)}>
            {hiring ? "Close" : `Hire for ${v.feePercent} protection fee`}
          </button>
        ) : (
          <button type="button" className="btn btn-ink" disabled aria-describedby={`held-${agent.agentId}`}>
            Hiring is blocked
          </button>
        )}

        <button type="button" className="disclose" aria-expanded={openWhy} onClick={() => setOpenWhy(!openWhy)}>
          <ChevronDown size={14} strokeWidth={2} className={`disclose-caret${openWhy ? " is-open" : ""}`} />
          {openWhy ? "Hide the details" : "How do we know?"}
        </button>
      </div>

      {hiring && v.hireable && (
        <HirePanel agentId={agent.agentId} premiumBps={agent.quote.premiumBps} care={care} />
      )}

      {openWhy && (
        <div className="why">
          <ul className="reasons">
            {v.reasons.map((r) => (
              <ReasonItem key={r.text} reason={r} />
            ))}
          </ul>

          {v.block && (
            <p className="small reason-technical" id={`held-${agent.agentId}`}>
              {v.block.technical}
            </p>
          )}

          <Reviewers rows={agent.reviewers} params={params} />
          <Evidence agentId={agent.agentId} tip={tip} />

          <p className="small why-foot">
            Every figure above is the contract's own answer, read from Creditcoin when this page loaded. The fee comes
            from <span className="mono">AgentHireEscrow.quote</span>; Tinjau publishes no rating of its own.
          </p>
        </div>
      )}
    </li>
  );
}

const REASON_ICON = { good: Check, bad: AlertTriangle, plain: Minus } as const;

function ReasonItem({ reason }: { reason: Reason }) {
  const Icon = REASON_ICON[reason.tone];
  return (
    <li className={`reason reason-${reason.tone}`}>
      <Icon size={15} strokeWidth={2} className="reason-icon" aria-hidden="true" />
      <p className="reason-text">{reason.text}</p>
      {reason.because && <p className="small reason-because">{reason.because}</p>}
      <p className="small mono reason-technical">{reason.technical}</p>
    </li>
  );
}

export { feePercent };
