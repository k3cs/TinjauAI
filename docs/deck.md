---
marp: true
theme: default
paginate: true
---

# Tinjau
**Grounded Agent Reputation: facts about AI agents and their reviewers, proven from Ethereum into Creditcoin**
BUIDL CTC 2026 Fall · Track: AI · Creditcoin CC3 Testnet + Attestcoin

---

## The problem (Ethereum mainnet, measured 29 Aug 2026)
- 346 of 367 rated agents have exactly **one** reviewer; one EOA wrote **225** reviews for 195 agents
- 16 of 105 reviewers **own agents** and wrote **59%** of all feedback
- Last 60 days: **14,771** registrations, **83%** from owners holding ≥10 agents; 8,136 agents minted in batch txs
- Independent study: 73.5% of Ethereum reviewers show coordinated Sybil behaviour (arXiv 2606.26028)
- The spec's answer: "aggregation will happen off-chain" → trust an aggregator (RNWY, MainStreet, Kleros)

---

## The idea: facts, not scores
- `GroundedFacts` (Creditcoin) admits data **only** through Attestcoin proofs of Ethereum txs
- Facts per agent: reviewers proven real, reviewer seniority (oldest tx, activity months), gaps in review indices, negatives, clone density by owner **and by registrant**, same-tx siblings, reviewer-owns-agents
- No weights. The consumer passes `minAge`, `minDepth`, `k`, `c`; the contract answers numbers anyone can recompute (`verify.ts`)

---

## Attestcoin depth (all measured)
| Capability | Evidence |
|---|---|
| Mainnet (chainKey 3) + Sepolia (chainKey 1) in one contract | `attested-height/3`, ChainInfo `is_height_attested` = true |
| Proof of a **2.5-year-old** tx verified on-chain | 604 roots, `verify` = true, 414,624 gas |
| Registry event proof | `NewFeedback` 117,971 gas; contract decode+storage 259k |
| Dedup via `calculateTxIndex`; official `EvmV1Decoder`; registry counter `feedbackIndex` as completeness oracle | tests + testnet txs |

---

## Money follows facts (no reserve, no oracle)
- `AgentHireEscrow`: premium = base + (max−base)·risk; risk falls with senior reviewers and rises with clone density; premium paid **to the agent** (earn real reviewers)
- `CoverageBounty`: pays whoever submits proofs that **change the consumer's decision** — evidence that hurts an agent pays the same as evidence that helps

---

## The agent: GroundedScout (4 decisions, all logged)
- **R1 Targeting** — open bounties first, then most-reviewed agents in the last 7 days
- **R2 Two-way evidence** — senior reviewers (helps) and higher indices / negatives / clone siblings / reviewer-owns-agents (hurts); 40% of gas reserved for helps
- **R3 Timing** — skip proofs already admitted (`txSeen`); prove only when bounty ≥ cost
- **R4 Consumer** — hire through the escrow when its own thresholds pass, else fund a bounty
- No LLM in the fact path; the contract recomputes everything from bytes

---

## Demo (mainnet data, Creditcoin txs)
- Agent **22771**: 3 senior reviewers → premium 2%
- Agent **50283**: 1 reviewer who owns **43 agents**, 5 clone siblings proven → premium 20%
- Tx hashes on both chains in the video; every number reproducible from the README commands

---

## Limits we state up front
- Ethereum-side registries only; Base (≈139× more activity) is out of Attestcoin's reach today
- Newest unsubmitted reviews are undetectable (only gaps below the highest proven index)
- Clone density is a lower bound; aged wallets can be bought; legit multi-agent operators look like farms
- No consumer contract on Creditcoin yet — the escrow is an example consumer
- Attestcoin moves trust from RPC/indexers to Creditcoin's bonded attestor set; it does not remove it

---

## Prior art and where we differ
| | RNWY / AgentRadar | Kleros oracle | MainStreet | **Grounded** |
|---|---|---|---|---|
| Signal | wallet age, clones | jury decisions | feedback + x402 | proven facts |
| Where | API | registry (Sepolia) | registry (Base) | Creditcoin contract |
| Verifiable by a contract | no | trust router | trust publisher | **yes, from proofs** |
| Score | yes | yes | yes | **no — thresholds** |

---

## Team & links
- Dien — builder (Veritas UHI9 winner: dynamic fee / DRS pattern reused here without the insurance reserve)
- Repo: `https://github.com/k3cs/TinjauAI` · Contracts: `0x47212CE74EA4D6e300922AeB389A7b0a9D81Aabc`, `0x153201A94E83AB5aA1C64f095375F2916EDA9F98`, `0xBaAEAb3f635D39F6a9019745270Daf1812E0aE70` · Video: `<VIDEO_URL>`
- Dossier with verification commands: `docs/evaluation-dossier.md`
