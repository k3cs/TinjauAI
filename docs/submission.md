# DoraHacks submission text (v3)

Field names follow the BUIDL CTC 2026 Fall form. Deadline: 13 Sep 2026 23:59 ET (14 Sep 10:59 WIB). Personal team data (email, country, citizenship) is not kept in this public repo; Dien fills it in the form.

**Project name:** Tinjau

**Project sector:** AI (secondary: DeFi)

**One-liner (≤140 chars):** A credit bureau for AI agents: facts about ERC-8004 agents and reviewers, proven from Ethereum into Creditcoin. No score, no oracle.

**Project description (≤300 words):**
Creditcoin began as a credit history for borrowers that banks cannot see. AI agents are the next such borrowers: over 19,000 are registered on ERC-8004 on Ethereum mainnet, other agents hire and pay them, and nothing a contract can check says which ones deserve trust. Read raw, the registry misleads: 346 of 367 rated agents have one reviewer, one wallet wrote 225 reviews, and owners of ten or more agents made 83% of recent registrations.

Tinjau is the bureau. Its Creditcoin contract, GroundedFacts, admits data only through Attestcoin proofs of Ethereum transactions from the official registries: which reviews exist, how long each reviewer was active before reviewing, whether review indices have holes, whether a reviewer owns agents, how many agents share an owner, registrant or minting transaction, and how many bonded attestors stood behind each fact. It computes no score; consumers pass thresholds, and anyone can replay every admitted proof from chain data and get the same numbers.

AgentHireEscrow prices a hire from those facts (the premium is the agent's cost of credit) and refuses agents whose record has holes. CoverageBounty pays for evidence that changes a decision, in either direction. GroundedScout, the autonomous agent, picks targets, proves evidence both ways, skips work other scouts did, claims bounties and hires on its own thresholds. An MCP server lets any agent query the bureau, and a Gemini-based reader checks payment claims in review documents against the Attestcoin prover: on one agent, 6 claimed payments, 0 found on the chain they name.

Live on CC3 testnet: 25 Ethereum transactions admitted back to 2022 and still growing (the scout runs unattended until the deadline); two agents hired at 1%; one refused as gated; a bounty claimed by the scout; the same proof verified on CC3 mainnet.

Limits: Ethereum-side registries only; unsubmitted reviews are invisible; no consumer contract on Creditcoin yet.

**Attestcoin Protocol Integration Summary:** paste `ATTESTCOIN_INTEGRATION.md` (repo root).

**GitHub repository:** https://github.com/k3cs/TinjauAI

**Project deck (PDF):** https://github.com/k3cs/TinjauAI/blob/main/docs/deck.pdf

**Prototype demo video:** `<VIDEO_URL>` (recorded after the frontend is final; script in `docs/demo-script.md`)

**Live app:** `<APP_URL>` (Vercel, after the frontend is deployed)

**Contracts (Creditcoin CC3 Testnet, verified on Blockscout):** GroundedFacts `0xC045087Fd85Da4f2d981222b18E7e74c8040BC47` · AgentHireEscrow `0x82C604Ebf1090f3dceFa6F96b6DF624DF7eF16cB` · CoverageBounty `0x6AbF1F5F8850A347A5D5Bc6AcbA8961595C09A0b`

**Team:** solo. Dien, builder (product, Solidity, TypeScript; previously built Veritas, UHI9).
