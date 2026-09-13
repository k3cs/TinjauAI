# DoraHacks submission text (v3)

Field names follow the BUIDL CTC 2026 Fall form. Deadline: 13 Sep 2026 23:59 ET (14 Sep 10:59 WIB). Personal team data (email, country, citizenship) is not kept in this public repo; Dien fills it in the form.

**Project name:** Tinjau

**Project sector:** AI (secondary: DeFi)

**One-liner (≤140 chars):** Verified background checks for AI agents: facts about ERC-8004 agents and reviewers, proven from Ethereum into Creditcoin. No score.

**Project description (≤300 words):**
Over 19,000 AI agents are registered on ERC-8004 on Ethereum mainnet, other agents pay them, and nothing a contract can check says which ones deserve trust. Read raw, the registry misleads: most rated agents have one reviewer, one wallet wrote 225 reviews, and clone-scale owners made 83% of recent registrations.

Tinjau is a verified background check for these agents before money moves: a bureau in Creditcoin's sense, it records and does not judge. Its Creditcoin contract, GroundedFacts, admits data only through Attestcoin proofs of Ethereum transactions: which reviews exist, how long each reviewer was active before reviewing, whether review indices have holes, whether a reviewer owns agents, how many agents share an owner or minting transaction, and how many attestors were registered when each fact was admitted. No score: consumers pass thresholds, get admitted evidence plus known gaps, and anyone can replay every proof from chain data.

AgentHireEscrow prices a hire from those facts and refuses records with holes. CoverageBounty pays for evidence that changes a decision, in either direction. GroundedScout, the autonomous agent, picks targets, proves evidence both ways, claims bounties and hires. Anyone may submit proofs and nobody can invent one: the precompile decides what is true, a dishonest scout can only withhold, and the registry's counter exposes that as a gap. A Gemini-based reader checks payment claims in review documents against the prover (one agent: 6 claimed, 0 found).

Live on CC3 testnet: 33 Ethereum mainnet transactions admitted back to 2022 and growing; two agents hired at 1%; one gated; a bounty claimed by the scout; the same proof verified on CC3 mainnet.

Limits: Ethereum mainnet only (Sepolia excluded by design); admitted evidence with known gaps, not a complete history; attestor count means registered at admission, not proof signers; no consumer contract on Creditcoin yet.

**Attestcoin Protocol Integration Summary:** paste `ATTESTCOIN_INTEGRATION.md` (repo root).

**GitHub repository:** https://github.com/k3cs/TinjauAI

**Project deck (PDF):** https://github.com/k3cs/TinjauAI/blob/main/docs/deck.pdf

**Prototype demo video:** `<VIDEO_URL>` (recorded after the frontend is final; script in `docs/demo-script.md`)

**Live app:** `<APP_URL>` (Vercel, after the frontend is deployed)

**Contracts (Creditcoin CC3 Testnet, verified on Blockscout):** GroundedFacts `0x67394eC13E911ab0D3A26132BECa404F26e17a98` · AgentHireEscrow `0xF801a8a01E018f3Bf9a648F4C095a53979282EEA` · CoverageBounty `0xa27f14CD50BF334E7Fb09601cEf203745aADF569`

**Team:** solo. Dien, builder (product, Solidity, TypeScript; previously built Veritas, UHI9).
