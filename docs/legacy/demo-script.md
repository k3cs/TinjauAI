# Demo video script (max 3:00) — Tinjau

Record only after the frontend is final (Dien's decision, 11 Sep); re-check every on-screen number against `ATTESTCOIN_INTEGRATION.md` first. Numbers said aloud must be on-chain facts: agent 50283's reviewer owns 6 agents proven on-chain (`reviewerOwnsAgents`); the 43 seen in the scout's off-chain scan is not said.

One take, screen recording: terminal left, browser right (Tinjau live UI + Blockscout). Narration in English. Contracts v2 and all hashes below are already on chain, so nothing waits for confirmation during the recording.

**Seed state to prepare before recording (all already done, verify before pressing record):**
- Tinjau UI open at https://k3cs.github.io/TinjauAI/ (LIVE stamp, agents 22771 vs 50283, thresholds 500000 / 2 / 3 / 5)
- Blockscout tabs: `record` tx `0x76605e445ed7462286e66e1a489741eb3e64ed5638edce471b98d90606015f51`; Ethereum tx for the Jan-2024 activity proof; `hire` tx `0x7f902dbb29ab9962b32c4bc868cb024404365ede4f53268cc7eb72ed15930276`
- Terminal in `agent/` with `.env` loaded; `plans/live-full-cycle.log` ready to `cat`

| Time | On screen | Say |
|---|---|---|
| 0:00–0:15 | Tinjau UI, both receipts visible | "A credit check for AI agents. Two agents on the ERC-8004 registry, same day. Agent 22771: three reviewers with years of history, premium one percent. Agent 50283: one reviewer, a wallet that owns six agents of its own. Gated. Every number here was proven from Ethereum into a Creditcoin contract." |
| 0:15–0:35 | slide with three numbers | "Creditcoin started as a credit history for people banks can't see. AI agents have the same problem. On mainnet, 346 of 367 rated agents have exactly one reviewer, one wallet wrote 225 reviews, and 83 percent of new registrations come from owners of ten or more agents. The standard says: trust an off-chain aggregator. We don't." |
| 0:35–1:05 | `cast call facts(3, 22771, 500000, 2)` → tuple; click "Senior reviewers" in UI → receipt opens with tx list | "GroundedFacts on Creditcoin. This call returns facts for *my* thresholds — no weights inside. Each fact opens into its receipt: the Ethereum transactions that were proven. This one is a reviewer's transaction from January 2024, 600 continuity roots, verified by the BlockProver precompile." |
| 1:05–1:35 | Blockscout: `record` tx, gasUsed; Ethereum tx side by side | "Here is the admission transaction on Creditcoin — four proofs, 2.2 million gas — and the original transaction on Ethereum. Same hash on both sides." |
| 1:35–2:05 | `cast call quote … 22771` → 100 bps; `… 50283` → 1683 bps; then `hire 50283` revert `Gated(1)` in terminal; UI shows "gated" | "The escrow is where the bureau's facts become a price, the agent's cost of credit: one percent for 22771, sixteen point eight for 50283 — and the hire reverts, because the registry's own review counter proves a review is missing. The premium goes to the agent's owner, not to a reserve waiting for a trigger." |
| 2:05–2:40 | `cat plans/live-full-cycle.log` scrolled slowly | "The scout is the agent. It picked its own targets — an open bounty and the most-reviewed agent this week — collected evidence that helps and evidence that hurts, proved seven transactions, claimed the bounty with the final batch, hired the agent it verified, and on the second target spent zero gas because everything was already admitted on chain." |
| 2:40–2:55 | `npx tsx src/verify.ts plans/agent-22771-*.json` output next to `cast call facts` | "Anyone can recompute every fact from the same proofs and get the same numbers." |
| 2:55–3:00 | README limitations section | "Limits are in the README: Ethereum-side registries only, unsubmitted newest reviews are invisible, no consumer contract on Creditcoin yet. Everything else is verifiable from the repo." |

Hard rules followed: opens with the result, no team intro; no wallet popups (all state pre-seeded and said so); one unbroken path from 0:35 to 2:40.

Recording checklist (Dien): 1080p, terminal font ≥16 pt, Blockscout zoom 125%, 10-second mic test, upload as YouTube unlisted, open the link in an incognito window before pasting it into DoraHacks.
