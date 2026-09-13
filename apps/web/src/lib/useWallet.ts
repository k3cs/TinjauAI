import { useEffect, useState } from "react";
import { connect as connectWallet, hasWallet, readBalance } from "./wallet";

/**
 * One wallet for the whole page. The hire panel, the bounty panel and the marketplace header all
 * need the same account and the same balance; keeping it in a module-level store means connecting
 * once is enough and a payment updates the balance everywhere.
 */
export interface Account {
  address: string;
  balance: bigint;
}

let account: Account | undefined;
const listeners = new Set<(a: Account | undefined) => void>();

function emit() {
  for (const l of listeners) l(account);
}

export async function connectShared(): Promise<Account> {
  account = await connectWallet();
  emit();
  return account;
}

export function disconnectShared() {
  account = undefined;
  emit();
}

/** Re-read the balance after anything that spends: the number on screen must be the chain's. */
export async function refreshBalance() {
  if (!account) return;
  try {
    account = { ...account, balance: await readBalance(account.address) };
    emit();
  } catch {
    /* leave the last known balance rather than showing a wrong one */
  }
}

export function useWallet() {
  const [acc, setAcc] = useState<Account | undefined>(account);

  useEffect(() => {
    listeners.add(setAcc);
    return () => {
      listeners.delete(setAcc);
    };
  }, []);

  return { account: acc, hasWallet: hasWallet(), connect: connectShared, disconnect: disconnectShared, refresh: refreshBalance };
}
