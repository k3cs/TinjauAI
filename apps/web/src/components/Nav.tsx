import { motion } from "motion/react";
import { Plus } from "lucide-react";
import Mark from "./Mark";
import { useOverDark } from "../lib/useOverDark";

const EASE = [0.16, 1, 0.3, 1] as const;

export default function Nav({ block }: { block?: number }) {
  const overDark = useOverDark();

  return (
    <motion.nav
      className={`nav${overDark ? " is-over-dark" : ""}`}
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: EASE }}
    >
      <div className="nav-side">
        <a className="brand" href="#top">
          <Mark />
          <span className="brand-text">Tinjau</span>
        </a>

        <a className="pill pill-ink" href="#agents">
          <span className="pill-dot" aria-hidden="true">
            <Plus size={12} strokeWidth={3} />
          </span>
          <span className="label">Check an agent</span>
        </a>

        <div className="pill pill-soft nav-hide-mobile">
          <span className="label">Public agent registry</span>
          <span className="pill-sep" aria-hidden="true" />
          <span className="label">Creditcoin</span>
        </div>
      </div>

      <div className="nav-side">
        <div className="pill pill-soft">
          <span className="pill-dot pill-dot-ink" aria-hidden="true">
            <Dots />
          </span>
          <span className="label num nav-hide-mobile">
            {block ? `Live · Creditcoin block ${block.toLocaleString("en-US")}` : "Connecting to Creditcoin"}
          </span>
        </div>
      </div>
    </motion.nav>
  );
}

function Dots() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      {[2.5, 9.5].map((y) =>
        [2.5, 9.5].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" fill="var(--paper)" />),
      )}
    </svg>
  );
}
