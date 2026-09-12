import { useEffect, useState } from "react";
import type { Quote } from "@tinjau/core/contracts";
import { readIdentity, readNetwork, readQuote, readReviewers, type AgentIdentity, type NetworkStatus, type ReviewerRow } from "./chain";
import { ROSTER } from "./agents";
import type { Care } from "./params";
import { presetOf } from "./params";

export interface AgentView {
  agentId: bigint;
  origin: string;
  identity?: AgentIdentity;
  quote?: Quote;
  reviewers: ReviewerRow[];
  error?: string;
}

export interface BureauState {
  loading: boolean;
  /** True when the chain could not be read at all: the page must say so, never show stale as live. */
  failed: boolean;
  net?: NetworkStatus;
  agents: AgentView[];
}

/**
 * Reads the bureau for every agent on the roster under the visitor's chosen care level. Quotes are
 * re-read when that level changes, because the thresholds are what the contract prices on: the page
 * must never recompute a fee itself.
 */
export function useBureau(care: Care): BureauState {
  const [state, setState] = useState<BureauState>({ loading: true, failed: false, agents: [] });

  useEffect(() => {
    let alive = true;
    const p = presetOf(care).params;

    (async () => {
      setState((s) => ({ ...s, loading: true }));

      const net = await readNetwork().catch(() => undefined);
      if (!alive) return;

      const agents = await Promise.all(
        ROSTER.map(async ({ agentId, origin }): Promise<AgentView> => {
          try {
            const [identity, quote, reviewers] = await Promise.all([
              readIdentity(agentId),
              readQuote(agentId, p),
              readReviewers(agentId),
            ]);
            return { agentId, origin, identity, quote, reviewers };
          } catch (e) {
            return { agentId, origin, reviewers: [], error: (e as Error).message };
          }
        }),
      );
      if (!alive) return;

      setState({
        loading: false,
        failed: !net && agents.every((a) => !a.quote),
        net,
        agents,
      });
    })();

    return () => {
      alive = false;
    };
  }, [care]);

  return state;
}
