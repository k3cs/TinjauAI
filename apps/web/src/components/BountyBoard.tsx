import { useState } from "react";
import { formatEther } from "ethers";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { Notice, Skeleton, State } from "./ui";
import { NoBountyMark, OfflineMark } from "./illustrations/StateMarks";
import { CC3_TESTNET, type Bounty } from "../lib/chain";
import { claimBounty, readableError, type ClaimResult } from "../lib/wallet";
import { useWallet } from "../lib/useWallet";
import { href } from "../lib/router";

/**
 * The supply side, on the same page as the demand side. A visitor who just saw an agent held can
 * scroll to the money waiting for the proof that would unhold it, and try to earn it without leaving
 * the browser: bring the Ethereum transactions you believe change the answer, and the contract admits
 * them and pays only if a decision actually flipped.
 */
export default function BountyBoard({
  bounties,
  failed,
  total,
  onClaimed,
}: {
  /** Undefined while the contract is still being read. */
  bounties?: Bounty[];
  failed: boolean;
  total: bigint;
  onClaimed: () => void;
}) {
  return (
    <section className="board" id="bounties">
      <div className="board-head">
        <div>
          <h2 className="sr-only">Open bounties</h2>
          <p className="lede">
            Money waiting for proof. Bring the Ethereum transactions you think change an agent's answer; the contract
            pays only if a decision flips, and evidence against an agent pays the same as evidence for it.{" "}
            <a href={href.dev}>Run a scout instead</a>.
          </p>
        </div>
        {bounties && bounties.length > 0 && (
          <span className="small muted board-total">
            {bounties.length} open · <span className="mono num">{Number(formatEther(total)).toFixed(3)} tCTC</span> waiting
          </span>
        )}
      </div>

      {failed && (
        <State tone="error" mark={<OfflineMark />}>
          <p>
            <strong>Creditcoin is not answering.</strong>
          </p>
          <p className="small">The open bounties cannot be read, so none are shown. Reload in a moment.</p>
        </State>
      )}

      {!bounties && !failed && (
        <ul className="bounties" aria-hidden="true">
          {Array.from({ length: 2 }, (_, i) => (
            <li className="bounty-card" key={i}>
              <div className="bounty-skel">
                <Skeleton w="8rem" h="1.5rem" />
                <Skeleton w="60%" />
                <Skeleton w="100%" />
                <Skeleton w="9rem" h="1.75rem" radius="10px" />
              </div>
            </li>
          ))}
        </ul>
      )}

      {bounties && bounties.length === 0 && (
        <State mark={<NoBountyMark />}>
          <p>Nothing is open right now.</p>
          <p className="small">
            Put money on an agent's missing proof from any listing above: press <strong>Bounty</strong> on a listing and
            name what you want proven. Whoever finds it gets paid, whichever way the answer moves.
          </p>
        </State>
      )}

      {bounties && bounties.length > 0 && (
        <ul className="bounties">
          {bounties.map((b) => (
            <BountyCard key={b.id.toString()} bounty={b} onClaimed={onClaimed} />
          ))}
        </ul>
      )}
    </section>
  );
}

function BountyCard({ bounty, onClaimed }: { bounty: Bounty; onClaimed: () => void }) {
  const { account, hasWallet, refresh } = useWallet();
  const [open, setOpen] = useState(false);
  const [hashes, setHashes] = useState<string[]>([""]);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<string>();
  const [error, setError] = useState<string>();
  const [done, setDone] = useState<ClaimResult>();

  const valid = hashes.filter((h) => /^0x[0-9a-fA-F]{64}$/.test(h.trim()));
  const expiry = new Date(Number(bounty.expiry) * 1000);

  async function onClaim() {
    setError(undefined);
    setBusy(true);
    try {
      setDone(await claimBounty(bounty.id, valid.map((h) => h.trim()), bounty.chainKey, setStage));
      void refresh();
      onClaimed();
    } catch (e) {
      setError(readableError(e));
    } finally {
      setBusy(false);
      setStage(undefined);
    }
  }

  return (
    <li className="bounty-card">
      <div className="bounty-head">
        <div>
          <h3 className="bounty-amount mono num">{Number(formatEther(bounty.amount)).toFixed(3)} tCTC</h3>
          <p className="small muted">
            for proof that changes the answer on agent <span className="mono">#{bounty.agentId.toString()}</span>
          </p>
        </div>
        <dl className="bounty-terms small">
          <div>
            <dt className="faint">Reviewers wanted</dt>
            <dd className="mono num">{bounty.k.toString()}</dd>
          </div>
          <div>
            <dt className="faint">Look-alike limit</dt>
            <dd className="mono num">{bounty.c.toString()}</dd>
          </div>
          <div>
            <dt className="faint">Closes</dt>
            <dd className="mono">{expiry.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</dd>
          </div>
        </dl>
      </div>

      <p className="small muted bounty-explain">
        It pays when, under those terms, the verified-reviewer count, the gap, the look-alike count or the presence of a
        negative review changes because of the proofs in your call. Funded by{" "}
        <span className="mono">
          {bounty.funder.slice(0, 6)}…{bounty.funder.slice(-4)}
        </span>
        .
      </p>

      {done ? (
        <div className="panel-done">
          <p className="panel-done-title">Paid. {Number(formatEther(bounty.amount)).toFixed(3)} tCTC is yours.</p>
          <p className="small muted">Your proofs changed the answer, so the contract released the bounty in the same call.</p>
          <a className="btn btn-secondary btn-sm" href={`${CC3_TESTNET.explorer}/tx/${done.hash}`} target="_blank" rel="noreferrer noopener">
            See it on Creditcoin
            <ExternalLink size={13} strokeWidth={2} aria-hidden="true" />
          </a>
        </div>
      ) : (
        <>
          <button type="button" className={`btn btn-primary btn-sm${open ? " is-on" : ""}`} onClick={() => setOpen(!open)}>
            {open ? "Close" : "Claim it with proof"}
          </button>

          {open && (
            <div className="claim expand">
              <p className="small muted">
                Paste the Ethereum transaction hashes you want proven: a review, a registration, a reviewer's oldest
                transaction. Tinjau fetches the Attestcoin proof for each and submits them together; the contract
                verifies them itself and pays only on a change.
              </p>

              {hashes.map((h, i) => (
                <div className="claim-row" key={i}>
                  <span className="field-input">
                    <input
                      value={h}
                      onChange={(e) => setHashes(hashes.map((x, j) => (j === i ? e.target.value : x)))}
                      placeholder="0x…"
                      spellCheck={false}
                      aria-label={`Ethereum transaction hash ${i + 1}`}
                    />
                  </span>
                  {hashes.length > 1 && (
                    <button type="button" className="icon-btn" onClick={() => setHashes(hashes.filter((_, j) => j !== i))} aria-label={`Remove hash ${i + 1}`}>
                      <Trash2 size={15} strokeWidth={2} aria-hidden="true" />
                    </button>
                  )}
                </div>
              ))}

              <div className="claim-actions">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setHashes([...hashes, ""])} disabled={hashes.length >= 4}>
                  <Plus size={14} strokeWidth={2.25} aria-hidden="true" />
                  Another transaction
                </button>
                <button type="button" className="btn btn-primary btn-sm" onClick={onClaim} disabled={busy || !account || valid.length === 0}>
                  {busy ? (stage ?? "Working…") : `Submit ${valid.length || ""} proof${valid.length === 1 ? "" : "s"} and claim`}
                </button>
              </div>

              {!hasWallet && <Notice tone="quiet">Claiming needs a wallet in this browser. Reading costs nothing.</Notice>}
              {hasWallet && !account && <Notice tone="quiet">Connect a wallet at the top of this page to claim. Test coins are free.</Notice>}
              {error && <Notice tone="error">{error}</Notice>}
            </div>
          )}
        </>
      )}
    </li>
  );
}
