import { BUCKET } from "@tinjau/core";
import type { AgentData, Review, ReviewerData } from "./discovery.js";

export type Direction = "base" | "help" | "hurt";
export type Role =
  | "registration"
  | "review"
  | "activity"
  | "negative"
  | "revocation"
  | "higherIndex"
  | "reviewerOwnsAgent"
  | "cloneSibling";

export interface Evidence {
  tx: string;
  height: number;
  txIndex: number;
  dir: Direction;
  role: Role;
  reason: string;
  estGas: number;
}

export interface Decision extends Evidence {
  status: "chosen" | "rejected" | "admitted";
  why: string;
}

export interface Thresholds {
  minAge: bigint;
  minDepth: number;
  k: bigint;
  c: bigint;
}

export interface PlanInput {
  agent: AgentData;
  reviewers: Map<string, ReviewerData>;
  thresholds: Thresholds;
  gasBudget: number;
  /** Highest source height Creditcoin has attested; newer txs cannot be proven yet. */
  attestedHeight: number;
  /** True if (height, txIndex) is already admitted on-chain (R3: another scout did it). */
  isAdmitted: (height: number, txIndex: number) => boolean;
  helpShare?: number;
  /**
   * Which reviewers get their highest review proven when their earlier reviews are not: "conflicted"
   * (reviewers who own agents; default), "all", or "none". A proven top index with unproven lower
   * ones gates hires until someone proves the rest, so the scout only does it where it is informative.
   */
  gapProofs?: "conflicted" | "all" | "none";
}

const DECODE_GAS: Record<Role, number> = {
  registration: 440_000,
  review: 260_000,
  activity: 130_000,
  negative: 260_000,
  revocation: 200_000,
  higherIndex: 260_000,
  reviewerOwnsAgent: 440_000,
  cloneSibling: 440_000,
};

/** Precompile cost grows with the continuity chain, which grows with the tx's age (docs/legacy/02-teknis.md §4). */
export function estimateGas(role: Role, height: number, attestedHeight: number): number {
  const roots = 90 + Math.max(0, attestedHeight - height) / 13_000;
  return Math.round(110_000 + 600 * roots + DECODE_GAS[role]);
}

interface ReviewerBundle {
  client: string;
  items: Evidence[];
  cost: number;
  grounded: boolean;
  why: string;
}

/**
 * R2: gather evidence in both directions. Helps make grounded reviewers provable (every review
 * index + old, spread activity). Hurts expose negatives, revocations, higher unproven indices,
 * reviewers who own agents, and the owner's other agents. A share of the budget is reserved for
 * helps so hurts cannot always crowd them out, and vice versa.
 */
export function plan(input: PlanInput): Decision[] {
  const { agent, reviewers, thresholds, attestedHeight } = input;
  const helpShare = input.helpShare ?? 0.4;
  const decisions: Decision[] = [];
  const seen = new Set<string>();
  const ev = (e: Omit<Evidence, "estGas">): Evidence => ({ ...e, estGas: estimateGas(e.role, e.height, attestedHeight) });

  const byClient = new Map<string, Review[]>();
  for (const r of agent.reviews) {
    const l = byClient.get(r.client) ?? [];
    l.push(r);
    byClient.set(r.client, l);
  }
  for (const l of byClient.values()) l.sort((a, b) => (a.index < b.index ? -1 : 1));

  // ---- base: the agent's own registration (owner, registrant, provenance)
  const base: Evidence[] = agent.registration
    ? [ev({ tx: agent.registration.tx, height: agent.registration.height, txIndex: agent.registration.txIndex, dir: "base", role: "registration", reason: `agent ${agent.agentId} registration (owner ${short(agent.registration.owner)})` })]
    : [];

  // ---- helps: one bundle per reviewer that can be grounded
  const bundles: ReviewerBundle[] = [];
  for (const [client, reviews] of byClient) {
    const rd = reviewers.get(client.toLowerCase());
    const contiguous = reviews.every((r, i) => r.index === BigInt(i + 1));
    if (!contiguous) {
      bundles.push({ client, items: [], cost: 0, grounded: false, why: "review indices not contiguous in discovery data" });
      continue;
    }
    if (!rd) {
      bundles.push({ client, items: [], cost: 0, grounded: false, why: "reviewer history not scanned (scan cap)" });
      continue;
    }
    const first = reviews[0];
    // Reverted txs still prove the sender was active (the contract records activity for them too).
    const eligible = rd.sent.filter((t) => BigInt(first.height) - BigInt(t.blockNumber) >= thresholds.minAge);
    if (eligible.length === 0) {
      bundles.push({ client, items: [], cost: 0, grounded: false, why: `no sent tx ≥ ${thresholds.minAge} blocks before first review (oldest seen ${rd.sent[0]?.blockNumber ?? "none"}${rd.complete ? "" : ", older history not scanned"})` });
      continue;
    }
    const items: Evidence[] = reviews.map((r) =>
      ev({ tx: r.tx, height: r.height, txIndex: r.txIndex, dir: "help", role: "review", reason: `review #${r.index} by ${short(client)} (value ${r.value})` }),
    );
    const buckets = new Set(reviews.map((r) => BigInt(r.height) / BUCKET));
    const oldest = eligible[0];
    items.push(ev({ tx: oldest.hash, height: oldest.blockNumber, txIndex: oldest.transactionIndex, dir: "help", role: "activity", reason: `oldest tx of ${short(client)}, ${first.height - oldest.blockNumber} blocks before first review` }));
    buckets.add(BigInt(oldest.blockNumber) / BUCKET);
    for (const t of rd.sent) {
      if (buckets.size >= thresholds.minDepth) break;
      const b = BigInt(t.blockNumber) / BUCKET;
      if (buckets.has(b) || t.blockNumber > attestedHeight) continue;
      buckets.add(b);
      items.push(ev({ tx: t.hash, height: t.blockNumber, txIndex: t.transactionIndex, dir: "help", role: "activity", reason: `activity of ${short(client)} in bucket ${b} (depth)` }));
    }
    if (buckets.size < thresholds.minDepth) {
      bundles.push({ client, items: [], cost: 0, grounded: false, why: `only ${buckets.size} activity buckets available, need ${thresholds.minDepth}` });
      continue;
    }
    const cost = items.reduce((s, i) => s + (input.isAdmitted(i.height, i.txIndex) ? 0 : i.estGas), 0);
    bundles.push({ client, items, cost, grounded: true, why: `groundable: ${reviews.length} review(s), ${buckets.size} buckets` });
  }
  bundles.sort((a, b) => a.cost - b.cost);

  // ---- hurts
  const hurts: Evidence[] = [];
  for (const r of agent.reviews.filter((r) => r.value < 0n)) {
    hurts.push(ev({ tx: r.tx, height: r.height, txIndex: r.txIndex, dir: "hurt", role: "negative", reason: `negative review #${r.index} by ${short(r.client)} (value ${r.value})` }));
  }
  for (const r of agent.revocations) {
    hurts.push(ev({ tx: r.tx, height: r.height, txIndex: r.txIndex, dir: "hurt", role: "revocation", reason: `revocation of #${r.index} by ${short(r.client)}` }));
  }
  for (const [client, rd] of reviewers) {
    const reg = rd.ownRegistrations[0];
    if (reg && byClient.has(rd.address)) {
      hurts.push(ev({ tx: reg.tx, height: reg.height, txIndex: reg.txIndex, dir: "hurt", role: "reviewerOwnsAgent", reason: `reviewer ${short(client)} owns ${rd.ownRegistrations.length} agent(s); registration of agent ${reg.agentId}` }));
    }
  }
  const sibs = agent.ownerRegistrations.filter((s) => s.agentId !== agent.agentId).slice(0, Number(thresholds.c));
  for (const s of sibs) {
    hurts.push(ev({ tx: s.tx, height: s.height, txIndex: s.txIndex, dir: "hurt", role: "cloneSibling", reason: `owner also registered agent ${s.agentId}` }));
  }

  // ---- budget
  let used = 0;
  const helpCap = input.gasBudget * helpShare;
  const push = (e: Evidence, status: Decision["status"], why: string) => {
    const key = e.tx.toLowerCase();
    if (seen.has(key)) {
      decisions.push({ ...e, status: "rejected", why: "same tx already in plan (serves several roles)" });
      return;
    }
    seen.add(key);
    decisions.push({ ...e, status, why });
  };
  const take = (e: Evidence, why: string) => {
    if (e.height > attestedHeight) return push(e, "rejected", `not attested yet (tip ${attestedHeight})`);
    if (input.isAdmitted(e.height, e.txIndex)) return push(e, "admitted", "already admitted on-chain (0 gas)");
    used += e.estGas;
    push(e, "chosen", why);
  };

  for (const e of base) take(e, "needed: without a proven registration the agent is unknown to consumers");

  let grounded = 0;
  let helpUsed = 0;
  for (const b of bundles) {
    if (!b.grounded) {
      decisions.push({ tx: "-", height: 0, txIndex: 0, dir: "help", role: "review", reason: `reviewer ${short(b.client)}`, estGas: 0, status: "rejected", why: b.why });
      continue;
    }
    if (BigInt(grounded) >= thresholds.k) {
      decisions.push({ tx: "-", height: 0, txIndex: 0, dir: "help", role: "review", reason: `reviewer ${short(b.client)}`, estGas: b.cost, status: "rejected", why: `k=${thresholds.k} grounded reviewers already covered` });
      continue;
    }
    if (helpUsed + b.cost > helpCap) {
      decisions.push({ tx: "-", height: 0, txIndex: 0, dir: "help", role: "review", reason: `reviewer ${short(b.client)}`, estGas: b.cost, status: "rejected", why: `bundle ${b.cost} gas exceeds help budget` });
      continue;
    }
    for (const e of b.items) take(e, `helps: ${b.why}`);
    helpUsed += b.cost;
    grounded++;
  }

  // Reviewers we could not ground but who reviewed several times: prove their highest index. This
  // is honest evidence the record is incomplete (the gap gates the hire until someone proves the rest).
  const gapPolicy = input.gapProofs ?? "conflicted";
  for (const [client, reviews] of byClient) {
    if (reviews.length < 2 || gapPolicy === "none") continue;
    const owns = (reviewers.get(client.toLowerCase())?.ownRegistrations.length ?? 0) > 0;
    if (gapPolicy === "conflicted" && !owns) continue;
    const chosen = decisions.some((d) => d.status !== "rejected" && d.role === "review" && d.reason.includes(short(client)));
    if (chosen) continue;
    const top = reviews[reviews.length - 1];
    hurts.push(ev({ tx: top.tx, height: top.height, txIndex: top.txIndex, dir: "hurt", role: "higherIndex", reason: `highest review #${top.index} of ${short(client)} (${reviews.length} reviews, reviewer owns agents)` }));
  }

  for (const e of hurts) {
    if (used + e.estGas > input.gasBudget) {
      push(e, "rejected", `over gas budget (${used}/${input.gasBudget})`);
      continue;
    }
    take(e, "hurts: evidence against the agent is paid the same as evidence for it");
  }
  return decisions;
}

export const short = (a: string) => (a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a);
