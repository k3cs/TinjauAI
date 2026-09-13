import { useState } from "react";
import { PRESETS, THRESHOLD_COPY, presetOf, type Care } from "../lib/params";
import { Disclose } from "./ui";

/**
 * The one question the visitor answers. Behind each answer sit the thresholds the contract prices
 * on; they stay reachable under "the exact settings", because a bureau that hides the bar it judges
 * by is the thing Tinjau was built against.
 */
export default function CareLevel({ care, onChange, compact = false }: { care: Care; onChange: (c: Care) => void; compact?: boolean }) {
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
    <div className={`care${compact ? " care-compact" : ""}`}>
      <div className="care-row">
        <div className="care-ask">
          <span className="care-label">How careful do you want to be?</span>
          {!compact && <span className="small muted">Your bar, not ours. Move it and every verdict below is re-read from the contract.</span>}
        </div>
        <div className="segmented" role="radiogroup" aria-label="How careful do you want to be?">
          {PRESETS.map((option) => {
            const active = option.id === care;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={active}
                className={`segment${active ? " is-active" : ""}`}
                onClick={() => onChange(option.id)}
              >
                {option.name}
              </button>
            );
          })}
        </div>
      </div>

      <p className="small muted care-meaning">
        {preset.meaning} A record with holes is a gate, not a price: no setting opens it, and no setting takes a clean
        record below 1%.
      </p>

      {!compact && (
        <>
          <Disclose
            open={open}
            onToggle={() => setOpen(!open)}
            closed="See the exact settings this sends to the contract"
            opened="Hide the exact settings"
          />
          {open && (
            <dl className="thresholds expand">
              {rows.map(([key, value]) => (
                <div className="threshold" key={key}>
                  <dt>
                    <span className="threshold-name">{THRESHOLD_COPY[key].name}</span>
                    <span className="mono threshold-key">{key}</span>
                  </dt>
                  <dd>
                    <span className="mono threshold-value">{value}</span>
                    <span className="small muted">{THRESHOLD_COPY[key].plain}</span>
                  </dd>
                </div>
              ))}
            </dl>
          )}
          <p className="small muted care-note">
            Two things your choice cannot do. It cannot let through an agent whose review record has holes: that is a
            gate, not a price. And it cannot push a fee below 1%, so a clean record already sits at the floor.
          </p>
        </>
      )}
    </div>
  );
}
