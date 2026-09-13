import { useState, type CSSProperties, type ReactNode } from "react";
import { formatEther } from "ethers";
import { ChevronDown, Lock, Plus, X } from "lucide-react";
import CareLevel from "./CareLevel";
import VerdictPill from "./VerdictPill";
import HirePanel from "./HirePanel";
import BountyPanel from "./BountyPanel";
import { Skeleton, State } from "./ui";
import { OfflineMark } from "./illustrations/StateMarks";
import { presetOf, type Care } from "../lib/params";
import { asOf, feeExampleShort } from "../lib/plain";
import { verdictOf } from "../lib/verdict";
import { navigate, href } from "../lib/router";
import type { AgentView, BureauState } from "../lib/useBureau";

const MAX = 4;

/**
 * Two to four agents, one rule. Each row is a question a hirer actually asks; the "how" under it
 * names what was proven, which Attestcoin surface proved it, and why it matters.
 */
export default function ComparePage({
  ids,
  care,
  onCare,
  bureau,
  onRefresh,
}: {
  ids: string[];
  care: Care;
  onCare: (c: Care) => void;
  bureau: BureauState;
  onRefresh: () => void;
}) {
  const known = bureau.agents.map((a) => a.agentId.toString());
  const asked = ids.filter((id) => known.includes(id));
  const chosen = (asked.length >= 2 ? asked : known.slice(0, 2)).slice(0, MAX);
  const agents = chosen
    .map((id) => bureau.agents.find((a) => a.agentId.toString() === id))
    .filter((a): a is AgentView => !!a);
  const params = presetOf(care).params;
  const verdicts = agents.map((a) => verdictOf(a, params));
  const [action, setAction] = useState<{ id: string; kind: "hire" | "bounty" } | null>(null);
  const [openRow, setOpenRow] = useState<string | null>(null);

  // Before the bureau answers there are no columns to draw, but the visitor asked for a known number
  // of them. Hold that many open so the table arrives in place instead of unfolding under the cursor.
  const pending = bureau.loading && agents.length === 0 ? Math.min(Math.max(ids.length, 2), MAX) : 0;
  const cols = agents.length || pending;
  const grid = { "--compare-cols": cols } as CSSProperties;

  const replace = (at: number, id: string) => navigate(href.compare(chosen.map((c, i) => (i === at ? id : c))));
  const drop = (at: number) => chosen.length > 2 && navigate(href.compare(chosen.filter((_, i) => i !== at)));
  const add = () => {
    const next = known.find((id) => !chosen.includes(id));
    if (next) navigate(href.compare([...chosen, next]));
  };

  const rows = buildRows(agents, verdicts, bureau.net?.attestedTip);

  return (
    <main className="page">
      <div className="shell">
        <div className="page-head">
          <div>
            <h1 className="page-title">One rule, {["two", "two", "two", "three", "four"][cols] ?? "two"} agents</h1>
            <p className="lede">One setting, up to four real agents. Open a line to see what was proven, how, and why it matters.</p>
          </div>
        </div>

        <div className="card card-pad care-strip">
          <CareLevel care={care} onChange={onCare} compact />
        </div>

        {bureau.failed && (
          <State tone="error" mark={<OfflineMark />}>
            <p>
              <strong>Creditcoin is not answering right now.</strong>
            </p>
            <p className="small">Nothing can be compared, and no figure here is filled in from memory. Reload in a moment.</p>
          </State>
        )}

        {/* Three and four columns cannot be read at a 1024px desktop width, so the table keeps its own
            column width and scrolls sideways inside its frame instead of squeezing every figure. */}
        <div className="compare-scroll">
          <div className="compare" style={grid}>
            <div className="compare-head" style={grid}>
                <span className="compare-corner small muted">{bureau.loading ? "Reading the bureau…" : "Read live from Creditcoin"}</span>
              {Array.from({ length: pending }, (_, i) => (
                <div className="compare-agent" key={`pending-${i}`} aria-hidden="true">
                  <Skeleton w="6.5rem" h="2.5rem" radius="10px" />
                  <Skeleton w="8rem" h="1.375rem" radius="999px" />
                </div>
              ))}
              {agents.map((agent, i) => {
                const v = verdicts[i];
                return (
                  <div className="compare-agent" key={agent.agentId.toString()}>
                    <div className="compare-picker">
                      <span className="select-input">
                        <select value={agent.agentId.toString()} onChange={(e) => replace(i, e.target.value)} aria-label={`Agent in column ${i + 1}`}>
                          {known.map((id) => (
                            <option key={id} value={id} disabled={chosen.includes(id) && id !== agent.agentId.toString()}>
                              #{id}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={14} strokeWidth={2} aria-hidden="true" />
                      </span>
                      {cols > 2 && (
                        <button type="button" className="compare-drop" onClick={() => drop(i)} aria-label={`Remove agent ${agent.agentId} from the comparison`}>
                          <X size={14} strokeWidth={2.25} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                    {v ? <VerdictPill state={v.state} size="sm" /> : <span className="small muted">{agent.error ?? "Reading…"}</span>}
                  </div>
                );
              })}
            </div>

            <ul className="compare-rows">
              {rows.map((r) => (
                <li key={r.key} className={`compare-row${openRow === r.key ? " is-open" : ""}`} style={grid}>
                  <button type="button" className="compare-q" aria-expanded={openRow === r.key} onClick={() => setOpenRow(openRow === r.key ? null : r.key)}>
                    <span className="compare-label">
                      {r.gate && <Lock size={12} strokeWidth={2.25} className="gate-mark" aria-hidden="true" />}
                      {r.label}
                      {r.gate && <span className="small faint"> · gate</span>}
                    </span>
                    <ChevronDown size={14} strokeWidth={2} className={`disclose-caret${openRow === r.key ? " is-open" : ""}`} aria-hidden="true" />
                  </button>
                  {r.values.map((val, i) => (
                    <div className="compare-val fade-key" key={`${chosen[i]}-${care}`}>
                      {val}
                    </div>
                  ))}
                  {Array.from({ length: pending }, (_, i) => (
                    <div className="compare-val" key={`pending-${i}`} aria-hidden="true">
                      <Skeleton w="70%" />
                    </div>
                  ))}
                  {openRow === r.key && (
                    <div className="compare-how expand">
                      <p>
                        <strong>What was checked.</strong> {r.what}
                      </p>
                      <p>
                        <strong>How Attestcoin proves it.</strong> {r.how}
                      </p>
                      <p>
                        <strong>Why it matters.</strong> {r.why}
                      </p>
                    </div>
                  )}
                </li>
              ))}
            </ul>

            <div className="compare-actions" style={grid}>
              <span className="compare-corner">
                {cols < MAX && known.length > cols && (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={add}>
                    <Plus size={14} strokeWidth={2.25} aria-hidden="true" />
                    Add an agent
                  </button>
                )}
              </span>
              {agents.map((agent, i) => {
                const v = verdicts[i];
                const id = agent.agentId.toString();
                const on = (k: "hire" | "bounty") => action?.id === id && action.kind === k;
                if (!v) return <div key={id} />;
                return (
                  <div className="compare-cta" key={id}>
                    {v.hireable ? (
                      <button type="button" className={`btn btn-primary btn-sm${on("hire") ? " is-on" : ""}`} onClick={() => setAction(on("hire") ? null : { id, kind: "hire" })}>
                        {on("hire") ? "Close" : `Hire at ${v.feePercent}`}
                      </button>
                    ) : (
                      <button type="button" className="btn btn-primary btn-sm" disabled title="The contract refuses this hire until the missing proofs are found">
                        Held
                      </button>
                    )}
                    <button type="button" className={`btn btn-secondary btn-sm${on("bounty") ? " is-on" : ""}`} onClick={() => setAction(on("bounty") ? null : { id, kind: "bounty" })}>
                      {on("bounty") ? "Close" : "Bounty"}
                    </button>
                  </div>
                );
              })}
            </div>

            {action && (
              <div className="compare-panel expand">
                {(() => {
                  const idx = chosen.indexOf(action.id);
                  const agent = agents[idx];
                  const v = verdicts[idx];
                  if (!agent || !v) return null;
                  return action.kind === "hire" && v.hireable && agent.quote ? (
                    <HirePanel agentId={agent.agentId} premiumBps={agent.quote.premiumBps} care={care} />
                  ) : (
                    <BountyPanel agentId={agent.agentId} care={care} open={agent.bounties} onFunded={onRefresh} />
                  );
                })()}
              </div>
            )}
          </div>
        </div>

        <p className="small muted table-foot">
          No column is a recommendation: every one is the escrow's own answer to the thresholds above.
        </p>
      </div>
    </main>
  );
}

interface Row {
  key: string;
  label: string;
  values: ReactNode[];
  gate?: boolean;
  what: string;
  how: string;
  why: string;
}

function buildRows(agents: AgentView[], verdicts: ReturnType<typeof verdictOf>[], tip?: bigint): Row[] {
  const dash = <span className="muted">-</span>;
  const per = (fn: (a: AgentView, v: ReturnType<typeof verdictOf>) => ReactNode) => agents.map((a, i) => fn(a, verdicts[i]));
  const num = (v?: bigint | number) => (v === undefined ? dash : <span className="mono num">{v.toString()}</span>);

  return [
    {
      key: "fee",
      label: "Protection fee",
      values: per((a, v) =>
        v ? (
          <span className="fee-cell">
            <span className="mono num">{v.hireable ? v.feePercent : "Held"}</span>
            {v.hireable && a.quote && <span className="small muted">{feeExampleShort(a.quote.premiumBps)}</span>}
          </span>
        ) : (
          dash
        ),
      ),
      what: "The premium the escrow charges under your settings: 1% for a clean record, up to 20% as verified reviewers fall short or look-alikes pile up. It is paid to the agent's owner.",
      how: "The escrow computes it on Creditcoin from the bureau, which admits data only through Attestcoin proofs of Ethereum transactions. Open an agent in the marketplace to see the arithmetic.",
      why: "A fee that comes from proven facts cannot be talked down by a nicer listing. It is the price of what could not be verified.",
    },
    {
      key: "reviewers",
      label: "Reviewers we could verify",
      values: per((a) =>
        a.quote ? (
          <span className="mono num">
            {a.quote.facts.breadthGrounded.toString()} of {a.quote.facts.breadthRaw.toString()}
          </span>
        ) : (
          dash
        ),
      ),
      what: "Of everyone who reviewed the agent, how many had a real history on Ethereum before they reviewed, spread over separate stretches of time, and do not own agents themselves.",
      how: "The prover packages each reviewer's oldest transaction, some from 2022, with a Merkle proof and a continuity proof of block headers. The verifier inside the contract checks it before a byte is read.",
      why: "A wallet created yesterday cannot fake four years of history. This is the cheapest lie in the registry, and the one thing Ethereum can prove beyond dispute.",
    },
    {
      key: "gaps",
      label: "Reviews missing below a proven one",
      gate: true,
      values: per((a) => (a.quote ? num(a.quote.facts.gapCount) : dash)),
      what: "The registry numbers each reviewer's reviews. If review #97 is proven and #1 to #96 are not, the hole is visible and the hire is held.",
      how: "Every admitted receipt is decoded on Creditcoin with the official decoder; the review log carries the registry's own index, and only logs from the official registry count.",
      why: "Somebody could show you the good reviews and hold back the bad ones. Tinjau refuses to price what it cannot see, and a bounty pays whoever finds the rest.",
    },
    {
      key: "owners",
      label: "Reviewers who own agents",
      values: per((a) => (a.quote ? num(a.quote.facts.breadthGrounded - a.quote.facts.breadthIndependent) : dash)),
      what: "Reviewers who themselves run agents in the same registry: an owner reviewing inside their own market is not an outside opinion.",
      how: "Registration events are proven the same way as reviews; the contract counts, per reviewer wallet, how many agents it has been proven to own.",
      why: "In the measured registry, 16 of 105 reviewers own agents and wrote 59% of all feedback.",
    },
    {
      key: "clones",
      label: "Look-alike agents by the same owner",
      values: per((a) => (a.quote ? num(a.quote.facts.cloneDensityLB) : dash)),
      what: "Other agents proven to share this one's owner, registrant, listing or minting transaction. A lower bound: only what has been proven counts.",
      how: "Proven registration and transfer logs give owner, registrant and minting transaction; one 52 KB transaction that minted ten agents at once was admitted as a single proof.",
      why: "A crowd of look-alikes is the cheapest way to fake a track record. Tinjau reports the count; your setting decides how much it costs.",
    },
    {
      key: "negatives",
      label: "Negative reviews",
      values: per((a) => (a.quote ? num(a.quote.facts.negatives) : dash)),
      what: "Reviews with a negative value, minus any the reviewer later revoked.",
      how: "Reviews and revocations are both admitted through proofs, so a revocation is as much a fact as the review it cancels.",
      why: "Evidence that hurts an agent pays a bounty exactly as much as evidence that helps it, so nobody has a reason to hide these.",
    },
    {
      key: "attestors",
      label: "Creditcoin attestors when facts came in",
      values: per((a) => (a.quote ? num(a.quote.facts.minAttestors) : dash)),
      what: "How many bonded attestors were registered for Ethereum when each of this agent's facts was admitted. Network context, not the signers of a specific proof.",
      how: "The attestor registry is read inside the contract on every admission and the count is stored with the fact.",
      why: "Attestcoin moves trust to Creditcoin's bonded attestors; it does not remove it. Showing the number is the honest version of that claim.",
    },
    {
      key: "fresh",
      label: "Newest proven fact",
      values: per((a) => (a.quote ? <span className="small">{asOf(a.quote.facts.coveredThrough, tip)}</span> : dash)),
      what: "The Ethereum block of the newest fact proven about this agent, and how far that trails the latest block Creditcoin's attestors signed off on.",
      how: "The chain-info precompile reports the attested tip inside the contract; the distance between the two is the age of the newest proven fact.",
      why: "A record can be true and stale at once. Your Careful setting can refuse facts that lag too far behind.",
    },
    {
      key: "bounty",
      label: "Bounty open for more proof",
      values: per((a) => (
        <span className="mono num">{Number(formatEther(a.bounties.reduce((s, b) => s + b.amount, 0n))).toFixed(3)} tCTC</span>
      )),
      what: "Money waiting for any scout who brings proofs that change this agent's verdict under the funder's settings.",
      how: "The bounty contract stores the four-part decision at funding time and re-reads it after admitting new proofs in the same call. Only a change earns the reward.",
      why: "Nobody fills the bureau in by hand. Bounties are how the record gets more complete.",
    },
  ];
}
