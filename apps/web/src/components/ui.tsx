import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

/** Inline, in-place disclosure. Sentences first; hashes last. Never a modal. */
export function Disclose({
  open,
  onToggle,
  closed,
  opened,
}: {
  open: boolean;
  onToggle: () => void;
  closed: string;
  opened: string;
}) {
  return (
    <button type="button" className="disclose" aria-expanded={open} onClick={onToggle}>
      <ChevronDown size={14} strokeWidth={2} className={`disclose-caret${open ? " is-open" : ""}`} aria-hidden="true" />
      {open ? opened : closed}
    </button>
  );
}

export function Notice({ tone = "quiet", children }: { tone?: "quiet" | "error" | "live"; children: ReactNode }) {
  return <p className={`notice notice-${tone}`}>{children}</p>;
}

export function SectionTitle({ children, lede }: { children: ReactNode; lede?: ReactNode }) {
  return (
    <div className="section-head">
      <h2 className="section-title">{children}</h2>
      {lede && <p className="lede">{lede}</p>}
    </div>
  );
}

/**
 * A block standing in for content that is still being read off the chain. Skeletons exist so the page
 * has its real shape before it has its real numbers: nothing moves when the data lands, and the seven
 * seconds a log scan takes stop looking like a broken page. It sheens rather than pulses, because a
 * blinking dot reads as a decoration and this is a measurement in progress.
 */
export function Skeleton({ w, h, radius, className }: { w?: string; h?: string; radius?: string; className?: string }) {
  return <span className={`skel${className ? ` ${className}` : ""}`} style={{ width: w, height: h, borderRadius: radius }} aria-hidden="true" />;
}

/**
 * An empty or failed state, with its drawing. A page that has nothing to show still owes the reader a
 * reason and a way out, so the mark comes with a sentence and, where one exists, the next move.
 */
export function State({ mark, children, tone = "empty" }: { mark: ReactNode; children: ReactNode; tone?: "empty" | "error" }) {
  return (
    <div className={`state${tone === "error" ? " state-error" : ""}`} role={tone === "error" ? "status" : undefined}>
      {mark}
      {children}
    </div>
  );
}
