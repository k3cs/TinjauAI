import { useState, type ReactNode } from "react";
import { ArrowRight, ExternalLink } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import VerdictPill from "./VerdictPill";
import { Reveal, Count, EASE } from "./motion";
import ProofPath from "./illustrations/ProofPath";
import ReviewGaps from "./illustrations/ReviewGaps";
import FeeLadder from "./illustrations/FeeLadder";
import { Disclose } from "./ui";
import { CC3_TESTNET, DEPLOYMENT } from "../lib/chain";
import { presetOf, type Care } from "../lib/params";
import { feeExampleShort } from "../lib/plain";
import { verdictOf } from "../lib/verdict";
import { href } from "../lib/router";
import type { BureauState } from "../lib/useBureau";

const rise = (delay: number, y = 16) => ({
  initial: { y, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  transition: { duration: 0.7, delay, ease: EASE },
});

export default function Landing({ bureau, care }: { bureau: BureauState; care: Care }) {
  return (
    <main>
      <Hero bureau={bureau} care={care} />
      <Problem />
      <HowItWorks />
      <Held />
      <Price />
      <Scout />
      <Deployed net={bureau.net} />
      <Limits />
      <FinalCta />
    </main>
  );
}

/** The one orchestrated moment on the site: the hero rises in five beats, then nothing else enters. */
function Hero({ bureau, care }: { bureau: BureauState; care: Care }) {
  const reduce = useReducedMotion();
  const m = (d: number, y?: number) => (reduce ? {} : rise(d, y));
  return (
    <section className="hero">
      <div className="shell hero-grid">
        <div>
          <motion.h1 className="hero-title" {...m(0.05, 20)}>
            Check an AI agent before you pay it.
          </motion.h1>
          <motion.p className="hero-lede" {...m(0.12)}>
            19,000 agents are listed on Ethereum and hire each other already. Their reviews prove nothing. Tinjau
            proves the facts behind them into a Creditcoin contract, and lets you set the bar.
          </motion.p>
          <motion.div className="hero-actions" {...m(0.18)}>
            <a className="btn btn-primary btn-lg" href={href.agents}>
              Open the marketplace
              <ArrowRight size={16} strokeWidth={2.25} aria-hidden="true" />
            </a>
            <a className="btn btn-secondary btn-lg" href={href.compare([22771n, 50283n])}>
              Compare two
            </a>
          </motion.div>
          <motion.dl className="hero-stats" {...m(0.24)}>
            <Stat
              value={bureau.net ? bureau.net.admitted.toLocaleString("en-US") : bureau.failed ? "—" : "…"}
              label={bureau.net ? `proven Ethereum transactions · block ${bureau.net.block.toLocaleString("en-US")}` : bureau.failed ? "Creditcoin is not answering" : "reading from Creditcoin"}
            />
            <Stat value="1% – 20%" label="protection fee, from proven facts" />
            <Stat value="0" label="scores published" />
            <Stat value="2022 →" label="oldest proven Ethereum transaction" />
          </motion.dl>
        </div>

        <motion.div className="hero-card-wrap" {...m(0.14)}>
          <VerdictCard bureau={bureau} care={care} />
        </motion.div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="stat">
      <dt className="stat-value mono num">{value}</dt>
      <dd className="small">{label}</dd>
    </div>
  );
}

const DEMO: { id: bigint; label: string; caption: string }[] = [
  { id: 22771n, label: "#22771", caption: "Three reviewers with years of history" },
  { id: 21548n, label: "#21548", caption: "Proven after a scout claimed a bounty" },
  { id: 50283n, label: "#50283", caption: "One reviewer, who owns other agents" },
];

/** The product's hero reading: a real agent's verdict, fee and reasons, read from the contract. */
function VerdictCard({ bureau, care }: { bureau: BureauState; care: Care }) {
  const [i, setI] = useState(0);
  const reduce = useReducedMotion();
  const pick = DEMO[i];
  const agent = bureau.agents.find((a) => a.agentId === pick.id);
  const v = agent ? verdictOf(agent, presetOf(care).params) : undefined;
  const top = v?.reasons.slice(0, 3) ?? [];
  const key = `${pick.id}-${care}-${v ? v.feePercent : "none"}`;

  return (
    <div className="card verdict-card" aria-live="polite">
      <div className="segmented segmented-fill" role="group" aria-label="Demo agents">
        {DEMO.map((d, idx) => (
          <button key={d.label} type="button" aria-pressed={idx === i} className={`segment${idx === i ? " is-active" : ""}`} onClick={() => setI(idx)}>
            {d.label}
          </button>
        ))}
      </div>
      <p className="small muted verdict-caption">{pick.caption}</p>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={key}
          className="verdict-body"
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -6 }}
          transition={{ duration: 0.2, ease: EASE }}
        >
          <div className="verdict-reading">
            <div>
              <span className="small muted">Protection fee · {presetOf(care).name.toLowerCase()} setting</span>
              <div className="verdict-fee mono num">{v ? (v.hireable ? v.feePercent : "Held") : bureau.failed ? "—" : "…"}</div>
              {v && v.hireable && agent?.quote && <span className="small muted">{feeExampleShort(agent.quote.premiumBps)}</span>}
            </div>
            {v ? <VerdictPill state={v.state} /> : <span className="small muted">Reading…</span>}
          </div>

          <ul className="verdict-reasons">
            {top.map((r) => (
              <li key={r.text} className={`verdict-reason tone-${r.tone}`}>
                <span className="tone-dot" aria-hidden="true" />
                <span className="small">{r.text}</span>
              </li>
            ))}
            {!v && !bureau.failed && <li className="small muted">Asking the escrow contract on Creditcoin for its quote…</li>}
          </ul>
        </motion.div>
      </AnimatePresence>

      <a className="verdict-more small" href={href.agents}>
        Full record, evidence and hire
        <ArrowRight size={13} strokeWidth={2.25} aria-hidden="true" />
      </a>
    </div>
  );
}

function Problem() {
  return (
    <section className="section">
      <div className="shell">
        <div className="two-col">
          <h2 className="section-title">A registry that stores reviews is not a registry that checks them.</h2>
          <div className="prose">
            <p className="muted">
              Anyone can review an agent, and anyone can mint as many agents as they like. Read the registry as it comes
              and it misleads you.
            </p>
            <p>
              A fact counts here only once an Ethereum transaction has been proven to Creditcoin. Tinjau publishes no
              rating: you set the bar, the contract answers with what it can prove.
            </p>
            <p className="small faint">
              Measured from Ethereum, 29 August 2026. An independent study found 73.5% of reviewers showed coordinated
              fake-account behaviour (arXiv 2606.26028).
            </p>
          </div>
        </div>
        <dl className="findings">
          <Finding value={<Count value={346} suffix=" of 367" />} label="rated agents had exactly one reviewer" />
          <Finding value={<Count value={225} />} label="of the last 600 reviews came from a single wallet" />
          <Finding value={<Count value={83} suffix="%" />} label="of new registrations came from owners of ten or more agents" />
        </dl>
      </div>
    </section>
  );
}

function Finding({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="finding">
      <dt className="finding-value mono num">{value}</dt>
      <dd className="small muted">{label}</dd>
    </div>
  );
}

function HowItWorks() {
  return (
    <section className="section section-alt">
      <div className="shell">
        <h2 className="section-title measure">From an Ethereum transaction to a fee, with nobody in between.</h2>
        <ProofPath />
        <p className="small muted measure how-foot">
          Take the proof away and Tinjau is hearsay, which is what the registry already offers. It is also why we cannot
          fake a fact: we can neither add a review nobody wrote nor delete one somebody did.
        </p>
      </div>
    </section>
  );
}

function Held() {
  return (
    <section className="section">
      <div className="shell">
        <h2 className="section-title measure">Why an agent gets held, and what unblocks it.</h2>
        <ReviewGaps />
      </div>
    </section>
  );
}

function Price() {
  return (
    <section className="section section-alt">
      <div className="shell">
        <h2 className="section-title measure">The fee is what could not be verified.</h2>
        <FeeLadder />
      </div>
    </section>
  );
}

function Scout() {
  return (
    <section className="section">
      <div className="shell">
        <div className="card card-feature">
          <div>
            <h2 className="section-title">Nobody fills the bureau in by hand.</h2>
            <p className="muted measure">
              A scout is a program that carries proofs to the contract. Ours runs every three hours and takes open
              bounties first. Anyone can run their own, with any strategy.
            </p>
            <p className="measure">
              It cannot lie: the contract rejects anything that is not a real Ethereum transaction. It can only
              withhold, and the numbering above shows that.
            </p>
          </div>
          <Reveal>
            <ol className="scout-log">
              <li>
                <span className="mono faint">R1</span>
                <span>Found an open bounty on agent #21548 and took the job before anything else.</span>
              </li>
              <li>
                <span className="mono faint">R2</span>
                <span>Proved three reviewers' histories, and went looking for the highest-numbered review of anyone who reviews inside their own market.</span>
              </li>
              <li>
                <span className="mono faint">R3</span>
                <span>Seven proofs cost about 0.0017 tCTC in gas against a 0.05 tCTC bounty: worth doing. Next pass over #50283, everything already proven, 0 gas.</span>
              </li>
              <li>
                <span className="mono faint">R4</span>
                <span>Its proofs flipped the verdict, so the contract paid the bounty in the same call. It then hired #21548 at 1%.</span>
              </li>
            </ol>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Deployed({ net }: { net?: BureauState["net"] }) {
  const [open, setOpen] = useState(false);
  const contracts = [
    { name: "GroundedFacts", role: "Admits facts only through Attestcoin proofs", addr: DEPLOYMENT.facts },
    { name: "AgentHireEscrow", role: "Fee from facts · refuses holed records", addr: DEPLOYMENT.escrow },
    { name: "CoverageBounty", role: "Pays decision-changing proof, either way", addr: DEPLOYMENT.bounty },
  ];
  return (
    <section className="section section-alt">
      <div className="shell two-col">
        <div>
          <h2 className="section-title">Not a diagram. Deployed and verifiable on Creditcoin.</h2>
          <p className="muted measure">
            Three verified contracts on Creditcoin testnet, reading Ethereum mainnet through Attestcoin. Every number
            here resolves to a transaction you can open.
          </p>
          <ul className="depth">
            <li>Every proof checked inside the contract, singly or as a batch that stands or falls together.</li>
            <li>Only the official registry's events count; conflicts resolve in Ethereum's own order.</li>
            <li>Attestor count and how far Creditcoin had read Ethereum are stored with each fact.</li>
            <li>History back to March 2022; {net ? `${net.admitted} transactions` : "every transaction"} replayable by anyone.</li>
          </ul>
          <Disclose open={open} onToggle={() => setOpen(!open)} closed="What runs inside the contract" opened="Hide the mechanism" />
          {open && (
            <ul className="mechanism small muted">
              <li>
                <code>0x0FD2</code> BlockProver <code>verify</code> on every proof, single and batched (<code>record</code>, <code>recordBatch</code>), before a byte is decoded.
              </li>
              <li>
                Receipts decoded with the official <code>EvmV1Decoder</code>; logs used only when the emitter is the official ERC-8004 registry; ownership resolved by <code>(height, txIndex, logIndex)</code>.
              </li>
              <li>
                <code>0x0FD4</code> AttestorStash count and <code>0x0FD3</code> ChainInfo attested tip read in-contract and exposed as <code>minAttestors</code> and <code>coveredThrough</code>.
              </li>
              <li>
                Every admission emits <code>TxAdmitted</code>; <code>recomputeFromChain</code> replays them all and matches <code>facts()</code>.
              </li>
            </ul>
          )}
        </div>
        <Reveal>
          <div className="manifest">
            <div className="manifest-head">
              <span className="small muted">Deployment manifest</span>
              <span className="mono small faint">chainId 102031 · testnet</span>
            </div>
            <div className="manifest-list">
              {contracts.map((c) => (
                <a key={c.name} className="manifest-row" href={`${CC3_TESTNET.explorer}/address/${c.addr}`} target="_blank" rel="noreferrer noopener">
                  <span>
                    <span className="mono manifest-name">{c.name}</span>
                    <span className="small muted">{c.role}</span>
                  </span>
                  <span className="mono small manifest-addr">
                    {c.addr.slice(0, 6)}…{c.addr.slice(-4)}
                    <ExternalLink size={13} strokeWidth={2} aria-hidden="true" />
                  </span>
                </a>
              ))}
            </div>
            <p className="small faint manifest-foot">
              Verified on Blockscout. Ethereum mainnet only: the Sepolia test registry was excluded on purpose, because its
              entries are free to mint.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

const LIMITS: [string, string][] = [
  ["A review nobody proved is invisible", "Glowing reviews nobody paid to prove do not help an agent here. A bounty fixes that."],
  ["Admitted evidence, not a complete history", "Holes below the highest proven review show. A newer review nobody proved does not. Every count is a floor."],
  ["An old wallet can be bought", "Reviewer history makes fake reviewers expensive, not impossible."],
  ["An honest operator looks like a farm", "Twenty real agents and twenty fakes look alike from outside. Tinjau reports the count and refuses to guess."],
  ["Ethereum only, and a test network", "The coins here are free; the registry being read is the live one."],
];

function Limits() {
  return (
    <section className="section">
      <div className="shell">
        <h2 className="section-title">What this cannot tell you</h2>
        <dl className="limits">
          {LIMITS.map(([t, b]) => (
            <div className="limit" key={t}>
              <dt>{t}</dt>
              <dd className="small muted">{b}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="section cta">
      <div className="shell">
        <h2 className="section-title cta-title">Pick your bar. Let the contract answer.</h2>
        <p className="muted measure-center">Two real agents, same day, opposite verdicts.</p>
        <div className="cta-actions">
          <a className="btn btn-primary btn-lg" href={href.agents}>
            Open the marketplace
            <ArrowRight size={16} strokeWidth={2.25} aria-hidden="true" />
          </a>
          <a className="btn btn-secondary btn-lg" href={href.faq}>
            Read the questions people ask
          </a>
        </div>
      </div>
    </section>
  );
}
