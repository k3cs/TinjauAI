import { useState } from "react";
import { formatEther } from "ethers";
import { ExternalLink, Wallet } from "lucide-react";
import { CC3_TESTNET } from "../lib/chain";
import { presetOf, type Care } from "../lib/params";
import { hire, readableError, type HireResult } from "../lib/wallet";
import { useWallet } from "../lib/useWallet";
import { Notice } from "./ui";

/**
 * Two ways through, both honest. Preview does the same arithmetic the contract does on the fee it
 * just quoted, and pays nothing. The real path asks the visitor's wallet to sign, after a static call
 * so that a refusal by the bureau arrives as a sentence instead of a failed transaction.
 */
export default function HirePanel({ agentId, premiumBps, care }: { agentId: bigint; premiumBps: bigint; care: Care }) {
  const [amount, setAmount] = useState("0.05");
  const [days, setDays] = useState(7);
  const { account, hasWallet, connect, refresh } = useWallet();
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
      await connect();
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
      void refresh();
    } catch (e) {
      setError(readableError(e));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="panel panel-done">
        <p className="panel-done-title">You hired agent #{agentId.toString()}.</p>
        <p className="small muted">
          {formatEther(done.premiumPaid)} tCTC went to the agent's owner as the protection fee. {formatEther(done.heldInEscrow)} tCTC
          is held by the escrow contract and is yours until you confirm the work or the deadline passes.
        </p>
        <a className="btn btn-secondary btn-sm" href={`${CC3_TESTNET.explorer}/tx/${done.hash}`} target="_blank" rel="noreferrer noopener">
          See it on Creditcoin
          <ExternalLink size={13} strokeWidth={2} aria-hidden="true" />
        </a>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <h4 className="panel-title">Hire this agent</h4>
        <p className="small muted">
          The fee goes to the agent's owner the moment you pay; the rest waits in escrow until you confirm the work,
          or comes back to you after the deadline.
        </p>
      </div>

      <div className="fields">
        <label className="field">
          <span className="field-label">What is the job worth?</span>
          <span className="field-input">
            <input type="number" min="0.001" step="0.001" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" aria-describedby={`split-${agentId}`} />
            <span className="field-unit">tCTC</span>
          </span>
        </label>
        <label className="field">
          <span className="field-label">Refund me if unfinished after</span>
          <span className="field-input">
            <input type="number" min="1" max="90" step="1" value={days} onChange={(e) => setDays(Math.max(1, Number(e.target.value) || 1))} />
            <span className="field-unit">days</span>
          </span>
        </label>
      </div>

      <p className="split mono num" id={`split-${agentId}`}>
        {valid ? (
          <>
            <strong>{fee.toFixed(4)} tCTC</strong> fee to the owner now · <strong>{held.toFixed(4)} tCTC</strong> held until you confirm
          </>
        ) : (
          <>Enter an amount to see how it splits.</>
        )}
      </p>

      {!hasWallet ? (
        <>
          <Notice tone="quiet">
            <strong>Preview.</strong> The split above is the fee this contract just quoted for your settings, applied to
            your amount. Paying it needs a wallet in this browser; nothing here spends anything.
          </Notice>
          <a className="btn btn-secondary btn-sm" href="https://docs.creditcoin.org" target="_blank" rel="noreferrer noopener">
            How to get a wallet and test tCTC
            <ExternalLink size={13} strokeWidth={2} aria-hidden="true" />
          </a>
        </>
      ) : !account ? (
        <>
          <Notice tone="quiet">
            <strong>Preview.</strong> This is what you would pay. Connect a wallet to do it for real on the Creditcoin test
            network, where the coins are free.
          </Notice>
          <button type="button" className="btn btn-primary" onClick={onConnect} disabled={busy}>
            <Wallet size={15} strokeWidth={2} aria-hidden="true" />
            {busy ? "Waiting for your wallet…" : "Connect a wallet"}
          </button>
        </>
      ) : (
        <>
          <p className="small muted">
            Connected as <span className="mono">{account.address.slice(0, 6)}…{account.address.slice(-4)}</span>, holding{" "}
            <span className="mono num">{Number(formatEther(account.balance)).toFixed(3)}</span> tCTC.
          </p>
          {account.balance === 0n && (
            <Notice tone="quiet">This wallet has no tCTC yet. Test coins are free: ask the Creditcoin faucet, then come back.</Notice>
          )}
          <button type="button" className="btn btn-primary" onClick={onHire} disabled={busy || !valid || account.balance === 0n}>
            {busy ? "Waiting for your wallet…" : `Pay ${amount} tCTC and hire`}
          </button>
        </>
      )}

      {error && <Notice tone="error">{error}</Notice>}
    </div>
  );
}
