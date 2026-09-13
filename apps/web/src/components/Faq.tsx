import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { href } from "../lib/router";

interface Qa {
  q: string;
  a: string;
}

/**
 * Two audiences ask two kinds of questions. Judges ask what the hackathon's own criteria ask
 * (depth of Attestcoin use, is it load-bearing, track fit, originality, what is live); visitors ask
 * what anyone asks a page that is about to touch their money. Every answer is a fact that appears
 * elsewhere on the site or in the repository; nothing here is a claim the contracts cannot back.
 */
const JUDGES: Qa[] = [
  {
    q: "How deeply does Tinjau use the Attestcoin Protocol?",
    a: "Every fact enters the bureau contract only through an Attestcoin proof of an Ethereum transaction. Inside the contract: the BlockProver verifies each proof, single or as a batch that stands or falls together; the receipt is decoded with the official decoder and only events from the official ERC-8004 registries count; conflicting facts resolve in Ethereum's own order (block, transaction, log); the attestor count and the attested tip are read from the precompiles and stored with each fact; proven history reaches back to March 2022. Anyone can replay every admitted proof from chain data and get the same numbers.",
  },
  {
    q: "Is Attestcoin load-bearing, or could a server do the same?",
    a: "Take the proof away and the contract would have to trust whoever calls it, which makes Tinjau one more signed off-chain aggregator, exactly what the ERC-8004 spec already leaves consumers to trust. With Attestcoin a Creditcoin contract checks Ethereum history itself and can lock money on it: the escrow refuses a hire the moment a reviewer's record has holes, and the bounty pays only when new proofs flip the decision.",
  },
  {
    q: "Which track, and why does it fit?",
    a: "AI. The track asks for apps that process cryptographically verified cross-chain data to inform decisions and trigger on-chain transactions without centralized oracle operators. Here the data is Ethereum registry history verified by Attestcoin, the decision is the hire verdict and fee, and the transactions (bounty claim, hire, release) are triggered by an autonomous scout with no oracle in the path. A language model reads free-form review documents for payment claims, and the proof system, not the model, decides whether each claim is true.",
  },
  {
    q: "What is real and live today?",
    a: "Three verified contracts on Creditcoin CC3 testnet, 33 Ethereum mainnet transactions admitted at the time of writing (the count on this page is read live), two agents hired at 1%, one refused as held, a bounty funded and claimed by the scout in one transaction, and the same proof verified on CC3 mainnet. The scout keeps running every three hours until the deadline, so every count here is a floor.",
  },
  {
    q: "What is new compared with other reputation projects?",
    a: "Not the signals (wallet age, clones exist elsewhere). New: a contract verifies them from proofs instead of an API; completeness comes from the registry's own review numbering, so withheld reviews show as known gaps; ownership and clone facts come from proven registration events; bounties pay only for decision-changing evidence, in either direction; and the whole bureau can be replayed from chain data. Other entries read the same registry to lend to agents; Tinjau tests the integrity of the evidence itself before money moves.",
  },
  {
    q: "Is this original work made during the hackathon?",
    a: "Yes. The repository was rebuilt from an empty tree on 11 September 2026 and every contract, the scout, the servers and this site were written during BUIDL CTC 2026 Fall. Vendored and not written by us: the official Attestcoin decoder and verifier interfaces, and forge-std.",
  },
];

const VISITORS: Qa[] = [
  {
    q: "Is this a score?",
    a: "No. Tinjau never rates an agent. It stores facts that were proven from Ethereum, names the evidence that is still missing, and lets you choose how careful to be. \"Passes your settings\" and \"Held\" are the escrow contract's own answers to the thresholds you picked, and they change when you change them.",
  },
  {
    q: "What does \"Held\" mean?",
    a: "The contract would refuse to hire this agent. Usually a reviewer's reviews are only partly proven: the registry numbers each reviewer's reviews, so if review #97 is proven and #1 to #96 are not, someone could be showing the good ones and holding the bad ones back. No setting opens that gate; proving the missing reviews does, and anyone can fund a bounty to get that done.",
  },
  {
    q: "Where do the facts come from, and can they be faked?",
    a: "From transactions on Ethereum mainnet: registrations, reviews, revocations and each reviewer's own history. Anyone can bring a proof to the contract, but nobody can invent one: the verifier inside the contract rejects anything that is not a real, attested Ethereum transaction, and only events from the official registry count. A dishonest submitter can only withhold, and the registry's numbering shows the hole.",
  },
  {
    q: "Who pays the fee, and where does my money go?",
    a: "When you hire, the protection fee goes to the agent's owner immediately (1% for a clean record, up to 20%), and the rest sits in the escrow contract until you confirm the work or the deadline passes, when it comes back to you. On a 0.1 tCTC job at 1%, 0.001 tCTC goes to the owner now.",
  },
  {
    q: "What is a scout, and what is a bounty?",
    a: "A scout is a program that carries proofs to the contract. Ours runs every three hours; anyone can run their own with any strategy. A bounty is money you put on the table for proof that changes an agent's verdict under your settings. The contract pays it only when a claim actually flips the decision, and evidence against an agent pays exactly as much as evidence for it.",
  },
  {
    q: "Is real money at stake?",
    a: "Not yet. This runs on the Creditcoin test network, where the coins are free. The registry being read is the live one on Ethereum mainnet, and the same proofs already verify on Creditcoin mainnet.",
  },
  {
    q: "Why only Ethereum mainnet?",
    a: "Attestcoin reads Ethereum today; most agent activity has moved to networks it cannot prove from yet, so those agents cannot be checked here. The Sepolia test registry was excluded on purpose: its entries cost nothing to mint, so admitting them would let anyone fabricate a record for free.",
  },
  {
    q: "Can I check these numbers myself?",
    a: "Yes. Every admitted transaction is public on Creditcoin, and the repository ships a command that replays all of them from chain data and compares with the contract. The contract addresses are in the footer; the source is linked there too.",
  },
];

export default function Faq({ embedded = false }: { embedded?: boolean }) {
  return (
    <section className={`faq${embedded ? " faq-embedded" : " section"}`} id="faq">
      <div className="shell faq-grid">
        {!embedded && (
          <div className="faq-intro">
            <h2 className="section-title">Questions people ask before they trust a page like this.</h2>
            <p className="muted">
              The first group is what the hackathon's judges ask; the second is what anyone asks before letting a page
              near their money. Every answer points at something you can open.
            </p>
            <a className="btn btn-secondary" href={href.compare([22771n, 50283n])}>
              See it on two real agents
            </a>
          </div>
        )}
        <div className="faq-lists">
          <FaqList title="For judges" items={JUDGES} />
          <FaqList title="For visitors" items={VISITORS} />
        </div>
      </div>
    </section>
  );
}

function FaqList({ title, items }: { title: string; items: Qa[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="faq-list">
      <h3 className="faq-list-title">{title}</h3>
      <ul>
        {items.map((it, i) => {
          const on = open === i;
          return (
            <li key={it.q} className={`faq-item${on ? " is-open" : ""}`}>
              <button type="button" className="faq-q" aria-expanded={on} onClick={() => setOpen(on ? null : i)}>
                <span>{it.q}</span>
                <ChevronDown size={16} strokeWidth={2} className={`disclose-caret${on ? " is-open" : ""}`} aria-hidden="true" />
              </button>
              <div className="faq-a" aria-hidden={!on}>
                <div className="faq-a-inner">
                  <p className="muted">{it.a}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
