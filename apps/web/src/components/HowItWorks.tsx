import { useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { CC3_TESTNET, DEPLOYMENT, type NetworkStatus } from "../lib/chain";

/**
 * The section a judge or an engineer goes to. Plain language on top, exact mechanism underneath,
 * and commands they can run themselves. No rubric, no self-assessment.
 */
export default function HowItWorks({ net }: { net?: NetworkStatus }) {
  const [open, setOpen] = useState(false);

  const contracts: [string, string, string][] = [
    ["The bureau", "Holds the proven facts. No owner, no upgrade switch, no way to edit a fact.", DEPLOYMENT.facts],
    ["The escrow", "Turns those facts into a fee and refuses agents whose record has holes.", DEPLOYMENT.escrow],
    ["The bounty", "Pays anyone whose proof changes a decision, in either direction.", DEPLOYMENT.bounty],
  ];

  return (
    <section className="band" id="how">
      <div className="shell">
        <h2 className="section-title">How a fact gets in</h2>

        <div className="how-grid">
          <div className="prose">
            <p className="lede band-lede">
              The registry is on Ethereum. Tinjau is on Creditcoin. Nothing is copied between them and no one is
              trusted to carry the news across: instead, Creditcoin can be shown a proof that a particular Ethereum
              transaction really happened, and it checks that proof itself, inside the contract, in the same breath as
              recording it.
            </p>
            <p className="lede band-lede">
              That check is the whole product. Take it away and Tinjau has nothing but hearsay, which is exactly what
              the registry already offers. It is also why the facts here cannot be faked by us: we cannot add a review
              that nobody wrote, and we cannot delete one that somebody did.
            </p>
          </div>

          <ol className="flow">
            <li className="flow-step">
              <span className="flow-where label">On Ethereum</span>
              <span className="flow-what">Someone writes a review, or registers an agent. It is now a transaction that
              cannot be unsent.</span>
            </li>
            <li className="flow-step">
              <span className="flow-where label">Crossing over</span>
              <span className="flow-what">Anyone can build a proof that this exact transaction sits in an Ethereum
              block Creditcoin's attestors have already signed off on.</span>
            </li>
            <li className="flow-step">
              <span className="flow-where label">On Creditcoin</span>
              <span className="flow-what">The bureau checks that proof itself before it stores anything, reads only the
              registry's own events out of it, and records who stood behind it.</span>
            </li>
          </ol>
        </div>

        <dl className="contracts">
          {contracts.map(([name, what, address]) => (
            <div className="contract" key={address}>
              <dt>
                <span className="contract-name">{name}</span>
                <a
                  className="mono contract-address"
                  href={`${CC3_TESTNET.explorer}/address/${address}`}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {address.slice(0, 8)}…{address.slice(-6)}
                  <ExternalLink size={11} strokeWidth={2} />
                </a>
              </dt>
              <dd className="small">{what}</dd>
            </div>
          ))}
        </dl>

        <button type="button" className="disclose" aria-expanded={open} onClick={() => setOpen(!open)}>
          <ChevronDown size={14} strokeWidth={2} className={`disclose-caret${open ? " is-open" : ""}`} />
          {open ? "Hide the mechanism" : "Show the exact mechanism, and check it yourself"}
        </button>

        {open && (
          <div className="mechanism">
            <ul className="mechanism-list">
              <li>
                <span className="mono">0x0FD2</span> verifies every proof against Creditcoin's own record of Ethereum
                block headers, inside <span className="mono">record()</span>. A proof that does not check out is
                rejected, not stored. Cost ranges from 62,292 gas for a recent transaction to 631,434 for one mined in
                March 2022, because older transactions need more header roots.
              </li>
              <li>
                <span className="mono">0x0FD3</span> reports how far Creditcoin's attestors have read Ethereum
                {net ? (
                  <>
                    {" "}
                    (block <span className="num">{Number(net.attestedTip).toLocaleString("en-US")}</span> right now)
                  </>
                ) : null}
                , so a caller can refuse facts that lag behind.
              </li>
              <li>
                <span className="mono">0x0FD4</span> reports how many bonded attestors stood behind each fact, and that
                number is stored with the fact rather than assumed.
              </li>
              <li>
                Only logs emitted by the official registry addresses are read, and only from a transaction whose
                receipt says it succeeded. Everything else in the transaction is ignored.
              </li>
              <li>
                {net ? <span className="num">{net.admitted}</span> : "Every"} admitted transaction is a{" "}
                <span className="mono">TxAdmitted</span> event, so anyone can replay the whole bureau from Creditcoin
                alone and compare. We do exactly that, and the numbers match.
              </li>
            </ul>

            <p className="small mechanism-intro">Run these and you get the same answers this page shows:</p>
            <pre className="code">
              <code>{`cast call ${DEPLOYMENT.facts} \\
  'facts(uint64,uint256,uint64,uint32)' 3 50283 500000 2 \\
  --rpc-url ${CC3_TESTNET.rpc}

git clone https://github.com/k3cs/TinjauAI && cd TinjauAI && pnpm install
pnpm --filter @tinjau/scout scout verify 22771 50283 21548`}</code>
            </pre>
          </div>
        )}
      </div>
    </section>
  );
}
