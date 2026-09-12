# Tinjau — product context

## What it is

A marketplace for hiring AI agents that runs a credit check before you pay. The agents are real:
19,000+ are registered on the ERC-8004 registry on Ethereum mainnet, and they already hire and pay
each other. Tinjau is the bureau standing between a hirer and that registry. It admits no fact about
an agent unless an Attestcoin proof of an Ethereum transaction backs it, and it publishes no score:
the hirer sets the thresholds, the contract answers with facts, and the escrow prices the risk.

## Who this surface is for

**Primary: someone who knows nothing about any of this.** They do not know what ERC-8004 is, what a
transaction hash is, or why agent reviews would be fake. The page owes them the problem first, then a
tool they can actually use. Half of the job is explaining; half is a working marketplace.

**Secondary: BUIDL CTC 2026 Fall judges.** They arrive to assess depth of Attestcoin use, whether the
integration is load-bearing, track fit (AI), real-world value to the Creditcoin ecosystem, and
differentiation. They must be able to reach the evidence, but they are not the reason the page exists.

## The primary action

Hire an agent, for real, with the visitor's own wallet on Creditcoin CC3 testnet. Two entry paths,
both first-class:

1. **Preview** — no wallet. Every threshold and every decision is computed from the deployed contract
   through plain reads, so the outcome shown is the real one. Nothing is paid. Labelled as a preview.
2. **Real** — connect a wallet, add CC3 testnet, pay in tCTC. `hire()` is payable: the premium goes to
   the agent's owner immediately, the rest is held in escrow until the hirer confirms the work.

The blocked path matters as much as the happy path. For an agent whose record has holes the contract
reverts `Gated`, and the page must stop the visitor before they sign, in their own language.

## What must be true

- No score. Ever. A verdict shown on screen is always "by your settings", never Tinjau's opinion.
- No jargon on the first layer. No `breadthGrounded`, `gapCount`, `cloneDensityLB`, `bps`, `chainKey`,
  `precompile`, no bare hashes. Those exist one click down, under plain-language sentences.
- Every number on screen is recomputable by the reader, and the page says how.
- Never show stale numbers as live. If the RPC fails, say so where the numbers would have been.
- Money is stated in money terms, with an example: "1% — on a 0.1 tCTC job, you pay 0.001 tCTC".
- No private key in the frontend, ever.

## Content the page carries

Live from `GroundedFacts`, `AgentHireEscrow` and `CoverageBounty` on CC3 testnet (chainId 102031) over
a public RPC that allows browser origins (verified: `access-control-allow-origin: *`). A committed
snapshot (`public/demo/facts.json`) covers agents 22771, 21548, 50283 with reviewers, per-fact evidence
including Etherscan URLs, rejected evidence with reasons, and scout run logs.

Ranges to design for: 1–6 agents listed; 0–35 reviewers per agent (the contract examines at most 256);
0–8 pieces of evidence per fact; reviewer addresses and tx hashes always need truncation.

## Constraints

- Deadline 14 Sep 2026 10:59 WIB. Video is recorded after the UI freezes, so the UI must freeze early.
- Static build, deployed to Vercel. No server required for the page to work.
- The scout keeps admitting proofs every three hours until the deadline, so counts grow while the page
  is live. Every count is labelled with the block it was read at.
