# DoraHacks submission text (draft; isi placeholder setelah Task 3–9)

**Project name:** Tinjau (Grounded Agent Reputation)
**Sector / track:** AI (secondary: DeFi)

**One-liner (≤140 chars):** Facts about ERC-8004 agents and their reviewers, proven from Ethereum mainnet into a Creditcoin contract. No score, no oracle.

**Description (≤300 words):**
The ERC-8004 reputation registry on Ethereum mainnet is live, and nobody can read it raw: 346 of 367 rated agents have one reviewer, one wallet wrote 225 reviews, 16 of 105 reviewers own agents and wrote 59% of all feedback, and owners holding ten or more agents made 83% of the last 60 days' registrations. The standard answers: aggregate off-chain and trust the aggregator.

Tinjau is a Creditcoin contract, `GroundedFacts`, that admits data only through Attestcoin proofs of Ethereum transactions. From proven `NewFeedback`, `FeedbackRevoked`, `Registered` and `Transfer` events, plus any proven transaction as evidence of its sender's activity, it records facts: which reviews exist, how long each reviewer was active before reviewing, whether review indices have gaps, whether a reviewer owns agents, and how many agents share an owner, registrant, URI or minting transaction. It computes no score. Consumers pass their thresholds and get numbers anyone can recompute from the same proofs.

Two example consumers turn facts into money without a reserve or an oracle: `AgentHireEscrow` charges a premium paid to the agent, and `CoverageBounty` pays whoever submits proofs that change a consumer's decision, in either direction. `GroundedScout`, the autonomous agent, picks targets from open bounties and registry activity, gathers evidence that helps and evidence that hurts, skips proofs another scout already admitted, proves only when the bounty covers gas, and hires or funds bounties on its own thresholds.

Attestcoin depth: mainnet (chainKey 3) and Sepolia (chainKey 1) in one contract; a 2.5-year-old transaction verified on-chain (604 continuity roots, 414,624 gas); `calculateTxIndex` for deduplication; the official `EvmV1Decoder` for sender, status and log-address filtering; the registry's own `feedbackIndex` counter as a partial completeness oracle.

Limits: Ethereum-side registries only; a review nobody has submitted is invisible; clone density is a lower bound; no consumer contract exists on Creditcoin yet.

**Attestcoin Integration Summary:** (salin `ATTESTCOIN_INTEGRATION.md`)
**Repository:** `https://github.com/k3cs/TinjauAI` · **Demo video:** `<VIDEO_URL>` · **Deck:** `https://github.com/k3cs/TinjauAI/blob/main/docs/deck.pdf`
**Contracts (CC3 Testnet):** GroundedFacts `0x47212CE74EA4D6e300922AeB389A7b0a9D81Aabc` · AgentHireEscrow `0x153201A94E83AB5aA1C64f095375F2916EDA9F98` · CoverageBounty `0xBaAEAb3f635D39F6a9019745270Daf1812E0aE70`
**Team:** Dien (builder) — data per form DoraHacks (nama, email, negara, bio, peran).
