import { useState } from "react";
import { formatEther } from "ethers";
import { Droplets, ExternalLink, Wallet } from "lucide-react";
import { CC3_TESTNET } from "../lib/chain";
import { readableError } from "../lib/wallet";
import { useWallet } from "../lib/useWallet";
import { Notice } from "./ui";

const FAUCET_DISCORD = "https://discord.gg/Gu43zTfmtc";
const FAUCET_DOCS = "https://docs.creditcoin.org/creditcoin-testnet/faucet";

/**
 * Everything on this page that moves money needs the same two things: a wallet on Creditcoin CC3
 * testnet, and test coins in it. Hiring an agent, funding a bounty and a scout claiming one are all
 * paid in tCTC, which is free, so the faucet sits next to the connect button rather than being
 * something the visitor has to go and find.
 */
export default function WalletBar() {
  const { account, hasWallet, connect } = useWallet();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [openFaucet, setOpenFaucet] = useState(false);

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

  const low = account && account.balance < 10_000_000_000_000_000n; // under 0.01 tCTC

  return (
    <div className="walletbar">
      <div className="walletbar-row">
        <div className="walletbar-state">
          {account ? (
            <>
              <span className="walletbar-label small">Connected on Creditcoin CC3 testnet</span>
              <span className="walletbar-account">
                <span className="mono">
                  {account.address.slice(0, 6)}…{account.address.slice(-4)}
                </span>
                <span className="mono num walletbar-balance">{Number(formatEther(account.balance)).toFixed(3)} tCTC</span>
              </span>
            </>
          ) : (
            <>
              <span className="walletbar-label small">Not connected</span>
              <span className="small muted">
                Reading the bureau needs nothing. Hiring an agent, funding a bounty or claiming one needs a wallet and
                some test coins, both free.
              </span>
            </>
          )}
        </div>

        <div className="walletbar-actions">
          {!account && (
            <button type="button" className="btn btn-primary btn-sm" onClick={onConnect} disabled={busy || !hasWallet}>
              <Wallet size={15} strokeWidth={2} aria-hidden="true" />
              {busy ? "Waiting for your wallet…" : hasWallet ? "Connect wallet" : "No wallet in this browser"}
            </button>
          )}
          <button
            type="button"
            className={`btn btn-secondary btn-sm${openFaucet ? " is-on" : ""}`}
            onClick={() => setOpenFaucet(!openFaucet)}
            aria-expanded={openFaucet}
          >
            <Droplets size={15} strokeWidth={2} aria-hidden="true" />
            Get test tCTC
          </button>
        </div>
      </div>

      {low && (
        <Notice tone="quiet">
          This wallet is almost empty. Ask the faucet for test coins before hiring or funding anything.
        </Notice>
      )}

      {openFaucet && (
        <div className="faucet expand">
          <p className="small">
            tCTC is the test coin of Creditcoin CC3 testnet. It is free and worth nothing; it exists so a hire, a bounty
            and a scout's claim can be real transactions. Two ways to get some:
          </p>
          <ol className="faucet-steps small">
            <li>
              Open the Creditcoin Discord and run <span className="mono">/faucet address: {account ? `${account.address.slice(0, 6)}…${account.address.slice(-4)}` : "your address"}</span> in the faucet
              channel.
            </li>
            <li>Or follow the faucet page in the Creditcoin documentation, which lists the current sources.</li>
          </ol>
          <div className="faucet-links">
            <a className="btn btn-secondary btn-sm" href={FAUCET_DISCORD} target="_blank" rel="noreferrer noopener">
              Creditcoin Discord
              <ExternalLink size={13} strokeWidth={2} aria-hidden="true" />
            </a>
            <a className="btn btn-secondary btn-sm" href={FAUCET_DOCS} target="_blank" rel="noreferrer noopener">
              Faucet documentation
              <ExternalLink size={13} strokeWidth={2} aria-hidden="true" />
            </a>
            <a
              className="btn btn-secondary btn-sm"
              href={`${CC3_TESTNET.explorer}/address/${account?.address ?? ""}`}
              target="_blank"
              rel="noreferrer noopener"
            >
              {account ? "See this wallet on Creditcoin" : "Creditcoin explorer"}
              <ExternalLink size={13} strokeWidth={2} aria-hidden="true" />
            </a>
          </div>
          <p className="small faint">
            Your wallet must be on Creditcoin CC3 testnet, chain id 102031. Connecting here adds the network for you if
            it is missing.
          </p>
        </div>
      )}

      {error && <Notice tone="error">{error}</Notice>}
    </div>
  );
}
