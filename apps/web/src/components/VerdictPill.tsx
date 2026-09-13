import { Lock, ShieldCheck, TriangleAlert } from "lucide-react";

export type VerdictState = "clear" | "weak" | "held";

const META: Record<VerdictState, { label: string; Icon: typeof Lock; cssVar: string }> = {
  clear: { label: "Passes your settings", Icon: ShieldCheck, cssVar: "var(--state-clear)" },
  weak: { label: "Passes, with weak spots", Icon: TriangleAlert, cssVar: "var(--state-weak)" },
  held: { label: "Held", Icon: Lock, cssVar: "var(--state-held)" },
};

/**
 * The verdict, colour-blind safe by construction: icon and label carry it, colour only reinforces.
 * "Held" is the contract's own refusal (Gated / Truncated / ThinQuorum / Stale), never our opinion.
 */
export default function VerdictPill({ state, size = "md" }: { state: VerdictState; size?: "sm" | "md" }) {
  const { label, Icon, cssVar } = META[state];
  return (
    <span
      className={`pill-state pill-state-${size}`}
      style={{
        color: cssVar,
        backgroundColor: `color-mix(in oklch, ${cssVar} 13%, transparent)`,
        borderColor: `color-mix(in oklch, ${cssVar} 32%, transparent)`,
      }}
    >
      <Icon size={size === "sm" ? 12 : 14} strokeWidth={2.25} aria-hidden="true" />
      {label}
    </span>
  );
}

export function verdictState(hireable: boolean, weakSpots: number): VerdictState {
  if (!hireable) return "held";
  return weakSpots > 0 ? "weak" : "clear";
}
