import { useEffect, useState } from "react";
import { readAgentCard, type AgentCard } from "./agentCard";

/**
 * Cards arrive one by one: they come from Ethereum and from whatever host the owner chose, so a slow
 * gateway must never hold up the rest of the marketplace. Six at a time keeps most of the browser's
 * connection budget for the chain reads the page actually depends on.
 */
export function useAgentCards(ids: bigint[]): Map<string, AgentCard> {
  const [cards, setCards] = useState<Map<string, AgentCard>>(new Map());
  const key = ids.map((i) => i.toString()).join(",");

  useEffect(() => {
    if (!ids.length) return;
    let alive = true;
    const queue = [...ids];

    async function worker() {
      while (alive) {
        const id = queue.shift();
        if (id === undefined) return;
        const card = await readAgentCard(id).catch(() => undefined);
        if (!alive || !card) continue;
        setCards((prev) => new Map(prev).set(id.toString(), card));
      }
    }

    void Promise.all(Array.from({ length: 6 }, worker));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return cards;
}
