import type { HireParams } from "@tinjau/core/contracts";
import { explain, type Verdict } from "./plain";
import type { AgentView } from "./useBureau";
import { verdictState, type VerdictState } from "../components/VerdictPill";

/** One place that turns a bureau row into what every page shows, so /agents and /compare never disagree. */
export function verdictOf(agent: AgentView, params: HireParams): (Verdict & { state: VerdictState }) | undefined {
  if (!agent.quote) return undefined;
  const holes = agent.reviewers
    .filter((r) => r.missingReviews > 0n)
    .map((r) => ({ highest: r.highestReview, missing: r.missingReviews }));
  const v = explain(agent.quote, params, holes);
  const weak = v.reasons.filter((r) => r.tone === "bad").length;
  return { ...v, state: verdictState(v.hireable, weak) };
}
