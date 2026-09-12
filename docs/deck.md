---
marp: true
theme: default
paginate: true
style: |
  section { font-size: 28px; }
---

# Tinjau
**A credit bureau for AI agents: facts about agents and their reviewers, proven from Ethereum into Creditcoin**
BUIDL CTC 2026 Fall · Track: AI · Creditcoin CC3 Testnet + Attestcoin

---

## Why a credit bureau, and why on Creditcoin
- Creditcoin began as a credit history for people banks cannot see (Credal: 5M+ loan transactions, 337k users)
- AI agents are the next "unbanked": **19,000+** registered on ERC-8004, hired and paid by other agents, with no history a contract can check
- Tinjau is the bureau, not the lender: it records **proven facts**; the party taking the risk sets the price
- The hiring escrow is the pricing step: its premium is the agent's **cost of credit**

---

## The problem (Ethereum mainnet, measured 29 Aug 2026)
- 346 of 367 rated agents have exactly **one** reviewer; one wallet wrote **225** reviews for 195 agents
- 16 of 105 reviewers **own agents** and wrote **59%** of all feedback
- 60 days: **83%** of 14,771 registrations from owners holding ≥ 10 agents
- 0 of 12 sampled "paid on Ethereum" claims exist on Ethereum
- The spec's answer: "aggregation will happen off-chain" → trust an aggregator

---

## Facts, not scores
- `GroundedFacts` admits data **only** through Attestcoin proofs of Ethereum txs from the official registries
- Reviews, reviewer seniority (years of activity before reviewing), holes in review indices, negatives, clones by owner / registrant / URI / minting tx, reviewer-owns-agents, **bonded attestors behind each fact**
- No weights. The consumer passes thresholds; anyone recomputes the same numbers from the same proofs

---

## Attestcoin depth (all measured on-chain)
| Surface | Use |
|---|---|
| BlockProver `0x0FD2` `verify` | every proof, inside the contract; 25 source txs admitted |
| `calculateTxIndex` | dedup across scouts (2nd cycle: 0 gas) + exact transfer ordering |
| AttestorStash `0x0FD4` | attestor count per fact; hirer can refuse thin quorums |
| ChainInfo `0x0FD3` | attested tip in-contract; hirer can refuse stale facts |
| History back to **Mar 2022** | reviewer seniority from 4.5-year-old txs (786 roots, 507k gas) |
| CC3 **mainnet** | same proof verifies on the mainnet precompile (127,746 gas) |

---

## Money follows facts
- `AgentHireEscrow`: premium = base + (max − base)·risk, paid **to the agent's owner**; `Gated` if a reviewer's record has holes
- `CoverageBounty`: pays only for proofs that **change the decision in that call**; hurting evidence pays the same as helping evidence
- No reserve, no oracle, no admin

---

## The agent: GroundedScout (4 logged decisions)
- **R1** open bounties first, then requested or most-reviewed agents
- **R2** evidence both ways: complete records of senior reviewers (help); clones, conflicted reviewers, negatives (hurt)
- **R3** skip what is admitted; prove only when the bounty covers gas
- **R4** hire on its own thresholds, else fund a bounty
- Live: claimed bounty #0 with the decisive batch, hired 2 agents at 1%, refused a gated one

---

## Demo (mainnet data, Creditcoin txs)
- Agent **22771**: 3 reviewers active 97 days to 4 years before their first review → premium **1%**, hired
- Agent **21548**: bounty claimed by the scout, then hired at **1%**
- Agent **50283**: one reviewer who owns agents, review #97 proven and #1–96 not, 6 clone siblings → quote **20%**, `hire` reverts `Gated(1)`
- `tinjau_verify` replays all 25 admitted txs from chain data: identical (the scout keeps adding more until the deadline)

---

## AI where rules cannot keep up
- Review documents claim payments in marketplace-specific formats
- Gemini reads them and proposes (network, txHash) pairs (model ladder: falls to the next model on a quota error)
- Deterministic checks decide: hash must be in the document, chain must be Attestcoin-readable, prover + precompile confirm inclusion
- Live on agent 50283: **6 claimed payment transactions, 0 found on the chain they name**
- A report, never a fact on-chain; MCP tools let any agent ask the bureau before hiring

---

## Limits we state up front
- Ethereum-side registries only; Base (most ERC-8004 activity) is out of reach today
- Unsubmitted newest reviews are invisible (only holes below the highest proven index)
- Clone density is a lower bound; aged wallets can be bought
- No consumer contract on Creditcoin yet; the escrow is an example
- Attestcoin moves trust to bonded attestors; it does not remove it (mainnet min bond is 0)

---

## Team & links
- Dien: builder
- Repo: `https://github.com/k3cs/TinjauAI`
- Contracts (CC3 testnet): `0xC045087Fd85Da4f2d981222b18E7e74c8040BC47`, `0x82C604Ebf1090f3dceFa6F96b6DF624DF7eF16cB`, `0x6AbF1F5F8850A347A5D5Bc6AcbA8961595C09A0b`
- Video: `<VIDEO_URL>` · Integration summary: `ATTESTCOIN_INTEGRATION.md` · Dossier: `docs/evaluation-dossier.md`
