/**
 * The mechanism, drawn instead of described: a transaction sitting in an Ethereum block, the proof
 * built around it, the contract checking that proof itself, and the fact that comes out. Every label
 * is a noun the rest of the page already uses; the drawing carries the verbs.
 */
export default function ProofPath({ className }: { className?: string }) {
  return (
    <figure className={`fig${className ? ` ${className}` : ""}`}>
      <svg viewBox="0 0 900 220" role="img" aria-labelledby="proofpath-title" className="fig-svg">
        <title id="proofpath-title">
          A transaction in an Ethereum block is wrapped in a proof, the Creditcoin contract verifies that proof itself,
          and only then does it store the fact.
        </title>

        <defs>
          <marker id="pp-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0 0 L10 5 L0 10 z" fill="var(--faint)" />
          </marker>
        </defs>

        {/* 1. the Ethereum block, one transaction of many */}
        <g>
          <rect x="8" y="40" width="180" height="120" rx="12" fill="var(--surface-2)" stroke="var(--border)" />
          {[0, 1, 2, 3, 4].map((i) => (
            <rect
              key={i}
              x="28"
              y={58 + i * 20}
              width={i === 2 ? 140 : 104}
              height="12"
              rx="3"
              fill={i === 2 ? "var(--primary)" : "var(--border-strong)"}
              opacity={i === 2 ? 1 : 0.55}
            />
          ))}
          <text x="98" y="182" className="fig-label">
            one transaction
          </text>
          <text x="98" y="30" className="fig-cap">
            Ethereum block
          </text>
        </g>

        <line x1="196" y1="100" x2="240" y2="100" stroke="var(--faint)" strokeWidth="1.5" markerEnd="url(#pp-arrow)" />

        {/* 2. the proof: the transaction plus the path that places it in an attested block */}
        <g>
          <rect x="248" y="40" width="180" height="120" rx="12" fill="var(--bg)" stroke="var(--border)" />
          <rect x="268" y="98" width="140" height="12" rx="3" fill="var(--primary)" />
          <g stroke="var(--border-strong)" strokeWidth="1.5" fill="none">
            <path d="M288 96 v-14 h60 v14" />
            <path d="M348 96 v-14" />
            <path d="M318 82 v-14 h50 v14" />
          </g>
          {[288, 348, 368].map((x) => (
            <circle key={x} cx={x} cy="68" r="4" fill="var(--border-strong)" />
          ))}
          <path d="M268 126 h140" stroke="var(--border-strong)" strokeWidth="1.5" strokeDasharray="4 4" />
          <text x="338" y="146" className="fig-label">
            + block headers
          </text>
          <text x="338" y="182" className="fig-label">
            proof
          </text>
          <text x="338" y="30" className="fig-cap">
            Attestcoin prover
          </text>
        </g>

        <line x1="436" y1="100" x2="480" y2="100" stroke="var(--faint)" strokeWidth="1.5" markerEnd="url(#pp-arrow)" />

        {/* 3. the contract checks the proof itself, before reading a byte of it */}
        <g>
          <rect x="488" y="40" width="180" height="120" rx="12" fill="var(--surface-2)" stroke="var(--border)" />
          <circle cx="578" cy="94" r="30" fill="none" stroke="var(--state-clear)" strokeWidth="2" />
          <path d="M564 94 l10 11 l19 -23" fill="none" stroke="var(--state-clear)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <text x="578" y="146" className="fig-label">
            verified on-chain
          </text>
          <text x="578" y="182" className="fig-label">
            no oracle, no server
          </text>
          <text x="578" y="30" className="fig-cap">
            Creditcoin contract
          </text>
        </g>

        <line x1="676" y1="100" x2="720" y2="100" stroke="var(--faint)" strokeWidth="1.5" markerEnd="url(#pp-arrow)" />

        {/* 4. what comes out: a fact a contract can price, or refuse */}
        <g>
          <rect x="728" y="40" width="164" height="120" rx="12" fill="var(--bg)" stroke="var(--border)" />
          <rect x="748" y="62" width="124" height="10" rx="3" fill="var(--ink)" opacity="0.8" />
          <rect x="748" y="82" width="96" height="10" rx="3" fill="var(--ink)" opacity="0.45" />
          <rect x="748" y="102" width="110" height="10" rx="3" fill="var(--ink)" opacity="0.45" />
          <text x="810" y="140" className="fig-figure">
            1%
          </text>
          <text x="810" y="182" className="fig-label">
            a fact, and a price
          </text>
          <text x="810" y="30" className="fig-cap">
            What you read
          </text>
        </g>
      </svg>
    </figure>
  );
}
