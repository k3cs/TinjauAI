import type { HireParams } from "@tinjau/core/contracts";

/**
 * The contract takes eight thresholds. A visitor who has never seen this product cannot answer
 * "minimum reviewer age in blocks", so the page asks one question instead ("how careful do you want
 * to be?") and each answer is a real set of thresholds. The numbers stay visible under "advanced":
 * the point of Tinjau is that the caller sets the bar, so hiding the bar entirely would be a lie.
 */
export type Care = "careful" | "normal" | "relaxed";

export interface Preset {
  id: Care;
  name: string;
  /** What choosing this actually means, in the visitor's terms. */
  meaning: string;
  params: HireParams;
}

const BASE_BPS = 100; // 1% floor: the cheapest an agent with a clean record can be
const MAX_BPS = 2000; // 20% ceiling

export const PRESETS: Preset[] = [
  {
    id: "careful",
    name: "Careful",
    meaning:
      "A reviewer needs about four and a half months of history before their review counts, four of them must check out, and the same owner may run at most three other agents.",
    params: {
      minAge: 1_000_000n,
      minDepth: 2,
      k: 4n,
      c: 3n,
      baseBps: BASE_BPS,
      maxBps: MAX_BPS,
      minAttestors: 4,
      maxStaleness: 0n,
    },
  },
  {
    id: "normal",
    name: "Normal",
    meaning:
      "A reviewer needs about ten weeks of history, and three must check out. These are the settings every published Tinjau figure uses.",
    params: {
      minAge: 500_000n,
      minDepth: 2,
      k: 3n,
      c: 5n,
      baseBps: BASE_BPS,
      maxBps: MAX_BPS,
      minAttestors: 0,
      maxStaleness: 0n,
    },
  },
  {
    id: "relaxed",
    name: "Relaxed",
    meaning:
      "Two reviewers with about two weeks of history are enough. Cheaper when a record is thin, and you carry more of the risk yourself.",
    params: {
      minAge: 100_000n,
      minDepth: 1,
      k: 2n,
      c: 10n,
      baseBps: BASE_BPS,
      maxBps: MAX_BPS,
      minAttestors: 0,
      maxStaleness: 0n,
    },
  },
];

export const presetOf = (id: Care): Preset => PRESETS.find((p) => p.id === id) ?? PRESETS[1];

/** Plain-language gloss for each threshold, used by the "advanced" disclosure. */
export const THRESHOLD_COPY: Record<string, { name: string; plain: string }> = {
  minAge: {
    name: "Reviewer history",
    plain: "How long a reviewer must have been active on Ethereum before their review counts, in blocks (13 seconds each).",
  },
  minDepth: {
    name: "Spread of activity",
    plain: "How many separate stretches of time a reviewer must have been active in, so a wallet used on one single day does not qualify.",
  },
  k: { name: "Reviewers needed", plain: "How many verified reviewers it takes for the fee to reach its floor." },
  c: { name: "Look-alike tolerance", plain: "How many agents the same owner may also run before it starts costing the agent." },
  minAttestors: {
    name: "Checkers required",
    plain: "How many bonded Creditcoin attestors must stand behind each proven fact. 0 means you accept whatever stood behind it.",
  },
  maxStaleness: {
    name: "Freshness",
    plain: "How far the proven record may lag behind Ethereum's attested tip. 0 means you accept any lag.",
  },
};
