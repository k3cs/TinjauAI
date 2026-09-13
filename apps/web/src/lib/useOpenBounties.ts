import { useEffect, useState } from "react";
import { readOpenBounties, type Bounty } from "./chain";

export interface OpenBounties {
  /** Undefined until the contract has answered: the tab must not claim a count it has not read. */
  list?: Bounty[];
  failed: boolean;
  total: bigint;
}

/**
 * Every open bounty on the contract, flat and biggest first. It lives here rather than inside the
 * board because the marketplace tab has to show how many there are before anyone opens the board.
 */
export function useOpenBounties(reloadKey: number): OpenBounties {
  const [state, setState] = useState<OpenBounties>({ failed: false, total: 0n });

  useEffect(() => {
    let alive = true;
    setState({ failed: false, total: 0n });
    readOpenBounties()
      .then((byAgent) => {
        if (!alive) return;
        const list = [...byAgent.values()].flat().sort((a, b) => Number(b.amount - a.amount));
        setState({ list, failed: false, total: list.reduce((s, b) => s + b.amount, 0n) });
      })
      .catch(() => alive && setState({ failed: true, total: 0n }));
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  return state;
}
