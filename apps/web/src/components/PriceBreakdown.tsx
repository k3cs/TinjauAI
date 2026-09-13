import type { HireParams, Quote } from "@tinjau/core/contracts";

/**
 * The fee, taken apart. Nothing here is a constant: the escrow computes coverage from verified
 * reviewers against your k, a clone factor from look-alikes against your c, multiplies them into a
 * risk, and walks the premium from the floor to the ceiling by that risk. Showing the arithmetic is
 * the point, because a number nobody can reproduce is the thing this product exists against.
 */
export default function PriceBreakdown({ quote, params }: { quote: Quote; params: HireParams }) {
  const f = quote.facts;
  const coverage = Math.min(10_000, (Number(f.breadthGrounded) * 10_000) / Number(params.k));
  const cloneFactor =
    Number(params.c) === 0
      ? f.cloneDensityLB === 0n
        ? 10_000
        : 0
      : (Number(params.c) * 10_000) / (Number(params.c) + Number(f.cloneDensityLB));
  const pct = (bps: number) => `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 2)}%`;

  return (
    <div className="breakdown">
      <h4 className="breakdown-title">How this fee was computed</h4>
      <dl className="breakdown-rows">
        <Row
          label="Coverage"
          value={pct(coverage)}
          detail={`${f.breadthGrounded} verified reviewer${f.breadthGrounded === 1n ? "" : "s"} against the ${params.k} you asked for`}
        />
        <Row
          label="Look-alike factor"
          value={pct(cloneFactor)}
          detail={
            f.cloneDensityLB === 0n
              ? "no other agent shares this one's owner or registration"
              : `${f.cloneDensityLB} look-alike${f.cloneDensityLB === 1n ? "" : "s"} against your tolerance of ${params.c}`
          }
        />
        <Row label="Risk" value={pct(Number(quote.riskBps))} detail="100% minus coverage times the look-alike factor" />
        <Row
          label="Premium"
          value={pct(Number(quote.premiumBps))}
          detail={`${pct(params.baseBps)} floor plus ${pct(params.maxBps - params.baseBps)} of range, times the risk`}
          strong
        />
      </dl>
      <p className="small mono faint breakdown-formula">
        risk = 10000 − coverage · cloneFactor / 10000 · · · premium = base + (max − base) · risk / 10000
      </p>
    </div>
  );
}

function Row({ label, value, detail, strong }: { label: string; value: string; detail: string; strong?: boolean }) {
  return (
    <div className={`breakdown-row${strong ? " is-strong" : ""}`}>
      <dt>
        <span className="breakdown-label">{label}</span>
        <span className="small muted">{detail}</span>
      </dt>
      <dd className="mono num">{value}</dd>
    </div>
  );
}
