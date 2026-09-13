/**
 * Why an agent is held, drawn once so the sentence never has to be repeated: the registry numbers a
 * reviewer's reviews, somebody proved the last one, and the earlier ones were never shown. Filled
 * squares are proven, hollow ones are not.
 */
export default function ReviewGaps({ className }: { className?: string }) {
  const shown = 14;
  return (
    <figure className={`fig${className ? ` ${className}` : ""}`}>
      <svg viewBox="0 0 900 150" role="img" aria-labelledby="gaps-title" className="fig-svg">
        <title id="gaps-title">
          A reviewer wrote ninety-seven reviews. Only number ninety-seven has been proven; the ninety-six before it were
          never shown, so the hire is held.
        </title>

        {Array.from({ length: shown }, (_, i) => (
          <g key={i}>
            <rect
              x={20 + i * 44}
              y="44"
              width="30"
              height="30"
              rx="6"
              fill="none"
              stroke="var(--border-strong)"
              strokeDasharray="3 3"
            />
            <text x={35 + i * 44} y="96" className="fig-tick">
              {i + 1}
            </text>
          </g>
        ))}

        <text x={20 + shown * 44 + 18} y="66" className="fig-tick">
          …
        </text>

        <rect x={20 + (shown + 1) * 44} y="44" width="30" height="30" rx="6" fill="var(--primary)" />
        <path
          d={`M${26 + (shown + 1) * 44} 59 l6 7 l12 -14`}
          fill="none"
          stroke="var(--on-primary)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <text x={35 + (shown + 1) * 44} y="96" className="fig-tick fig-tick-on">
          97
        </text>

        <text x="20" y="26" className="fig-cap fig-cap-left">
          96 reviews never shown to the contract
        </text>
        <text x={20 + (shown + 1) * 44} y="26" className="fig-cap fig-cap-left">
          1 proven
        </text>

        <g transform={`translate(${20 + (shown + 3.2) * 44}, 44)`}>
          <rect x="0" y="0" width="140" height="30" rx="15" fill="color-mix(in oklch, var(--state-held) 13%, transparent)" stroke="color-mix(in oklch, var(--state-held) 32%, transparent)" />
          <path
            d="M18 16 v-4 a5 5 0 0 1 10 0 v4"
            fill="none"
            stroke="var(--state-held)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <rect x="16" y="15" width="14" height="10" rx="2" fill="var(--state-held)" />
          <text x="88" y="20" className="fig-held">
            Held
          </text>
        </g>

        <text x="20" y="134" className="fig-note">
          Show the good reviews, hold back the bad ones, and the numbering gives it away. Tinjau will not price what it
          cannot see; a bounty pays whoever proves the rest.
        </text>
      </svg>
    </figure>
  );
}
