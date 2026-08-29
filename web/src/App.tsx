import { useEffect, useState } from "react";
import type { AgentDemo, Facts, Quote, Thresholds } from "./lib/types";
import { attestedHeight, live, liveFacts, liveQuote, quoteLocal, FACTS_ADDR, ESCROW_ADDR, CC3_RPC } from "./lib/chain";
import { blocksToDuration, num, pct, short } from "./lib/format";

const DEFAULT_T: Thresholds = { minAge: 1_300_000, minDepth: 3, k: 3, c: 5 };
const CHAIN_KEY = 3;

type FactKey = keyof Facts;
const FACT_META: { key: FactKey; label: string; hint: string; tone: "proven" | "hurts" | "bound" }[] = [
  { key: "breadthRaw", label: "Reviewers proven", hint: "Distinct clients with at least one NewFeedback proven for this agent.", tone: "proven" },
  { key: "breadthGrounded", label: "Senior reviewers", hint: "Reviewers whose oldest proven tx predates their first feedback by ≥ minAge blocks and who show ≥ minDepth activity months. Only grows with evidence.", tone: "proven" },
  { key: "breadthIndependent", label: "Independent reviewers", hint: "Reviewers with no proven Registered/Transfer as owner of any agent, and not this agent's owner.", tone: "proven" },
  { key: "gapCount", label: "Review gaps", hint: "Pairs whose highest proven feedbackIndex exceeds the number of proven indices. The registry increments feedbackIndex per (agent, client); a gap means a review nobody submitted yet.", tone: "hurts" },
  { key: "negatives", label: "Negative reviews", hint: "Proven, non-revoked feedback with value < 0.", tone: "hurts" },
  { key: "cloneDensityLB", label: "Clone density (lower bound)", hint: "Other proven agents with the same current owner. Never overstated: only proven registrations count, so a clone farm can only look smaller, never larger, than it is.", tone: "bound" },
  { key: "sameTxSiblings", label: "Same-tx siblings", hint: "Other agents registered in the very same Ethereum transaction (batch minting).", tone: "bound" },
  { key: "uriSiblings", label: "URI siblings", hint: "Other proven agents registered with an identical agentURI.", tone: "bound" },
  { key: "registrantSiblings", label: "Registrant siblings", hint: "Other proven agents whose Registered tx was sent by the same address (robust to factory / token-bound-account patterns).", tone: "bound" },
];

function useTheme() {
  const [dark, setDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);
  useEffect(() => { document.documentElement.classList.toggle("dark", dark); }, [dark]);
  return { dark, setDark };
}

export default function App() {
  const { dark, setDark } = useTheme();
  const [demo, setDemo] = useState<Record<string, AgentDemo> | null>(null);
  const [ids, setIds] = useState<[string, string]>(["34135", "50283"]);
  const [t, setT] = useState<Thresholds>(DEFAULT_T);
  const [attested, setAttested] = useState<number | null>(null);
  const [liveData, setLiveData] = useState<Record<string, { facts: Facts; quote: Quote } | { error: string }>>({});
  const mode: "live" | "demo" = live() ? "live" : "demo";

  useEffect(() => { fetch("/demo/facts.json").then((r) => r.json()).then((d) => setDemo(d.agents)).catch(() => setDemo({})); attestedHeight(CHAIN_KEY).then(setAttested); }, []);
  useEffect(() => {
    if (mode !== "live") return;
    let cancel = false;
    (async () => {
      const out: typeof liveData = {};
      for (const id of ids) {
        try { const facts = await liveFacts(CHAIN_KEY, id, t); const quote = ESCROW_ADDR ? await liveQuote(CHAIN_KEY, id, t) : quoteLocal(facts, t); out[id] = { facts, quote }; } catch (e: any) { out[id] = { error: e.message ?? String(e) }; }
      }
      if (!cancel) setLiveData(out);
    })();
    return () => { cancel = true; };
  }, [ids, t, mode]);

  return (
    <div className="min-h-screen">
      <header className="border-b border-line">
        <div className="mx-auto max-w-6xl px-5 py-4 flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl leading-tight">Grounded Agent Reputation</h1>
            <p className="text-muted text-sm mt-1">Facts about ERC-8004 agents, admitted into Creditcoin only through Attestcoin proofs. No score: you set the thresholds.</p>
          </div>
          <div className="flex items-center gap-3 font-mono text-xs text-muted">
            <span className={`stamp ${mode === "live" ? "border-proven text-proven" : "border-bound text-bound"}`}>{mode === "live" ? `LIVE · ${short(FACTS_ADDR, 4)}` : "DEMO · from proofs"}</span>
            <span>attested mainnet height {attested ? num(attested) : "…"}</span>
            <button onClick={() => setDark(!dark)} className="rounded border border-line px-2 py-1 hover:bg-card" aria-label="Toggle theme">{dark ? "light" : "dark"}</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-16">
        <ThresholdBar t={t} onChange={setT} ids={ids} onIds={setIds} />
        <section className="grid gap-6 md:grid-cols-2 mt-6">
          {ids.map((id, i) => {
            const d = demo?.[id]; const l = liveData[id];
            const facts = mode === "live" ? (l && "facts" in l ? l.facts : null) : d ? recomputeDemo(d, t) : null;
            const quote = mode === "live" ? (l && "quote" in l ? l.quote : null) : facts ? quoteLocal(facts, t) : null;
            return <AgentReceipt key={id + i} id={id} demo={d} facts={facts} quote={quote} t={t} mode={mode} error={l && "error" in l ? l.error : undefined} loading={mode === "demo" ? demo === null : !l} />;
          })}
        </section>
        {demo && ids.map((id) => demo[id] && <ScoutLog key={"log" + id} d={demo[id]} />)}
        <VerifyBlock ids={ids} t={t} />
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto max-w-6xl px-5 py-6 text-xs text-muted leading-relaxed">
          Limits, stated: Ethereum-side registries only (chainKey 3 mainnet, 1 Sepolia); the newest review nobody submitted is undetectable; clone density is a lower bound; aged wallets can be bought. Attestcoin moves trust from RPC/indexers to Creditcoin's bonded attestor set; it does not remove it. BUIDL CTC 2026 Fall.
        </div>
      </footer>
    </div>
  );
}

/** Demo mode: apply the consumer's thresholds to the exported reviewer facts (same rule as GroundedFacts.facts). */
function recomputeDemo(d: AgentDemo, t: Thresholds): Facts {
  const grounded = d.reviewers.filter((r) => Number(r.ageBlocks) >= t.minAge && r.depth >= t.minDepth && (t.minAge === 0 || Number(r.ageBlocks) > 0)).length;
  return { ...d.facts, breadthGrounded: grounded };
}

function ThresholdBar({ t, onChange, ids, onIds }: { t: Thresholds; onChange: (t: Thresholds) => void; ids: [string, string]; onIds: (i: [string, string]) => void }) {
  const F = ({ label, k, step, help }: { label: string; k: keyof Thresholds; step: number; help: string }) => (
    <label className="flex flex-col gap-1 text-xs">
      <span className="text-muted">{label} <span title={help} className="cursor-help underline decoration-dotted">?</span></span>
      <input type="number" min={0} step={step} value={t[k]} onChange={(e) => onChange({ ...t, [k]: Number(e.target.value) })} className="w-32 rounded border border-line bg-card px-2 py-1 font-mono" />
    </label>
  );
  return (
    <section className="mt-6 rounded-lg border border-line bg-card p-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="mr-4">
          <div className="text-xs text-muted mb-1">Consumer thresholds</div>
          <p className="text-sm max-w-md">The contract has no weights. These four numbers are yours; the receipt below is what the contract answers for them.</p>
        </div>
        <F label="minAge (blocks before first review)" k="minAge" step={50_000} help="Reviewer's oldest proven tx must be at least this many Ethereum blocks before its first feedback on the agent. 1,300,000 ≈ 6 months." />
        <F label="minDepth (activity months)" k="minDepth" step={1} help="Distinct ~30-day windows with a proven tx from the reviewer." />
        <F label="k (reviewers for full coverage)" k="k" step={1} help="breadthGrounded ≥ k gives full coverage in the premium formula." />
        <F label="c (clone tolerance)" k="c" step={1} help="Risk factor c / (c + cloneDensityLB)." />
        <div className="ml-auto flex gap-3">
          {ids.map((id, i) => (
            <label key={i} className="flex flex-col gap-1 text-xs"><span className="text-muted">agent {i === 0 ? "A" : "B"}</span>
              <input value={id} onChange={(e) => onIds(i === 0 ? [e.target.value, ids[1]] : [ids[0], e.target.value])} className="w-24 rounded border border-line bg-card px-2 py-1 font-mono" /></label>
          ))}
        </div>
      </div>
    </section>
  );
}

function AgentReceipt({ id, demo, facts, quote, t, mode, error, loading }: { id: string; demo?: AgentDemo; facts: Facts | null; quote: Quote | null; t: Thresholds; mode: "live" | "demo"; error?: string; loading: boolean }) {
  const [open, setOpen] = useState<FactKey | null>(null);
  const proofsFor = (k: FactKey) => (demo?.proofs ?? []).filter((p) => ({ breadthRaw: ["feedback", "higherIndex", "negative"], breadthGrounded: ["feedback", "activity"], breadthIndependent: ["feedback", "reviewerOwnsAgent"], gapCount: ["feedback", "higherIndex"], negatives: ["negative"], cloneDensityLB: ["registered", "cloneSibling"], sameTxSiblings: ["registered"], uriSiblings: ["registered", "cloneSibling"], registrantSiblings: ["registered", "cloneSibling"], firstRegisteredHeight: ["registered"] } as Record<FactKey, string[]>)[k].includes(p.kind));
  return (
    <article className="rounded-lg border border-line bg-card animate-print">
      <header className="px-5 pt-5 pb-3 flex items-baseline justify-between">
        <div>
          <div className="text-xs text-muted font-mono">ERC-8004 · chainKey {CHAIN_KEY} · agentId</div>
          <h2 className="font-display text-4xl">{id}</h2>
        </div>
        {demo && <div className="text-right text-xs font-mono text-muted"><div>owner {short(demo.owner)}</div><div>registrant {short(demo.registrant)}</div><div>registered @{num(demo.facts.firstRegisteredHeight)}</div></div>}
      </header>
      {error && <p className="mx-5 mb-4 rounded border border-hurts/40 bg-hurts/10 p-3 text-sm">Could not read the contract: {error}. Check VITE_FACTS and the CC3 RPC.</p>}
      {loading && !error && <p className="mx-5 mb-4 text-sm text-muted">Reading…</p>}
      {facts && (
        <>
          <ul className="divide-y divide-line border-y border-line">
            {FACT_META.map((m) => {
              const v = facts[m.key] as number; const isOpen = open === m.key; const ps = proofsFor(m.key);
              return (
                <li key={m.key}>
                  <button onClick={() => setOpen(isOpen ? null : m.key)} aria-expanded={isOpen} className="w-full px-5 py-2.5 flex items-baseline justify-between gap-4 text-left hover:bg-paper/60">
                    <span className="text-sm">{m.label}<span className="ml-2 text-muted text-xs" title={m.hint}>?</span></span>
                    <span className={`font-mono text-2xl tabular-nums ${v > 0 && m.tone === "hurts" ? "text-hurts" : v > 0 && m.tone === "bound" ? "text-bound" : v > 0 ? "text-proven" : "text-muted"}`}>{num(v)}</span>
                  </button>
                  {isOpen && (
                    <div className="receipt px-5 pb-4 pt-1 font-mono text-[11px] leading-relaxed text-muted">
                      <div className="mb-1 text-ink">{m.hint}</div>
                      {ps.length === 0 ? <div>No proof in this plan touches this fact yet — the number is the conservative default.</div> : ps.map((p) => (
                        <div key={p.txHash + p.kind} className="flex flex-wrap gap-x-3"><span className={p.direction === "hurts" ? "text-hurts" : p.direction === "helps" ? "text-proven" : ""}>{p.direction}</span><span>{p.kind}</span><a className="underline" href={`https://eth.blockscout.com/tx/${p.txHash}`} target="_blank" rel="noreferrer">{short(p.txHash, 8)}</a><span>@{num(p.height)}</span><span>{p.roots} roots</span><span className="text-ink/70">{p.note}</span></div>
                      ))}
                      <div className="mt-2"><span className={`stamp ${mode === "live" ? "border-proven text-proven" : "border-bound text-bound"}`}>{mode === "live" ? "verified · BlockProver 0x…0FD2" : "demo · recomputed from proofs"}</span></div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {quote && <PremiumMeter q={quote} f={facts} t={t} />}
          {demo && <Reviewers d={demo} t={t} />}
        </>
      )}
    </article>
  );
}

function PremiumMeter({ q, f, t }: { q: Quote; f: Facts; t: Thresholds }) {
  const w = Math.max(2, Math.round(q.riskBps / 100));
  return (
    <div className="px-5 py-4">
      <div className="flex items-baseline justify-between"><span className="text-sm">Hire premium <span className="text-muted text-xs">(AgentHireEscrow.quote, 1%–20%)</span></span><span className={`font-display text-3xl ${q.gated ? "text-hurts" : ""}`}>{q.gated ? "gated" : pct(q.premiumBps)}</span></div>
      <div className="mt-2 h-2 w-full rounded bg-line/50 overflow-hidden"><div className={`h-full ${q.riskBps > 6000 ? "bg-hurts" : q.riskBps > 3000 ? "bg-bound" : "bg-proven"}`} style={{ width: `${w}%` }} /></div>
      <p className="mt-2 text-xs text-muted">risk {pct(q.riskBps)} = 1 − min(1, {f.breadthGrounded}/{t.k}) · {t.c}/({t.c}+{f.cloneDensityLB}){q.gated ? " · gated: review gaps > 0, the escrow refuses until the missing indices are proven" : " · premium is paid to the agent owner, not to a reserve"}</p>
    </div>
  );
}

function Reviewers({ d, t }: { d: AgentDemo; t: Thresholds }) {
  return (
    <div className="px-5 pb-5">
      <div className="text-xs text-muted mb-2">Reviewers (from proofs)</div>
      <table className="w-full text-xs font-mono">
        <thead className="text-muted"><tr><th className="text-left font-normal">client</th><th className="text-right font-normal">age</th><th className="text-right font-normal">months</th><th className="text-right font-normal">idx</th><th className="text-right font-normal">owns</th><th className="text-right font-normal">senior</th></tr></thead>
        <tbody>
          {d.reviewers.map((r) => { const ok = Number(r.ageBlocks) >= t.minAge && r.depth >= t.minDepth && Number(r.ageBlocks) > 0; return (
            <tr key={r.client} className="border-t border-line/60"><td className="py-1"><a className="underline" href={`https://eth.blockscout.com/address/${r.client}`} target="_blank" rel="noreferrer">{short(r.client)}</a></td><td className="text-right">{r.oldestHeight ? blocksToDuration(r.ageBlocks) : "—"}</td><td className="text-right">{r.depth}</td><td className="text-right">{r.proven}/{r.maxIndex}</td><td className={`text-right ${r.ownsAgents > 0 ? "text-hurts" : ""}`}>{r.ownsAgents}</td><td className={`text-right ${ok ? "text-proven" : "text-muted"}`}>{ok ? "yes" : "no"}</td></tr>); })}
        </tbody>
      </table>
    </div>
  );
}

function ScoutLog({ d }: { d: AgentDemo }) {
  const [showRejected, setShowRejected] = useState(false);
  return (
    <section className="mt-6 rounded-lg border border-line bg-card p-5">
      <div className="flex items-baseline justify-between"><h3 className="font-display text-xl">Scout decisions · agent {d.agentId}</h3><span className="text-xs text-muted font-mono">{d.source.plan}</span></div>
      <p className="text-sm text-muted mt-1">What the agent chose to prove under its gas budget, and what it rejected with a reason. Evidence that hurts the agent is collected as readily as evidence that helps it.</p>
      <ul className="mt-3 font-mono text-[11px] leading-relaxed">
        {d.decisions.chosen.map((c) => <li key={c.txHash + c.kind} className="flex gap-3"><span className={`w-14 ${c.direction === "hurts" ? "text-hurts" : c.direction === "helps" ? "text-proven" : "text-muted"}`}>+ {c.direction}</span><span className="w-36">{c.kind}</span><span>{short(c.txHash, 6)} @{num(c.height)} ~{num(c.estGas)} gas</span><span className="text-muted">{c.note}</span></li>)}
      </ul>
      <button onClick={() => setShowRejected(!showRejected)} className="mt-3 text-xs underline text-muted">{showRejected ? "hide" : "show"} {d.decisions.rejected.length} rejected</button>
      {showRejected && <ul className="mt-2 font-mono text-[11px] text-muted leading-relaxed">{d.decisions.rejected.map((r, i) => <li key={i}>− {r.c.direction} {r.c.kind} {short(r.c.txHash, 6)}: {r.why}</li>)}</ul>}
    </section>
  );
}

function VerifyBlock({ ids, t }: { ids: [string, string]; t: Thresholds }) {
  const facts = FACTS_ADDR || "<FACTS>";
  const cmd = `# attested mainnet height (Attestcoin)\ncurl -s https://proof-gen-api.cc3-testnet.creditcoin.network/api/v1/attested-height/3\n\n# facts for your thresholds, straight from the Creditcoin contract\ncast call --rpc-url ${CC3_RPC} ${facts} \\\n  "facts(uint64,uint256,uint64,uint32)((uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64))" 3 ${ids[0]} ${t.minAge} ${t.minDepth}\n\n# recompute the same facts off-chain from the same proofs\nnpx tsx agent/src/verify.ts agent/plans/agent-${ids[0]}-*.json`;
  return (
    <section className="mt-6 rounded-lg border border-line bg-card p-5">
      <h3 className="font-display text-xl">Verify it yourself</h3>
      <p className="text-sm text-muted mt-1">Every number above is either read from the contract or recomputed from proofs the contract would admit. Run these; expect the same values.</p>
      <pre className="mt-3 overflow-x-auto rounded bg-paper p-3 font-mono text-[11px] leading-relaxed">{cmd}</pre>
    </section>
  );
}
