/** Tinjau mark: a magnifier reduced to its two strokes, a ring and a handle, in the brand accent. */
export default function Logo({ withWordmark = true }: { withWordmark?: boolean }) {
  return (
    <span className="logo">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="10.5" cy="10.5" r="6.5" stroke="var(--primary)" strokeWidth="2.4" />
        <path d="M15.5 15.5 21 21" stroke="var(--primary)" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="10.5" cy="10.5" r="2" fill="var(--primary)" />
      </svg>
      {withWordmark && <span className="logo-word">Tinjau</span>}
    </span>
  );
}
