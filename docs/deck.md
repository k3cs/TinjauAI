---
marp: true
theme: default
paginate: true
style: |
  section { font-size: 28px; }
---

# Tinjau
**Verified background checks for AI agents: facts about agents and their reviewers, proven from Ethereum into Creditcoin**
BUIDL CTC 2026 Fall · Track: AI · Creditcoin CC3 Testnet + Attestcoin

---

## Why a background check, and why on Creditcoin
- Creditcoin began as a credit history for people banks cannot see (Credal: 5M+ loan transactions, 337k users)
- AI agents are the next "unbanked": **19,000+** registered on ERC-8004, hired and paid by other agents, with no history a contract can check
- Tinjau is the bureau in Creditcoin's sense, not the lender or the judge: it records **proven facts** and names the **known gaps**; the party taking the risk sets the price
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
- Reviews, reviewer seniority (years of activity before reviewing), holes in review indices, negatives, clones by owner / registrant / URI / minting tx, reviewer-owns-agents, **attestors registered when each fact was admitted**
- No weights. The consumer passes thresholds; anyone recomputes the same numbers from the same proofs

---

## Attestcoin depth (all measured on-chain)
| Surface | Use |
|---|---|
| BlockProver `0x0FD2` `verify` | every proof, inside the contract; 33 source txs admitted |
| `calculateTxIndex` | dedup across scouts (2nd cycle: 0 gas) + exact transfer ordering |
| AttestorStash `0x0FD4` | registered attestor count at admission; hirer can refuse thin quorums |
| ChainInfo `0x0FD3` | attested tip in-contract; hirer can refuse stale facts |
| History back to **Mar 2022** | reviewer seniority from 4.5-year-old txs (786 roots, 507k gas) |
| CC3 **mainnet** | same proof verifies on the mainnet precompile (127,746 gas) |

---

## Money follows facts
- `AgentHireEscrow`: premium = base + (max − base)·risk, paid **to the agent's owner**; `Gated` if a reviewer's record has holes
- `CoverageBounty`: pays only for proofs that **change the decision in that call**; hurting evidence pays the same as helping evidence
- No reserve, no oracle, no admin

---

## Who fills the bureau in
- Anyone can bring proofs; nobody can invent one: the precompile checks every proof, logs count only from the official registries
- Tinjau's own scout runs unattended every 3 hours; other scouts are welcome and deduplicated
- A dishonest scout can only **withhold**; the registry's review counter exposes the hole as a known gap
- Contributions change **completeness**, never **correctness**

---

## The agent: GroundedScout (4 logged decisions)
- **R1** open bounties first, then requested or most-reviewed agents
- **R2** evidence both ways: complete records of senior reviewers (help); clones, conflicted reviewers, negatives (hurt)
- **R3** skip what is admitted; prove only when the bounty covers gas
- **R4** hire on its own thresholds, else fund a bounty
- Live: claimed bounty #0 with the decisive batch, hired 2 agents at 1%, refused a gated one

---

## Demo (mainnet data, Creditcoin txs, 13 Sep 2026)
- Agent **22771**: 3 reviewers active 97 days to 4 years before their first review → premium **1%**, hired
- Agent **21548**: bounty claimed by the scout, then hired at **1%**
- Agent **50283**: one reviewer who owns agents, review #97 proven and #1–96 not, 9 clone siblings → quote **20%**, `hire` reverts `Gated(1)`
- `tinjau_verify` replays all 33 admitted txs from chain data: identical (the scout keeps adding more until the deadline)

---

## AI where rules cannot keep up
- Review documents claim payments in marketplace-specific formats
- Gemini reads them and proposes (network, txHash) pairs (model ladder: falls to the next model on a quota error)
- Deterministic checks decide: hash must be in the document, chain must be Attestcoin-readable, prover + precompile confirm inclusion
- Live on agent 50283: **6 claimed payment transactions, 0 found on the chain they name**
- A report, never a fact on-chain; MCP tools let any agent ask the bureau before hiring

---

## Limits we state up front
- Ethereum mainnet only (Sepolia dropped on purpose: free-to-mint registry entries); Base (most ERC-8004 activity) is out of reach today
- Facts are **admitted evidence with known gaps**, never a complete history (holes below the highest proven index show; a newer review nobody proved does not)
- Attestor count = attestors **registered at admission**, not the signers of one proof; `coveredThrough` = newest proven fact, not "all blocks checked"
- Clone density is a lower bound; aged wallets can be bought
- No consumer contract on Creditcoin yet; the escrow is an example
- Attestcoin moves trust to bonded attestors; it does not remove it (mainnet min bond is 0)
- Evidence Exchange: pay-only-for-decision-change and source-order resolution are live; batch claim, adjudication receipt and same-tx re-pricing are not

---

## Team & links
- Dien: builder
- Repo: `https://github.com/k3cs/TinjauAI`
- Contracts (CC3 testnet): `0x67394eC13E911ab0D3A26132BECa404F26e17a98`, `0xF801a8a01E018f3Bf9a648F4C095a53979282EEA`, `0xa27f14CD50BF334E7Fb09601cEf203745aADF569`
- Video: `<VIDEO_URL>` · Integration summary: `ATTESTCOIN_INTEGRATION.md` · Dossier: `docs/evaluation-dossier.md`
