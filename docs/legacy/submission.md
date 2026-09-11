# DoraHacks submission text

Field names follow the DoraHacks form for BUIDL CTC 2026 Fall. Deadline: 13 Sep 2026 23:59 ET (14 Sep 10:59 WIB). Personal team data (email, country, citizenship) is kept outside this public repo.

**Project name:** Tinjau

**Project sector:** AI (secondary: DeFi)

**One-liner (≤140 chars):** A credit bureau for AI agents: facts about ERC-8004 agents and reviewers, proven from Ethereum into Creditcoin. No score, no oracle.

**Project description (≤300 words):**
Creditcoin began as a credit history for borrowers that banks cannot see. AI agents are the next such borrowers. Over 19,000 are registered on the ERC-8004 registry on Ethereum mainnet, other agents hire and pay them, and nothing a contract can check says which ones deserve trust. Read raw, the registry misleads: 346 of 367 rated agents have one reviewer, one wallet wrote 225 reviews, 16 of 105 reviewers own agents and wrote 59% of all feedback, and owners holding ten or more agents made 83% of the last 60 days' registrations. The standard's answer is to trust an off-chain aggregator.

Tinjau is the bureau. Its Creditcoin contract, `GroundedFacts`, admits data only through Attestcoin proofs of Ethereum transactions. From proven `NewFeedback`, `FeedbackRevoked`, `Registered` and `Transfer` events, plus any proven transaction as evidence of a reviewer's activity, it records which reviews exist, how long each reviewer was active before reviewing, whether review indices have gaps, whether a reviewer owns agents, and how many agents share an owner, registrant, URI or minting transaction. It computes no score. The party taking the risk passes its own thresholds and gets numbers anyone can recompute from the same proofs.

Two example consumers turn facts into money without a reserve or an oracle. `AgentHireEscrow` prices the hire: its premium is the agent's cost of credit, paid to the agent's owner. `CoverageBounty` pays whoever submits proofs that change a consumer's decision, in either direction. `GroundedScout`, the autonomous agent, picks targets, gathers evidence that helps and evidence that hurts, skips proofs already admitted, proves only when the bounty covers gas, and hires or funds bounties on its own thresholds.

Limits: Ethereum-side registries only; a review nobody has submitted is invisible; clone density is a lower bound; no consumer contract exists on Creditcoin yet.

**Attestcoin Protocol Integration Summary:** paste `ATTESTCOIN_INTEGRATION.md` (repo root) in full.

**GitHub repository:** https://github.com/k3cs/TinjauAI

**Project deck (PDF):** https://github.com/k3cs/TinjauAI/blob/main/docs/deck.pdf

**Prototype demo video:** `<VIDEO_URL>` (recorded after the frontend is final; see `docs/demo-script.md`)

**Live app:** https://k3cs.github.io/TinjauAI/

**Contracts (Creditcoin CC3 Testnet, verified on Blockscout):** GroundedFacts `0x47212CE74EA4D6e300922AeB389A7b0a9D81Aabc` · AgentHireEscrow `0x153201A94E83AB5aA1C64f095375F2916EDA9F98` · CoverageBounty `0xBaAEAb3f635D39F6a9019745270Daf1812E0aE70`

**Team:** solo. Dien, builder (product, Solidity, TypeScript; previously built Veritas, UHI9). Form fields per member (first and last name, email, country of residence, country of citizenship, short bio, role) are filled directly in DoraHacks by Dien.
