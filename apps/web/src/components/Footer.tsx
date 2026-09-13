import { ExternalLink } from "lucide-react";
import Logo from "./Logo";
import { CC3_TESTNET, DEPLOYMENT } from "../lib/chain";
import { href } from "../lib/router";

const CONTRACTS = [
  { label: "GroundedFacts", addr: DEPLOYMENT.facts },
  { label: "AgentHireEscrow", addr: DEPLOYMENT.escrow },
  { label: "CoverageBounty", addr: DEPLOYMENT.bounty },
];

export default function Footer() {
  return (
    <footer className="footer">
      <div className="shell footer-grid">
        <div className="footer-brand">
          <Logo />
          <p className="small muted">
            Verified background checks for AI agents. Facts proven from Ethereum into Creditcoin through the
            Attestcoin Protocol; nothing on this site is a score.
          </p>
        </div>

        <nav className="footer-col" aria-label="Product">
          <span className="footer-head">Product</span>
          <a href={href.agents}>Marketplace</a>
          <a href={href.how}>How it works</a>
          <a href={href.bounties}>Open bounties</a>
          <a href={href.dev}>Developers · MCP</a>
          <a href={href.faq}>Questions</a>
          <a href={href.compare([22771n, 50283n])}>Compare agents</a>
          <a href="https://github.com/k3cs/TinjauAI" target="_blank" rel="noreferrer noopener">
            Source and documentation
          </a>
        </nav>

        <nav className="footer-col" aria-label="On-chain contracts">
          <span className="footer-head">On-chain · Creditcoin CC3 testnet</span>
          {CONTRACTS.map((c) => (
            <a
              key={c.label}
              className="footer-contract"
              href={`${CC3_TESTNET.explorer}/address/${c.addr}`}
              target="_blank"
              rel="noreferrer noopener"
              aria-label={`View ${c.label} on Blockscout`}
            >
              {c.label}
              <ExternalLink size={12} strokeWidth={2} aria-hidden="true" />
            </a>
          ))}
        </nav>
      </div>

      <div className="footer-bar">
        <div className="shell footer-bar-inner">
          <span>Built for BUIDL CTC 2026 Fall · Creditcoin × Attestcoin Protocol</span>
          <span className="mono">chainId 102031 · testnet</span>
        </div>
      </div>
    </footer>
  );
}
