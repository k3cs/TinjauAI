import { AlertTriangle, Check, Minus } from "lucide-react";
import type { HireParams } from "@tinjau/core/contracts";
import type { Reason, Verdict } from "../lib/plain";
import type { AgentView } from "../lib/useBureau";
import Evidence from "./Evidence";
import Reviewers from "./Reviewers";
import { useReviewers } from "../lib/useReviewers";

/** The second layer under a row: sentences, then reviewers, then the evidence pairs, then the contract's words. */
export default function AgentDetail({ agent, verdict, params, tip }: { agent: AgentView; verdict: Verdict; params: HireParams; tip?: bigint }) {
  const { rows, loading } = useReviewers(agent.agentId, true);
  return (
    <div className="detail">
      <ul className="reasons">
        {verdict.reasons.map((r) => (
          <ReasonItem key={r.text} reason={r} />
        ))}
      </ul>

      {verdict.block && (
        <div className="held-box">
          <p className="held-title">{verdict.block.title}</p>
          <p className="small">{verdict.block.explanation}</p>
          <p className="small mono muted">{verdict.block.technical}</p>
        </div>
      )}

      {loading ? <p className="small muted">Reading the reviewers from Creditcoin…</p> : <Reviewers rows={rows} params={params} />}
      <Evidence agentId={agent.agentId} tip={tip} />

      <p className="small muted detail-foot">
        Every figure above is the contract's own answer, read from Creditcoin when this page loaded. The fee comes from{" "}
        <span className="mono">AgentHireEscrow.quote</span>; Tinjau publishes no rating of its own.
      </p>
    </div>
  );
}

const ICON = { good: Check, bad: AlertTriangle, plain: Minus } as const;

function ReasonItem({ reason }: { reason: Reason }) {
  const Icon = ICON[reason.tone];
  return (
    <li className={`reason reason-${reason.tone}`}>
      <span className="reason-icon" aria-hidden="true">
        <Icon size={14} strokeWidth={2.25} />
      </span>
      <div className="reason-body">
        <p className="reason-text">{reason.text}</p>
        {reason.because && <p className="small muted">{reason.because}</p>}
        <p className="small mono faint">{reason.technical}</p>
      </div>
    </li>
  );
}
