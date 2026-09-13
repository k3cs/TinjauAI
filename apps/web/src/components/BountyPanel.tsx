import { useState } from "react";
import { formatEther } from "ethers";
import { ExternalLink, Wallet } from "lucide-react";
import { CC3_TESTNET, type Bounty } from "../lib/chain";
import { presetOf, type Care } from "../lib/params";
import { fundBounty, readableError, type FundResult } from "../lib/wallet";
import { useWallet } from "../lib/useWallet";
import { Notice } from "./ui";

/**
 * Put money on the table for whoever can prove something that changes this agent's verdict. The
 * contract, not us, decides whether a claim earned it: only proofs that flip one of the four decision
 * parts get paid, and evidence against the agent pays exactly as much as evidence for it.
 */
export default function BountyPanel({
  agentId,
  care,
  open,
  onFunded,
}: {
  agentId: bigint;
  care: Care;
  open: Bounty[];
  onFunded?: () => void;
}) {
  const [amount, setAmount] = useState("0.05");
  const [days, setDays] = useState(7);
  const { account, hasWallet, connect, refresh } = useWallet();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState<FundResult>();
  const valid = Number.isFinite(Number(amount)) && Number(amount) > 0;

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

  async function onFund() {
    setError(undefined);
    setBusy(true);
    try {
      setDone(await fundBounty(agentId, presetOf(care).params, amount, days));
      void refresh();
      onFunded?.();
    } catch (e) {
      setError(readableError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <h4 className="panel-title">Pay for a better answer</h4>
        <p className="small muted">
          A bounty is a reward for proof. Any scout, ours or anyone's, can bring Ethereum transactions to the
          contract; it pays the bounty only if those proofs change the verdict under your settings. Proof that hurts
          the agent pays the same as proof that helps it. Proof that changes nothing pays nothing.
        </p>
      </div>

      {open.length > 0 && (
        <ul className="bounty-open">
          {open.map((b) => (
            <li key={b.id.toString()} className="bounty-row">
              <span className="mono num">{Number(formatEther(b.amount)).toFixed(3)} tCTC</span>
              <span className="small muted">
                open until {new Date(Number(b.expiry) * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                {" · "}bounty #{b.id.toString()}
              </span>
            </li>
          ))}
        </ul>
      )}

      {done ? (
        <div className="panel-done">
          <p className="panel-done-title">
            {formatEther(done.amount)} tCTC is now waiting for proof about agent #{agentId.toString()}.
          </p>
          <p className="small muted">
            Our scout checks open bounties every three hours and takes the ones its proofs can win. If nobody finds
            decision-changing proof before the deadline, you take the money back.
          </p>
          <a className="btn btn-secondary btn-sm" href={`${CC3_TESTNET.explorer}/tx/${done.hash}`} target="_blank" rel="noreferrer noopener">
            See it on Creditcoin
            <ExternalLink size={13} strokeWidth={2} aria-hidden="true" />
          </a>
        </div>
      ) : (
        <>
          <div className="fields">
            <label className="field">
              <span className="field-label">Reward</span>
              <span className="field-input">
                <input type="number" min="0.001" step="0.001" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
                <span className="field-unit">tCTC</span>
              </span>
            </label>
            <label className="field">
              <span className="field-label">Open for</span>
              <span className="field-input">
                <input type="number" min="1" max="90" step="1" value={days} onChange={(e) => setDays(Math.max(1, Number(e.target.value) || 1))} />
                <span className="field-unit">days</span>
              </span>
            </label>
          </div>

          {!hasWallet ? (
            <Notice tone="quiet">
              <strong>Preview.</strong> Funding a bounty needs a wallet in this browser. Nothing here spends anything.
            </Notice>
          ) : !account ? (
            <button type="button" className="btn btn-primary" onClick={onConnect} disabled={busy}>
              <Wallet size={15} strokeWidth={2} aria-hidden="true" />
              {busy ? "Waiting for your wallet…" : "Connect a wallet to fund it"}
            </button>
          ) : (
            <>
              <p className="small muted">
                Connected as <span className="mono">{account.address.slice(0, 6)}…{account.address.slice(-4)}</span>, holding{" "}
                <span className="mono num">{Number(formatEther(account.balance)).toFixed(3)}</span> tCTC.
              </p>
              <button type="button" className="btn btn-primary" onClick={onFund} disabled={busy || !valid || account.balance === 0n}>
                {busy ? "Waiting for your wallet…" : `Put ${amount} tCTC on the table`}
              </button>
            </>
          )}
          {error && <Notice tone="error">{error}</Notice>}
        </>
      )}
    </div>
  );
}
