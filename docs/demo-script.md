# Demo video script (≤ 3:00): Tinjau

Version 13 Sep 2026, written for Dien's storyline (marketplace → compare → Tinjau → scout → bounty → Attestcoin → CTA). Narration in English. One take, screen recording: browser on the left (Tinjau web app + Blockscout tabs), terminal on the right.

Numbers said aloud must match the chain at recording time. The contracts are the **12 Sep deployment** (DEC-F b): GroundedFacts `0x67394eC13E911ab0D3A26132BECa404F26e17a98`, AgentHireEscrow `0xF801a8a01E018f3Bf9a648F4C095a53979282EEA`, CoverageBounty `0xa27f14CD50BF334E7Fb09601cEf203745aADF569`. All hashes below are from `services/scout/plans/live-20260913-1805.log` (13 Sep 18:05–18:20 WIB); the full table is in `ATTESTCOIN_INTEGRATION.md` §6.

## 0. How the storyline maps onto what exists (updated 13 Sep 20:45, after WEB-12/13/14)

| Storyline | Real page | Why |
|---|---|---|
| Agents 533571 and 591140 | **22771** (passes) and **50283** (held); agreed by Dien 13 Sep | Only agents whose facts are proven on-chain can be shown; the page refuses to invent identities (`apps/web/src/lib/agents.ts`). |
| "Recommended" label | "**Passes your settings**" vs "**Held**" (`VerdictPill`, icon + label); agreed by Dien 13 Sep | Product invariant: Tinjau never issues a verdict of its own; the visitor's care level decides. |
| Compare page | **Built**: `#/compare?a=22771&b=50283`, nine fact rows, each opening "What was checked / How Attestcoin proves it / Why it matters" | This is where the video explains the technology behind each number. |
| Bounty button next to the held agent | **Built**: "Fund a bounty" on every row of `#/agents` and under each column of `#/compare` (`BountyPanel`, preview without a wallet, real `fund` with one) | The scout story is narrated over this panel. |
| Marketplace with several agents | `#/agents`: table of four real agents under one care level, with hire, bounty, compare pick and "How do we know?" | |

## 1. Seed state (prepare before pressing record)

- Web app open on the live URL (or `localhost:5173`), dark theme, `#/agents` with care level **Normal**; second tab on `#/compare?a=22771&b=50283` with the "Reviewers we could verify" row already opened once. Hero stat reads the live number of proven transactions.
- Blockscout tabs (CC3 testnet): `fund` tx `0xea3b3712…b27f`, `proveAndClaim` tx `0x8a32b470…d68d`, hire 22771 tx `0x3a8d2c53…b8c4`, hire 21548 tx `0x02933cb3…48d0`, GroundedFacts contract page (Events).
- Etherscan tab: one source transaction of a 22771 reviewer (the oldest activity tx, ≈ 4 years old).
- Terminal in `services/scout` with `.env` loaded; `plans/live-20260913-1805.log` ready to `cat`; `pnpm -s scout verify 22771 50283 21548` already run once (warm cache).
- MCP Inspector or Claude Desktop with `tinjau_facts` connected (optional, 10 s).

## 2. Shot list

| Time | On screen | Say |
|---|---|---|
| 0:00–0:12 | `#/` hero, then `#/agents` table | "You need a translation done, and an agent marketplace offers two AI agents for it. Both have reviews on ERC-8004, the public agent registry on Ethereum. Which one do you pay?" |
| 0:12–0:30 | On `#/agents`: rows 22771 and 50283, verdict pills and fees; tick both, press "Compare" | "Agent 22771: three reviewers, all active long before they reviewed, no missing reviews. Passes your settings, one percent premium. Agent 50283: one reviewer, and that reviewer owns other agents. Review number 97 is proven, reviews 1 to 96 are not. Held. Same registry, same day, opposite answers." |
| 0:30–0:55 | `#/compare`: open "Reviewers we could verify" (What / How Attestcoin proves it / Why); then back on `#/agents` open "How do we know?" on 22771 for the Ethereum ↔ Creditcoin pairs; Etherscan tab, Blockscout `record` tx | "Every line here is a fact proven from Ethereum into a Creditcoin contract. This reviewer's oldest transaction is from 2022. The Attestcoin prover packaged it with a Merkle proof and a continuity proof; the BlockProver precompile on Creditcoin verified it before the contract read a single byte. Here is the same hash on both chains." |
| 0:55–1:10 | On `#/compare`: switch Normal → Careful; fees and the money line change; 50283 stays held | "Tinjau never scores. It stores facts and known gaps. You bring the thresholds: how many independent reviewers, how old their history must be. Change them and the price changes. The contract computes it, not us." |
| 1:10–1:40 | Press "Fund a bounty" under 50283 (preview panel explains who scouts are and when they get paid); terminal: `cat plans/live-20260913-1805.log` scrolled slowly | "Who fills the bureau in? Scouts. A scout is a program anyone can run, with any strategy. Ours picks open bounties first, collects evidence that helps and evidence that hurts, skips what is already proven, and only spends gas when a bounty covers it. It cannot lie: the precompile rejects any proof that is not a real Ethereum transaction. It can only withhold, and the registry's own review counter shows the hole." |
| 1:40–2:05 | Blockscout: `Funded` event, then `proveAndClaim` tx `0x8a32b470…d68d`, then hire tx `0x02933cb3…48d0` | "We funded a bounty on agent 21548. The scout proved its three reviewers in one transaction. Before: not passing. After: passing. The decision changed, so the contract paid the scout 0.05 CTC in the same call. Evidence that hurts an agent pays exactly the same. Evidence that changes nothing pays nothing. Then the scout hired the agent it had just verified." |
| 2:05–2:25 | MCP Inspector: `tinjau_facts 22771` (or terminal `pnpm -s scout verify 22771 50283 21548`) | "Tinjau is also an MCP server, so other agents ask it before they hire. And anyone can replay every admitted proof from chain data alone and get the same numbers. Here: identical." |
| 2:25–2:50 | `#/` section "Not a diagram", open "What runs inside the contract" | "Without Attestcoin none of this holds. A Creditcoin contract cannot read Ethereum. Tinjau uses the BlockProver for single and batch proofs, decodes receipts, orders conflicting facts by Ethereum block and transaction index, reads the attestor count and the attested tip, and admits transactions back to 2022. Remove it, and you are trusting our server again." |
| 2:50–3:00 | `#/` "What this cannot tell you", then the live URL | "Limits, stated up front: Ethereum-side registries only, admitted evidence with known gaps, not a complete history. Open Tinjau, pick your care level, and check an agent before you pay it." |

## 3. Hard rules

- Numbers said aloud: 3 reviewers (22771), review #97 vs 1–96 (50283), 0.05 CTC bounty, one percent premium. Nothing else numeric.
- Never say "score", "recommended", "complete history", or "signers behind the fact".
- No wallet pop-ups during the take: every transaction shown is already on chain.
- The hire from the browser (WEB-11) has never been executed live; the video shows the scout's hire, not a browser hire.

## 4. Recording checklist (SUB-1)

- [ ] `pnpm -s scout verify 22771 50283 21548 50286` prints identical facts for all four (run within the hour).
- [ ] Hero counter on the page equals the `TxAdmitted` count on Blockscout for `0x6739…7a98`.
- [ ] Every hash in §1 opened once in Blockscout.
- [ ] Care level set to Normal before the take; Careful switch rehearsed once.
- [ ] Terminal font ≥ 16 pt, Blockscout zoom 125 %, 1080p, 10-second mic test.
- [ ] Upload as YouTube unlisted; open the link in an incognito window before pasting it into DoraHacks (`docs/submission.md`, `docs/deck.md`, then regenerate `deck.pdf`).
