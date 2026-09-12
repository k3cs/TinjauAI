import { ArrowRight } from "lucide-react";
import { DIR_COPY, ROLE_COPY, ethDate, evidenceFor } from "../lib/evidence";
import { shortHash } from "../lib/plain";

/**
 * The second layer. Sentences first, then the two transactions side by side: the Ethereum fact and
 * the Creditcoin proof of it. A visitor who does not care never opens this; a judge checking whether
 * the Attestcoin integration is load-bearing lands exactly here.
 */
export default function Evidence({ agentId, tip }: { agentId: bigint; tip?: bigint }) {
  const rows = evidenceFor(agentId);

  if (!rows.length) {
    return (
      <p className="small evidence-empty">
        The proofs for this agent were admitted by an unattended scout cycle, so they are not in the exported trail
        yet. They are on Creditcoin all the same: every admitted transaction is a <span className="mono">TxAdmitted</span>{" "}
        event on the bureau contract.
      </p>
    );
  }

  return (
    <div className="evidence">
      <p className="small evidence-intro">
        Each line is one fact. On the left, the Ethereum transaction it came from. On the right, the Creditcoin
        transaction that proved it and let it into the bureau. Both are public; open either one.
      </p>

      <ul className="evidence-list">
        {rows.map((e) => {
          const when = ethDate(e.height, tip);
          return (
            <li className="evidence-row" key={`${e.sourceTx}-${e.role}-${e.reason}`}>
              <div className="evidence-what">
                <span className="evidence-role">{ROLE_COPY[e.role] ?? e.role}</span>
                <span className="small">
                  {when ? `Around ${when}` : `Ethereum block ${e.height.toLocaleString("en-US")}`} ·{" "}
                  {DIR_COPY[e.dir]}
                </span>
              </div>

              <div className="evidence-pair">
                <a className="evidence-tx" href={e.sourceUrl} target="_blank" rel="noreferrer noopener">
                  <span className="label">On Ethereum</span>
                  <span className="mono">{shortHash(e.sourceTx)}</span>
                </a>

                <ArrowRight size={14} strokeWidth={2} className="evidence-arrow" aria-hidden="true" />

                <a className="evidence-tx" href={e.creditcoinUrl} target="_blank" rel="noreferrer noopener">
                  <span className="label">Proved on Creditcoin</span>
                  <span className="mono">{shortHash(e.creditcoinTx)}</span>
                </a>
              </div>

              <p className="small evidence-cost">
                {e.roots.toLocaleString("en-US")} block-header roots checked inside the contract, in a batch that
                cost {Number(e.batchGas).toLocaleString("en-US")} gas
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
