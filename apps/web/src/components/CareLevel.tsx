import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { PRESETS, THRESHOLD_COPY, presetOf, type Care } from "../lib/params";

/**
 * The one question the visitor answers. Behind each answer sit the eight thresholds the contract
 * prices on; they stay reachable under "the exact settings", because a bureau that hides the bar it
 * judges by is the thing Tinjau was built against.
 */
export default function CareLevel({ care, onChange }: { care: Care; onChange: (c: Care) => void }) {
  const [open, setOpen] = useState(false);
  const preset = presetOf(care);
  const p = preset.params;

  const rows: [string, string][] = [
    ["minAge", `${p.minAge.toLocaleString("en-US")} blocks (~${Math.round(Number(p.minAge) / 7200)} days)`],
    ["minDepth", String(p.minDepth)],
    ["k", String(p.k)],
    ["c", String(p.c)],
    ["minAttestors", String(p.minAttestors)],
    ["maxStaleness", p.maxStaleness === 0n ? "0 (any lag accepted)" : `${p.maxStaleness} blocks`],
  ];

  return (
    <section className="band band-tight" id="settings">
      <div className="shell">
        <h2 className="section-title">How careful do you want to be?</h2>
        <p className="lede band-lede">
          This is your decision, not ours. Tinjau holds the facts; where you draw the line decides which agents pass
          and what they cost. Move it and watch the answers below change.
        </p>

        <div className="care" role="radiogroup" aria-label="How careful do you want to be?">
          {PRESETS.map((option) => {
            const active = option.id === care;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={active}
                className={`care-option${active ? " is-active" : ""}`}
                onClick={() => onChange(option.id)}
              >
                <span className="care-name">{option.name}</span>
                <span className="small care-meaning">{option.meaning}</span>
              </button>
            );
          })}
        </div>

        <p className="small care-note">
          Two things your choice cannot do. It cannot let through an agent whose review record has holes: that is a
          gate, not a price, and no setting opens it. And it cannot push a fee below 1%, so an agent with a clean
          record already sits at the floor and a looser setting leaves it exactly there.
        </p>

        <div className="advanced">
          <button type="button" className="disclose" aria-expanded={open} onClick={() => setOpen(!open)}>
            <ChevronDown size={14} strokeWidth={2} className={`disclose-caret${open ? " is-open" : ""}`} />
            {open ? "Hide the exact settings" : "See the exact settings this sends to the contract"}
          </button>

          {open && (
            <dl className="thresholds">
              {rows.map(([key, value]) => (
                <div className="threshold" key={key}>
                  <dt>
                    <span className="threshold-name">{THRESHOLD_COPY[key].name}</span>
                    <span className="mono threshold-key">{key}</span>
                  </dt>
                  <dd>
                    <span className="num threshold-value">{value}</span>
                    <span className="small">{THRESHOLD_COPY[key].plain}</span>
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </section>
  );
}
