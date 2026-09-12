import snapshot from "../data/facts.json";

/**
 * The evidence trail behind each agent: an Ethereum transaction paired with the Creditcoin
 * transaction that proved it. Read from the committed scout export rather than from the chain,
 * because these pairs are history and cannot change: both transactions are mined. Everything that
 * *can* change (facts, fees, verdicts) is read live in chain.ts and never from here.
 */

export interface EvidencePair {
  role: string;
  dir: "base" | "help" | "hurt";
  reason: string;
  sourceTx: string;
  sourceUrl: string;
  height: number;
  roots: number;
  creditcoinTx: string;
  creditcoinUrl: string;
  batchGas: string;
}

const byAgent = new Map<string, EvidencePair[]>(
  (snapshot.agents as { agentId: string; evidence: EvidencePair[] }[]).map((a) => [a.agentId, a.evidence]),
);

export const evidenceFor = (agentId: bigint): EvidencePair[] => byAgent.get(agentId.toString()) ?? [];

export const snapshotTakenAt = snapshot.generatedAt as string;

/** What each kind of evidence is, for someone who has never read a registry. */
export const ROLE_COPY: Record<string, string> = {
  registration: "The moment this agent was created on Ethereum",
  review: "A review being written",
  activity: "Proof of how far back the reviewer's own activity goes",
  cloneSibling: "Another agent created by the same owner",
  reviewerOwnsAgent: "Proof that this reviewer runs agents of their own",
  higherIndex: "The highest-numbered review found for this reviewer",
};

export const DIR_COPY: Record<EvidencePair["dir"], string> = {
  base: "Background",
  help: "Counts in the agent's favour",
  hurt: "Counts against the agent",
};

/**
 * Ethereum block to a date, calibrated on the attested tip the contract just reported: blocks are 12
 * seconds apart since the merge, so anchoring on "the tip is now" stays accurate to within hours and
 * needs no second data source. Always presented as an approximation.
 */
export function ethDate(height: number | bigint, tip?: bigint): string | undefined {
  if (!tip) return undefined;
  const secondsAgo = Number(tip - BigInt(height)) * 12;
  if (secondsAgo < 0) return undefined;
  const d = new Date(Date.now() - secondsAgo * 1000);
  return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}
