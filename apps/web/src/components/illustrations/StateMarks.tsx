/**
 * Marks for the three moments a page has nothing to show: nothing matched, nothing is open, and the
 * chain did not answer. Each is drawn from the same parts the interface is made of (the magnifier of
 * the Tinjau mark, a listing's rounded block, a link in a chain) so an empty state reads as a
 * deliberate state of this product rather than as a page that failed to render.
 */

/** Nothing matched the filter: the magnifier over shelves that exist but hold nothing. */
export function NoMatchMark() {
  return (
    <svg viewBox="0 0 120 84" role="img" aria-labelledby="nomatch-title" className="state-mark">
      <title id="nomatch-title">A magnifying glass over three empty shelves.</title>
      {[0, 1, 2].map((i) => (
        <rect key={i} x="14" y={20 + i * 18} width="92" height="10" rx="5" fill="var(--surface-2)" />
      ))}
      <g fill="none" stroke="var(--primary)" strokeWidth="3.2">
        <circle cx="52" cy="40" r="17" fill="var(--bg)" />
        <path d="M64.5 52.5 79 67" strokeLinecap="round" />
      </g>
      <circle cx="52" cy="40" r="4.5" fill="var(--primary)" opacity="0.35" />
    </svg>
  );
}

/** Nothing is funded yet: an open, empty purse outline waiting for a note. */
export function NoBountyMark() {
  return (
    <svg viewBox="0 0 120 84" role="img" aria-labelledby="nobounty-title" className="state-mark">
      <title id="nobounty-title">An empty pouch with its mouth open, and a dotted note above it.</title>
      <path
        d="M34 38h52l6 30a6 6 0 0 1-6 7H34a6 6 0 0 1-6-7Z"
        fill="var(--surface-2)"
        stroke="var(--border-strong)"
        strokeWidth="2"
      />
      <path d="M44 38c0-9 7-16 16-16s16 7 16 16" fill="none" stroke="var(--border-strong)" strokeWidth="2" />
      <rect x="46" y="8" width="28" height="20" rx="4" fill="var(--bg)" stroke="var(--primary)" strokeWidth="2.4" strokeDasharray="5 4" />
      <path d="M54 18h12" stroke="var(--primary)" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

/** The chain did not answer: one link of the chain left open, nothing invented to fill the gap. */
export function OfflineMark() {
  return (
    <svg viewBox="0 0 120 84" role="img" aria-labelledby="offline-title" className="state-mark">
      <title id="offline-title">Two links of a chain with the join between them broken open.</title>
      <g fill="none" stroke="var(--state-held)" strokeWidth="3.4" strokeLinecap="round">
        <path d="M50 30 41 39a12.7 12.7 0 0 0 18 18l5-5" />
        <path d="M70 54l9-9a12.7 12.7 0 0 0-18-18l-5 5" />
      </g>
      <g stroke="var(--state-held)" strokeWidth="2.6" strokeLinecap="round" opacity="0.7">
        <path d="M60 12v8M84 24l5-5M36 24l-5-5" />
      </g>
    </svg>
  );
}
