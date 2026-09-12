import type { HireParams } from "@tinjau/core/contracts";
import type { ReviewerRow } from "../lib/chain";
import { shortAddress } from "../lib/plain";
import { EXPLORER_ETH } from "../lib/chain";

const BLOCKS_PER_DAY = 7200;

function history(blocks: bigint): string {
  if (blocks === 0n) return "no history before the review";
  const days = Number(blocks) / BLOCKS_PER_DAY;
  if (days >= 730) return `${(days / 365).toFixed(1)} years before reviewing`;
  if (days >= 60) return `${Math.round(days / 30)} months before reviewing`;
  return `${Math.round(days)} days before reviewing`;
}

/**
 * Who reviewed the agent, and what we could establish about each of them. The rejected ones matter
 * most: an agent must not benefit from a reviewer we could not check, so they are listed as not
 * counted rather than quietly dropped.
 */
export default function Reviewers({ rows, params }: { rows: ReviewerRow[]; params: HireParams }) {
  if (!rows.length) return <p className="small">Nobody has reviewed this agent.</p>;

  return (
    <div className="reviewers">
      <h4 className="reviewers-title">Who reviewed this agent</h4>
      <ul className="reviewer-list">
        {rows.map((r) => {
          const counted = r.historyBlocks >= params.minAge && r.stretches >= params.minDepth && r.ownsAgents === 0n;
          return (
            <li className="reviewer" key={r.address}>
              <a
                className="mono reviewer-address"
                href={`${EXPLORER_ETH}/address/${r.address}`}
                target="_blank"
                rel="noreferrer noopener"
              >
                {shortAddress(r.address)}
              </a>

              <p className="small reviewer-facts">
                Active {history(r.historyBlocks)}, across {r.stretches} separate {r.stretches === 1 ? "stretch" : "stretches"} of time.
                {r.ownsAgents > 0n ? ` Runs ${r.ownsAgents} agents of their own.` : ""}
                {r.missingReviews > 0n
                  ? ` Review #${r.highestReview} is proven, ${r.missingReviews} earlier ones are not.`
                  : ""}
              </p>

              <p className={`reviewer-verdict small${counted ? "" : " is-out"}`}>
                {counted ? "Counted" : "Not counted"}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
