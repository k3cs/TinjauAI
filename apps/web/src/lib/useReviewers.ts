import { useEffect, useState } from "react";
import { readReviewers, type ReviewerRow } from "./chain";

/**
 * Reviewers are read only when a visitor opens an agent: a busy agent has dozens of them, and each
 * one costs three contract reads. The list page stays fast and nothing on it depends on this.
 */
export function useReviewers(agentId: bigint, enabled: boolean): { rows: ReviewerRow[]; loading: boolean } {
  const [rows, setRows] = useState<ReviewerRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    setLoading(true);
    readReviewers(agentId)
      .then((r) => alive && setRows(r))
      .catch(() => alive && setRows([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [agentId, enabled]);

  return { rows, loading };
}
