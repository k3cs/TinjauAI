import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { formatEther } from "ethers";
import { ArrowRight, Check, Columns3, ExternalLink, Lightbulb, Loader2, Search, X } from "lucide-react";
import CareLevel from "./CareLevel";
import VerdictPill from "./VerdictPill";
import AgentDetail from "./AgentDetail";
import PriceBreakdown from "./PriceBreakdown";
import HirePanel from "./HirePanel";
import BountyPanel from "./BountyPanel";
import WalletBar from "./WalletBar";
import BountyBoard from "./BountyBoard";
import { Disclose, Skeleton, State } from "./ui";
import { NoMatchMark, OfflineMark } from "./illustrations/StateMarks";
import { presetOf, type Care } from "../lib/params";
import { shortAddress } from "../lib/plain";
import { ethDate } from "../lib/evidence";
import { verdictOf } from "../lib/verdict";
import { href, navigate, type MarketTab } from "../lib/router";
import { imageUrl, type AgentCard } from "../lib/agentCard";
import { useAgentCards } from "../lib/useAgentCards";
import { useOpenBounties } from "../lib/useOpenBounties";
import type { AgentView, BureauState } from "../lib/useBureau";

type Filter = "all" | "clear" | "held";
type Sort = "proven" | "fee" | "newest";

const SORTS: { id: Sort; label: string }[] = [
  { id: "proven", label: "Most proven" },
  { id: "fee", label: "Lowest fee" },
  { id: "newest", label: "Newest" },
];

/**
 * The marketplace. Two things sit side by side in every listing and are never mixed: what the agent
 * says it does, taken from its own ERC-8004 registration, and what Tinjau could prove about it. The
 * first is how you shop; the second is why you would pay.
 */
export default function AgentsPage({
  care,
  onCare,
  bureau,
  onRefresh,
  tab,
}: {
  care: Care;
  onCare: (c: Care) => void;
  bureau: BureauState;
  onRefresh: () => void;
  /** Which half of the marketplace is on screen. Both halves keep their own address. */
  tab: MarketTab;
}) {
  const [picked, setPicked] = useState<bigint[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("proven");
  const params = presetOf(care).params;

  const [boardKey, setBoardKey] = useState(0);
  const ids = useMemo(() => bureau.agents.map((a) => a.agentId), [bureau.agents]);
  const cards = useAgentCards(ids);
  // Read here, not inside the board: the tab has to say how many bounties are open before anyone
  // opens it, and the two must never disagree about the count.
  const bounties = useOpenBounties(boardKey);

  // Up to four fit side by side before the columns stop being readable.
  const MAX_PICK = 4;
  function togglePick(id: bigint) {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= MAX_PICK ? [...p.slice(1), id] : [...p, id]));
  }

  const listed = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = bureau.agents.filter((a) => {
      const card = cards.get(a.agentId.toString());
      const v = verdictOf(a, params);
      if (filter === "clear" && (!v || !v.hireable)) return false;
      if (filter === "held" && (!v || v.hireable)) return false;
      if (!q) return true;
      const hay = [a.agentId.toString(), card?.name, card?.description, ...(card?.tags ?? []), ...(card?.skills ?? [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
    return [...rows].sort((a, b) => {
      if (sort === "fee") {
        const fa = a.quote ? Number(a.quote.premiumBps) : Number.MAX_SAFE_INTEGER;
        const fb = b.quote ? Number(b.quote.premiumBps) : Number.MAX_SAFE_INTEGER;
        return fa - fb;
      }
      if (sort === "newest") return Number(b.identity?.registeredAtEthBlock ?? 0n) - Number(a.identity?.registeredAtEthBlock ?? 0n);
      return b.reviews - a.reviews;
    });
  }, [bureau.agents, cards, params, query, filter, sort]);

  return (
    <main className="page">
      <div className="shell">
        <div className="page-head">
          <div>
            <h1 className="page-title">Marketplace</h1>
            <p className="lede">
              What an agent says it does is its own word. What it costs, and whether it can be hired at all, is the
              contract's. <a href={href.how}>How it works</a>.
            </p>
          </div>
        </div>

        <aside className="callout callout-tight">
          <span className="callout-mark" aria-hidden="true">
            <Lightbulb size={16} strokeWidth={2} />
          </span>
          <p>
            <strong>This page is one use of Tinjau, not the product.</strong> The bureau is a Creditcoin contract that
            admits facts about ERC-8004 agents only through Attestcoin proofs. Any marketplace can read it.{" "}
            <a href={href.dev}>Build on it</a> · <a href={href.how}>How it works</a>
          </p>
        </aside>

        <div className="tabs" role="tablist" aria-label="Marketplace sections">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "agents"}
            className={`tab${tab === "agents" ? " is-active" : ""}`}
            onClick={() => navigate(href.agents)}
          >
            Agents
            <span className="tab-count mono num">{bureau.agents.length || "…"}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "bounties"}
            className={`tab${tab === "bounties" ? " is-active" : ""}`}
            onClick={() => navigate(href.bounties)}
          >
            Bounties
            <span className="tab-count mono num">
              {bounties.failed ? "—" : bounties.list ? bounties.list.length : "…"}
            </span>
          </button>
          <p className="tab-note small muted">
            {tab === "agents"
              ? "What each agent claims to do, and what the contract will charge for it."
              : "Money already on the table for proof that changes an agent's answer."}
          </p>
        </div>

        <div className="market-head">
          <div className="card card-pad care-strip">
            <CareLevel care={care} onChange={onCare} compact />
          </div>
          <WalletBar />
        </div>

        {tab === "agents" && (
          <>
          <div className="market-tools">
            <label className="search">
              <Search size={15} strokeWidth={2} aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search what an agent does, or its number"
                aria-label="Search agents"
              />
            </label>

            <div className="market-filters">
              <div className="segmented" role="group" aria-label="Filter by verdict">
                {(["all", "clear", "held"] as Filter[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    aria-pressed={filter === f}
                    className={`segment${filter === f ? " is-active" : ""}`}
                    onClick={() => setFilter(f)}
                  >
                    {f === "all" ? "All" : f === "clear" ? "Hireable" : "Held"}
                  </button>
                ))}
              </div>
              <div className="segmented" role="group" aria-label="Sort agents">
                {SORTS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={sort === s.id}
                    className={`segment${sort === s.id ? " is-active" : ""}`}
                    onClick={() => setSort(s.id)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="market-count">
            <span className="small muted">
              {bureau.loading ? (
                <>
                  <Loader2 size={14} className="spin" aria-hidden="true" /> Reading the bureau from Creditcoin…
                </>
              ) : (
                <>
                  {listed.length} of {bureau.agents.length} agents
                  {bureau.net ? ` · ${bureau.net.admitted} Ethereum transactions proven · block ${bureau.net.block.toLocaleString("en-US")}` : ""}
                </>
              )}
            </span>
            <span className="small muted market-hint">
              <Columns3 size={14} strokeWidth={2} aria-hidden="true" />
              Press <strong>Compare</strong> on two to four agents to read them side by side
            </span>
          </div>

          {bureau.failed && (
            <State tone="error" mark={<OfflineMark />}>
              <p>
                <strong>Creditcoin is not answering right now.</strong>
              </p>
              <p className="small">
                No fee or verdict can be shown, and nothing on this page is filled in from memory. Reload in a moment.
              </p>
            </State>
          )}

          {(bureau.loading || (bureau.agents.length === 0 && !bureau.failed)) && (
            <ul className="market" aria-hidden="true">
              {Array.from({ length: 6 }, (_, i) => (
                <ListingSkeleton key={i} />
              ))}
            </ul>
          )}

          {!bureau.loading && !bureau.failed && bureau.agents.length > 0 && listed.length === 0 && (
            <State mark={<NoMatchMark />}>
              <p>No agent matches that.</p>
              <p className="small">
                {query ? (
                  <>
                    Nothing in the bureau mentions “{query}”.{" "}
                    <button type="button" className="linklike" onClick={() => setQuery("")}>
                      Clear the search
                    </button>{" "}
                    to see all {bureau.agents.length}.
                  </>
                ) : (
                  <>
                    The filter is narrower than the bureau.{" "}
                    <button type="button" className="linklike" onClick={() => setFilter("all")}>
                      Show all {bureau.agents.length} agents
                    </button>
                    .
                  </>
                )}
              </p>
            </State>
          )}

          <ul className="market">
            {listed.map((a, i) => (
              <Listing
                key={a.agentId.toString()}
                index={i}
                agent={a}
                card={cards.get(a.agentId.toString())}
                care={care}
                tip={bureau.net?.attestedTip}
                picked={picked.includes(a.agentId)}
                onPick={() => togglePick(a.agentId)}
                onRefresh={onRefresh}
              />
            ))}
          </ul>

          <p className="small muted table-foot">
            Descriptions and links are the agent's own words, checked by nobody. Verdicts and fees are the contract's.
          </p>
          </>
        )}

        {tab === "agents" && picked.length > 0 && (
          <>
            {/* The tray is fixed to the bottom of the window, so the page owes it the room it takes. */}
            <div className="tray-spacer" aria-hidden="true" />
            <CompareTray picked={picked} cards={cards} onDrop={togglePick} onClear={() => setPicked([])} max={MAX_PICK} />
          </>
        )}

        {tab === "bounties" && (
          <BountyBoard
            bounties={bounties.list}
            failed={bounties.failed}
            total={bounties.total}
            onClaimed={() => {
              setBoardKey((k) => k + 1);
              onRefresh();
            }}
          />
        )}
      </div>
    </main>
  );
}

/**
 * The picked agents, held in view at the bottom of the window until the visitor does something with
 * them. Comparison used to be a navbar link that landed on an empty table, which taught nobody what
 * it was for; here it can only appear once there is something to compare, it says how many more it
 * will take, and the way out of it is next to the way into it.
 *
 * Rendered into the body rather than in place: the route wrapper carries an entrance animation, and
 * an ancestor with a transform makes `position: fixed` resolve against that ancestor instead of the
 * window, which parks the tray at the foot of the document where nobody sees it.
 */
function CompareTray({
  picked,
  cards,
  onDrop,
  onClear,
  max,
}: {
  picked: bigint[];
  cards: Map<string, AgentCard>;
  onDrop: (id: bigint) => void;
  onClear: () => void;
  max: number;
}) {
  const ready = picked.length >= 2;

  return createPortal(
    <div className="tray" role="region" aria-label="Agents picked for comparison">
      <div className="shell tray-inner">
        <ul className="tray-picks">
          {picked.map((id) => {
            const card = cards.get(id.toString());
            return (
              <li className="tray-chip" key={id.toString()}>
                <span className="tray-name">{card?.name ?? `#${id.toString()}`}</span>
                <button type="button" className="tray-drop" onClick={() => onDrop(id)} aria-label={`Remove ${card?.name ?? `agent ${id}`} from the comparison`}>
                  <X size={13} strokeWidth={2.5} aria-hidden="true" />
                </button>
              </li>
            );
          })}
          {Array.from({ length: max - picked.length }, (_, i) => (
            <li className="tray-slot" key={`slot-${i}`} aria-hidden="true" />
          ))}
        </ul>

        <div className="tray-actions">
          <span className="small muted tray-status">
            {ready ? `${picked.length} picked` : `Pick one more to compare`}
          </span>
          <button type="button" className="linklike small" onClick={onClear}>
            Clear
          </button>
          <a
            className={`btn btn-primary btn-sm${ready ? "" : " is-disabled"}`}
            href={ready ? href.compare(picked) : undefined}
            aria-disabled={!ready}
          >
            Compare
            <ArrowRight size={14} strokeWidth={2.25} aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * A listing before the chain has answered, in the real listing's shape. Six of these hold the grid
 * open at the height the data will take, so the first quote landing does not shove the page down.
 */
function ListingSkeleton() {
  return (
    <li className="listing listing-skel">
      <div className="listing-main">
        <Skeleton w="5.5rem" h="5.5rem" radius="12px" />
        <div className="listing-info">
          <Skeleton className="skel-title" />
          <Skeleton w="100%" />
          <Skeleton w="72%" />
          <Skeleton w="46%" h="0.625rem" />
          <div className="skel-foot">
            <span className="skel-chips">
              <Skeleton w="3.5rem" h="1.125rem" />
              <Skeleton w="2.75rem" h="1.125rem" />
            </span>
            <Skeleton w="3.25rem" h="1.375rem" />
          </div>
        </div>
      </div>
      <div className="listing-actions">
        <Skeleton w="4rem" h="1.75rem" radius="10px" />
        <Skeleton w="4.5rem" h="1.75rem" radius="10px" />
      </div>
    </li>
  );
}

function Listing({
  index,
  agent,
  card,
  care,
  tip,
  picked,
  onPick,
  onRefresh,
}: {
  index: number;
  agent: AgentView;
  card?: AgentCard;
  care: Care;
  tip?: bigint;
  picked: boolean;
  onPick: () => void;
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<"none" | "hire" | "bounty">("none");
  const params = presetOf(care).params;
  const v = verdictOf(agent, params);
  const registered = agent.identity ? ethDate(agent.identity.registeredAtEthBlock, tip) : undefined;
  const openBounty = agent.bounties.reduce((s, b) => s + b.amount, 0n);
  const chips = [...(card?.tags ?? []), ...(card?.skills ?? [])].slice(0, 4);

  return (
    <li className={`listing${open ? " is-open" : ""}`} style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}>
      <div className="listing-main">
        <Avatar card={card} agentId={agent.agentId} />

        <div className="listing-info">
          <div className="listing-title">
            <h2 className="listing-name">{card?.name ?? `Agent #${agent.agentId.toString()}`}</h2>
            {v ? <VerdictPill state={v.state} size="sm" /> : <span className="small muted">Reading…</span>}
          </div>

          {card?.description ? (
            <p className="small listing-desc">{card.description}</p>
          ) : (
            <p className="small muted listing-desc">{card?.unavailable ?? "Reading its registration from Ethereum…"}</p>
          )}

          <p className="small faint listing-stats">
            <span className="mono">#{agent.agentId.toString()}</span>
            <span aria-hidden="true">·</span>
            <span>{agent.reviews > 0 ? `${agent.reviews} proven ${agent.reviews === 1 ? "review" : "reviews"}` : "no proven reviews"}</span>
            {registered && (
              <>
                <span aria-hidden="true">·</span>
                <span>since {registered}</span>
              </>
            )}
            {agent.identity && (
              <>
                <span aria-hidden="true">·</span>
                <span className="mono">{shortAddress(agent.identity.owner)}</span>
              </>
            )}
          </p>

          <div className="listing-foot">
            <ul className="chips">
              {chips.map((c) => (
                <li className="chip" key={c}>
                  {c}
                </li>
              ))}
              {card && (card.x402 || card.interfaces.length > 0) && (
                <li className="chip chip-quiet">{card.x402 ? "x402" : card.interfaces[0]}</li>
              )}
            </ul>
            {v && (
              <span className="listing-price">
                <span className="small faint">Fee</span>
                <span className={`mono num price-figure${v.hireable ? "" : " is-held"}`}>{v.hireable ? v.feePercent : "Held"}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {v && (
        <div className="listing-actions">
          {v.hireable ? (
            <button
              type="button"
              className={`btn btn-primary btn-sm${action === "hire" ? " is-on" : ""}`}
              onClick={() => setAction(action === "hire" ? "none" : "hire")}
            >
              {action === "hire" ? "Close" : "Hire"}
            </button>
          ) : (
            <button type="button" className="btn btn-primary btn-sm" disabled title="The contract refuses this hire until the missing proofs are found">
              Held
            </button>
          )}
          <button
            type="button"
            className={`btn btn-secondary btn-sm${action === "bounty" ? " is-on" : ""}`}
            onClick={() => setAction(action === "bounty" ? "none" : "bounty")}
          >
            {action === "bounty" ? "Close" : "Bounty"}
          </button>
          <button
            type="button"
            className={`btn btn-secondary btn-sm btn-pick${picked ? " is-picked" : ""}`}
            onClick={onPick}
            aria-pressed={picked}
          >
            {picked ? <Check size={14} strokeWidth={2.5} aria-hidden="true" /> : <Columns3 size={14} strokeWidth={2} aria-hidden="true" />}
            {picked ? "Picked" : "Compare"}
          </button>
          <Disclose open={open} onToggle={() => setOpen(!open)} closed="Why" opened="Hide" />
          {openBounty > 0n && (
            <span className="small bounty-tag">{Number(formatEther(openBounty)).toFixed(3)} tCTC open</span>
          )}
          {(card?.homepage || card?.catalog) && (
            <a className="small listing-out" href={card.catalog ?? card.homepage} target="_blank" rel="noreferrer noopener">
              {card.catalog ? "Its prices" : card.description ? "Its page" : "Its registration"}
              <ExternalLink size={12} strokeWidth={2} aria-hidden="true" />
            </a>
          )}
        </div>
      )}

      {v && action === "hire" && v.hireable && agent.quote && (
        <div className="expand">
          <HirePanel agentId={agent.agentId} premiumBps={agent.quote.premiumBps} care={care} />
        </div>
      )}
      {v && action === "bounty" && (
        <div className="expand">
          <BountyPanel agentId={agent.agentId} care={care} open={agent.bounties} onFunded={onRefresh} />
        </div>
      )}
      {v && open && (
        <div className="expand">
          {agent.quote && <PriceBreakdown quote={agent.quote} params={params} />}
          <AgentDetail agent={agent} verdict={v} params={params} tip={tip} />
        </div>
      )}
    </li>
  );
}

/** The agent's own picture when it published one, its number drawn as a monogram when it did not. */
function Avatar({ card, agentId }: { card?: AgentCard; agentId: bigint }) {
  const [failed, setFailed] = useState(false);
  const src = imageUrl(card?.image);
  // A named agent gets its initials; an unnamed one gets the tail of its registry number, which is
  // what tells 50283 apart from 50286 at a glance.
  const initials = card?.name
    ? card.name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase()
    : agentId.toString().slice(-3);

  if (src && !failed) {
    return <img className="avatar" src={src} alt="" loading="lazy" onError={() => setFailed(true)} />;
  }
  return (
    <span className="avatar avatar-fallback" aria-hidden="true">
      {initials || "AI"}
    </span>
  );
}
