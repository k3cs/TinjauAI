import { useEffect, useState } from "react";
import type { Quote } from "@tinjau/core/contracts";
import { readAgents, readIdentity, readNetwork, readOpenBounties, readQuote, type AgentIdentity, type Bounty, type NetworkStatus, type ReviewerRow } from "./chain";
import type { Care } from "./params";
import { presetOf } from "./params";

export interface AgentView {
  agentId: bigint;
  /** Proven reviews seen on-chain, the order the list is in. */
  reviews: number;
  identity?: AgentIdentity;
  quote?: Quote;
  reviewers: ReviewerRow[];
  bounties: Bounty[];
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
 * Reads the bureau for every agent the contract has proved, under the visitor's chosen care level.
 * Runs only when the route on screen actually shows chain figures.
 * Reviewers are not fetched here: a busy agent has dozens, and the row only needs them when the
 * visitor opens it (see useReviewers). Quotes are
 * re-read when that level changes, because the thresholds are what the contract prices on: the page
 * must never recompute a fee itself.
 */
export function useBureau(care: Care, refreshKey = 0, enabled = true): BureauState {
  const [state, setState] = useState<BureauState>({ loading: true, failed: false, agents: [] });

  useEffect(() => {
    // The FAQ, the how-it-works page and the developer page show no chain figure, so they must not
    // pay for three log scans and twenty-five quotes to render a page of prose.
    if (!enabled) return;
    let alive = true;
    const p = presetOf(care).params;

    (async () => {
      setState((s) => ({ ...s, loading: true }));

      // The listings need the agent list and nothing else, so nothing else is allowed to hold them
      // up. Running all three log scans at once is slower than this, not faster: the public RPC
      // queues large getLogs calls, and the agent list ends up behind two scans the listings do not
      // read. So the scan the page depends on goes first, alone, and the other two land underneath
      // it when they are ready.
      const netPromise = readNetwork().catch(() => undefined);
      const bountiesPromise = readOpenBounties().catch(() => new Map<string, Bounty[]>());

      const listed = await readAgents().catch(() => []);
      if (!alive) return;

      const read = async ({ agentId, reviews }: { agentId: bigint; reviews: number }): Promise<AgentView> => {
        try {
          const [identity, quote] = await Promise.all([readIdentity(agentId), readQuote(agentId, p)]);
          return { agentId, reviews, identity, quote, reviewers: [], bounties: [] };
        } catch (e) {
          return { agentId, reviews, reviewers: [], bounties: [], error: (e as Error).message };
        }
      };

      // Two waves: the first screenful arrives fast, the rest of the bureau follows. Every agent the
      // contract has proved ends up on the page; none of them is chosen by hand.
      const FIRST = 12;
      const head = await Promise.all(listed.slice(0, FIRST).map(read));
      if (!alive) return;
      // An empty list is not yet proof of anything: it could be a bureau with no agents or a chain
      // that is not answering, and only the network read settles which. Until it does, the page
      // keeps waiting rather than claiming either.
      setState({ loading: false, failed: head.length > 0 && head.every((a) => !a.quote), agents: head });

      const tail = listed.length > FIRST ? await Promise.all(listed.slice(FIRST).map(read)) : [];
      if (!alive) return;
      if (tail.length) setState((s) => ({ ...s, agents: [...head, ...tail] }));

      // The network counter and the open bounties are page furniture: they arrive when they arrive,
      // and until then the page says so rather than showing a number it has not read.
      const [net, bounties] = await Promise.all([netPromise, bountiesPromise]);
      if (!alive) return;
      setState((s) => ({
        ...s,
        net,
        failed: !net && s.agents.every((a) => !a.quote),
        agents: s.agents.map((a) => ({ ...a, bounties: bounties.get(a.agentId.toString()) ?? [] })),
      }));
    })();

    return () => {
      alive = false;
    };
  }, [care, refreshKey, enabled]);

  return state;
}
