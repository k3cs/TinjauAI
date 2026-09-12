import { useState } from "react";
import { formatEther } from "ethers";
import { ExternalLink, Wallet } from "lucide-react";
import { CC3_TESTNET } from "../lib/chain";
import { presetOf, type Care } from "../lib/params";
import { connect, hasWallet, hire, readableError, type HireResult } from "../lib/wallet";

/**
 * Two ways through, both honest. Preview does the same arithmetic the contract does on the fee it
 * just quoted, and pays nothing. The real path asks the visitor's wallet to sign, after a static call
 * so that a refusal by the bureau arrives as a sentence instead of a failed transaction.
 */
export default function HirePanel({
  agentId,
  premiumBps,
  care,
}: {
  agentId: bigint;
  premiumBps: bigint;
  care: Care;
}) {
  const [amount, setAmount] = useState("0.05");
  const [days, setDays] = useState(7);
  const [account, setAccount] = useState<{ address: string; balance: bigint }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState<HireResult>();

  const value = Number(amount);
  const valid = Number.isFinite(value) && value > 0;
  const fee = valid ? (value * Number(premiumBps)) / 10_000 : 0;
  const held = valid ? value - fee : 0;

  async function onConnect() {
    setError(undefined);
    setBusy(true);
    try {
      setAccount(await connect());
    } catch (e) {
      setError(readableError(e));
    } finally {
      setBusy(false);
    }
  }

  async function onHire() {
    setError(undefined);
    setBusy(true);
    try {
      setDone(await hire(agentId, presetOf(care).params, amount, days));
    } catch (e) {
      setError(readableError(e));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="hire hire-done">
        <p className="hire-done-title">You hired agent #{agentId.toString()}.</p>
        <p className="small">
          {formatEther(done.premiumPaid)} tCTC went to the agent's owner as the protection fee.{" "}
          {formatEther(done.heldInEscrow)} tCTC is held by the escrow contract and is yours until you confirm the work
          or the deadline passes.
        </p>
        <a
          className="btn btn-line"
          href={`${CC3_TESTNET.explorer}/tx/${done.hash}`}
          target="_blank"
          rel="noreferrer noopener"
        >
          See it on Creditcoin
          <ExternalLink size={13} strokeWidth={2} />
        </a>
      </div>
    );
  }

  return (
    <div className="hire">
      <div className="hire-fields">
        <label className="field">
          <span className="field-label">What is the job worth?</span>
          <span className="field-input">
            <input
              type="number"
              min="0.001"
              step="0.001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              aria-describedby={`split-${agentId}`}
            />
            <span className="field-unit">tCTC</span>
          </span>
        </label>

        <label className="field">
          <span className="field-label">Refund me if unfinished after</span>
          <span className="field-input">
            <input
              type="number"
              min="1"
              max="90"
              step="1"
              value={days}
              onChange={(e) => setDays(Math.max(1, Number(e.target.value) || 1))}
            />
            <span className="field-unit">days</span>
          </span>
        </label>
      </div>

      <p className="hire-split num" id={`split-${agentId}`}>
        {valid ? (
          <>
            <strong>{fee.toFixed(4)} tCTC</strong> protection fee to the agent's owner now ·{" "}
            <strong>{held.toFixed(4)} tCTC</strong> held until you confirm the work
          </>
        ) : (
          <>Enter an amount to see how it splits.</>
        )}
      </p>

      {!hasWallet() ? (
        <>
          <p className="notice notice-quiet">
            <strong>Preview.</strong> The split above is the fee this contract just quoted for these settings, applied
            to your amount. Paying it needs a wallet in this browser; nothing here spends anything.
          </p>
          <a className="btn btn-line" href="https://docs.creditcoin.org" target="_blank" rel="noreferrer noopener">
            How to get a wallet and test tCTC
            <ExternalLink size={13} strokeWidth={2} />
          </a>
        </>
      ) : !account ? (
        <>
          <p className="notice notice-quiet">
            <strong>Preview.</strong> This is what you would pay. Connect a wallet to do it for real on the Creditcoin
            test network, where the coins are free.
          </p>
          <button type="button" className="btn btn-ink" onClick={onConnect} disabled={busy}>
            <Wallet size={14} strokeWidth={2} />
            {busy ? "Waiting for your wallet…" : "Connect a wallet"}
          </button>
        </>
      ) : (
        <>
          <p className="small">
            Connected as <span className="mono">{account.address.slice(0, 6)}…{account.address.slice(-4)}</span>, holding{" "}
            <span className="num">{Number(formatEther(account.balance)).toFixed(3)}</span> tCTC.
          </p>
          {account.balance === 0n && (
            <p className="notice notice-quiet">
              This wallet has no tCTC yet. Test coins are free: ask the Creditcoin faucet for some, then come back.
            </p>
          )}
          <button type="button" className="btn btn-ink" onClick={onHire} disabled={busy || !valid || account.balance === 0n}>
            {busy ? "Waiting for your wallet…" : `Pay ${amount} tCTC and hire`}
          </button>
        </>
      )}

      {error && <p className="notice notice-error">{error}</p>}
    </div>
  );
}
