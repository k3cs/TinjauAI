import type { Facts } from "@tinjau/core/facts-model";
import type { HireParams, Quote } from "@tinjau/core/contracts";

/**
 * Every sentence the visitor reads about an agent is produced here, from the numbers the contract
 * returned. Two rules hold:
 *
 * 1. No jargon reaches this output. The contract's own words (breadthGrounded, gapCount,
 *    cloneDensityLB, bps, chainKey) stay inside the `technical` field, which only the
 *    "How do we know?" disclosure shows.
 * 2. Nothing here decides anything. `gated` and the fee come from the contract; these strings only
 *    say what it decided and why, so the page can never disagree with the chain.
 */

export type Tone = "good" | "bad" | "plain";

export interface Reason {
  tone: Tone;
  /** One sentence, readable by someone who has never heard of any of this. */
  text: string;
  /** The consequence, only where the fact alone would not explain why it matters. */
  because?: string;
  /** The same fact in the contract's language, for the disclosure. */
  technical: string;
}

export interface Verdict {
  hireable: boolean;
  /** Headline state, in two words at most. */
  stamp: string;
  /** The single sentence that carries the decision. */
  summary: string;
  feePercent: string;
  reasons: Reason[];
  /** Present only when the contract would refuse the hire. */
  block?: { title: string; explanation: string; technical: string };
}

const BLOCKS_PER_DAY = 7200; // Ethereum, ~12s blocks

function duration(blocks: bigint): string {
  const days = Number(blocks) / BLOCKS_PER_DAY;
  if (days >= 730) return `${(days / 365).toFixed(1)} years`;
  if (days >= 60) return `${Math.round(days / 30)} months`;
  if (days >= 2) return `${Math.round(days)} days`;
  const hours = days * 24;
  return hours >= 2 ? `${Math.round(hours)} hours` : "less than an hour";
}

const plural = (n: bigint | number, one: string, many = `${one}s`) => (Number(n) === 1 ? one : many);

export function feePercent(premiumBps: bigint): string {
  const pct = Number(premiumBps) / 100;
  return Number.isInteger(pct) ? `${pct}%` : `${pct.toFixed(2)}%`;
}

/** "on a 0.1 tCTC job you pay 0.001 tCTC" — a percentage means nothing until it is money. */
export function feeExample(premiumBps: bigint, jobAmount: number): string {
  const fee = (jobAmount * Number(premiumBps)) / 10_000;
  const held = jobAmount - fee;
  return `Of ${jobAmount} tCTC, ${fee.toFixed(4)} tCTC goes to the agent's owner now and ${held.toFixed(4)} tCTC is held until you confirm the work.`;
}

/** The same fee as money, in one short clause for a table cell or a card. */
export function feeExampleShort(premiumBps: bigint, jobAmount = 0.1): string {
  const fee = (jobAmount * Number(premiumBps)) / 10_000;
  return `on a ${jobAmount} tCTC job, ${fee.toFixed(4)} tCTC goes to the owner now, the rest is held`;
}

function reviewerReasons(f: Facts, p: HireParams): Reason[] {
  const out: Reason[] = [];
  const raw = f.breadthRaw;
  const grounded = f.breadthGrounded;

  if (raw === 0n) {
    out.push({
      tone: "plain",
      text: "Nobody has reviewed this agent yet.",
      because: "There is nothing to check, so the fee stays at its highest.",
      technical: "breadthRaw = 0",
    });
    return out;
  }

  if (grounded === raw) {
    out.push({
      tone: "good",
      text: `${raw} ${plural(raw, "person", "people")} reviewed this agent, and we could verify ${raw === 1n ? "them" : "all of them"}.`,
      because: `Each had been active on Ethereum for at least ${duration(p.minAge)} before writing their review, so none of them is a wallet made up on the spot.`,
      technical: `breadthRaw ${raw}, breadthGrounded ${grounded}, minAge ${p.minAge} blocks, minDepth ${p.minDepth}`,
    });
  } else {
    out.push({
      tone: grounded === 0n ? "bad" : "plain",
      text:
        grounded === 0n
          ? raw === 1n
            ? "This agent has one reviewer, and we could not verify them."
            : `This agent has ${raw} reviewers, and we could not verify any of them.`
          : `Of ${raw} reviewers, only ${grounded} could be verified.`,
      because:
        grounded === 0n && raw === 1n
          ? "Their wallet was too new, or active for too short a time, to tell apart from the agent's owner reviewing their own work."
          : "The others were wallets too new, or too briefly active, to tell apart from one person writing their own reviews.",
      technical: `breadthRaw ${raw}, breadthGrounded ${grounded}, minAge ${p.minAge} blocks, minDepth ${p.minDepth}`,
    });
  }

  if (f.breadthIndependent < grounded) {
    out.push({
      tone: "bad",
      text: `${grounded - f.breadthIndependent} of the verified reviewers own AI agents of their own.`,
      because: "An owner reviewing inside their own market is not an outside opinion.",
      technical: `breadthIndependent ${f.breadthIndependent} < breadthGrounded ${grounded}`,
    });
  }

  if (f.negatives > 0n) {
    out.push({
      tone: "bad",
      text: `${f.negatives} ${plural(f.negatives, "review")} ${plural(f.negatives, "was", "were")} negative.`,
      technical: `negatives = ${f.negatives}`,
    });
  }

  return out;
}

function provenanceReasons(f: Facts, p: HireParams): Reason[] {
  const out: Reason[] = [];

  if (f.cloneDensityLB > 0n) {
    out.push({
      tone: f.cloneDensityLB >= p.c ? "bad" : "plain",
      text: `The same owner also runs ${f.cloneDensityLB} other ${plural(f.cloneDensityLB, "agent")}.`,
      because:
        f.cloneDensityLB >= p.c
          ? "A crowd of look-alike agents is the cheapest way to fake a track record, so this costs the agent."
          : "That is below the limit you set, so it does not count against the agent.",
      technical: `cloneDensityLB ${f.cloneDensityLB} (registrantSiblings ${f.registrantSiblings}, uriSiblings ${f.uriSiblings}, sameTxSiblings ${f.sameTxSiblings}); your limit c = ${p.c}`,
    });
  } else {
    out.push({
      tone: "good",
      text: "No look-alike agents share this one's owner, listing or registration.",
      technical: "cloneDensityLB = 0",
    });
  }

  if (f.minAttestors > 0) {
    out.push({
      tone: "plain",
      text: `At least ${f.minAttestors} bonded Creditcoin ${plural(f.minAttestors, "checker")} ${f.minAttestors === 1 ? "was" : "were"} registered for Ethereum whenever a fact here was admitted.`,
      because: "Checkers put a stake behind Ethereum's state; this is how many were registered when the evidence came in, not who signed each proof.",
      technical: `facts.minAttestors = ${f.minAttestors} (AttestorStash 0x0FD4)`,
    });
  }

  return out;
}

/** Just enough of a reviewer row to describe the hole precisely; see chain.ts ReviewerRow. */
export interface Hole {
  highest: bigint;
  missing: bigint;
}

export function explain(quote: Quote, p: HireParams, holes?: Hole[]): Verdict {
  const f = quote.facts;
  const reasons = [...reviewerReasons(f, p), ...provenanceReasons(f, p)];

  let block: Verdict["block"] | undefined;

  if (f.gapCount > 0n) {
    const holed = holes ?? [];
    const worst = holed.length ? holed.reduce((a, b) => (b.missing > a.missing ? b : a)) : undefined;
    block = {
      title:
        f.gapCount === 1n
          ? "One reviewer's reviews are only partly proven"
          : `${f.gapCount} reviewers' reviews are only partly proven`,
      explanation: worst
        ? `Reviews are numbered as they are written. Review #${worst.highest} of this reviewer is proven, but ${worst.missing} earlier ${plural(worst.missing, "one", "ones")} ${plural(worst.missing, "was", "were")} never shown to us. Somebody could be showing the good reviews and holding the bad ones back, and we will not price what we cannot see.`
        : "Reviews are numbered as they are written. A later number is proven here while earlier ones are not, so reviews that exist have not been shown to us. Somebody could be showing the good reviews and holding the bad ones back, and we will not price what we cannot see.",
      technical: `facts.gapCount = ${f.gapCount} (reviewers whose maxIndex > known); AgentHireEscrow.hire reverts Gated(${f.gapCount})`,
    };
  } else if (f.truncated) {
    block = {
      title: "This agent has more reviewers than we can check in one go",
      explanation:
        "The check stops after 256 reviewers, so gaps could be hiding past that point. Rather than guess, the hire is refused.",
      technical: "facts.truncated = true; AgentHireEscrow.hire reverts Truncated()",
    };
  } else if (p.minAttestors > 0 && f.minAttestors < p.minAttestors) {
    block = {
      title: "Too few independent checkers behind these facts",
      explanation: `You asked for at least ${p.minAttestors} Creditcoin checkers registered whenever a fact is admitted; one fact here came in with only ${f.minAttestors}.`,
      technical: `ThinQuorum(${f.minAttestors}, ${p.minAttestors})`,
    };
  } else if (p.maxStaleness > 0n && quote.staleness > p.maxStaleness) {
    block = {
      title: "This record is out of date",
      explanation: `The proven record trails Ethereum by ${duration(quote.staleness)}, which is more than you allowed.`,
      technical: `Stale(${quote.staleness}, ${p.maxStaleness})`,
    };
  }

  const fee = feePercent(quote.premiumBps);
  const good = reasons.filter((r) => r.tone === "good").length;
  const bad = reasons.filter((r) => r.tone === "bad").length;

  return {
    hireable: !block,
    stamp: block ? "Held back" : "Clear to hire",
    summary: block
      ? block.title
      : bad > 0
        ? `You can hire this agent, but its record has weak spots, so the protection fee is ${fee}.`
        : `${good > 1 ? "Everything we could check holds up" : "What we could check holds up"}, so the protection fee is at its lowest: ${fee}.`,
    feePercent: fee,
    reasons,
    block,
  };
}

/** "read at block 25,942,404 (about 4 minutes ago)": the age of the newest proven fact, not a promise that every block up to it was examined. */
export function asOf(coveredThrough: bigint, attestedTip?: bigint): string {
  const at = `read at Ethereum block ${Number(coveredThrough).toLocaleString("en-US")}`;
  if (!attestedTip || attestedTip <= coveredThrough) return at;
  return `${at}, ${duration(attestedTip - coveredThrough)} behind Ethereum's latest checked block`;
}

export const shortAddress = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
export const shortHash = (h: string) => `${h.slice(0, 10)}…${h.slice(-6)}`;
