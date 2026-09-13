/**
 * What the fee is made of, drawn instead of explained twice: it starts at the ceiling and walks down
 * to the floor as verified reviewers arrive, and look-alike agents push it back up. The two ends are
 * fixed by the contract, so the drawing can be exact rather than illustrative.
 */
export default function FeeLadder({ className }: { className?: string }) {
  const steps = [
    { reviewers: 0, fee: 20 },
    { reviewers: 1, fee: 13.7 },
    { reviewers: 2, fee: 7.3 },
    { reviewers: 3, fee: 1 },
  ];
  const x = (i: number) => 150 + i * 190;
  const y = (fee: number) => 150 - ((fee - 1) / 19) * 100;

  return (
    <figure className={`fig${className ? ` ${className}` : ""}`}>
      <svg viewBox="0 0 800 220" role="img" aria-labelledby="fee-title" className="fig-svg">
        <title id="fee-title">
          With no verified reviewer the fee sits at its ceiling of twenty percent. Each verified reviewer brings it down,
          and at three it reaches the floor of one percent.
        </title>

        <line x1="120" y1={y(20)} x2="760" y2={y(20)} stroke="var(--border)" strokeDasharray="4 4" />
        <line x1="120" y1={y(1)} x2="760" y2={y(1)} stroke="var(--border)" strokeDasharray="4 4" />
        <text x="10" y={y(20) + 4} className="fig-cap fig-cap-left">
          ceiling 20%
        </text>
        <text x="10" y={y(1) + 4} className="fig-cap fig-cap-left">
          floor 1%
        </text>

        <path
          d={steps.map((s, i) => `${i ? "L" : "M"}${x(i)} ${y(s.fee)}`).join(" ")}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {steps.map((s, i) => (
          <g key={s.reviewers}>
            <circle cx={x(i)} cy={y(s.fee)} r="6" fill="var(--bg)" stroke="var(--primary)" strokeWidth="2.5" />
            <text x={x(i)} y={y(s.fee) - 16} className="fig-figure fig-figure-sm">
              {s.fee}%
            </text>
            <text x={x(i)} y="192" className="fig-label">
              {s.reviewers === 0 ? "no verified reviewer" : `${s.reviewers} verified`}
            </text>
          </g>
        ))}

        <text x="400" y="214" className="fig-note fig-note-center">
          Look-alike agents by the same owner push it back up. The premium goes to the agent's owner, so a clean record
          is worth keeping.
        </text>
      </svg>
    </figure>
  );
}
