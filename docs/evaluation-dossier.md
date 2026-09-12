# Tinjau: evaluation dossier (BUIDL CTC 2026 Fall)

Version 3.0 · 11 Sep 2026 · Status: **v3 deployed and verified on Creditcoin CC3 Testnet**; 41 contract tests; 23 source transactions admitted; every number recomputed from the chain alone.

This dossier is written so a judge (human or AI agent) can check every claim independently. Each substantive claim is labelled **[Fact]** (a source or command you can rerun) or **[Inference]** (our reasoning). Section 9 lists commands.

---

## 1. Criteria this dossier addresses

[Fact] The hackathon page (dorahacks.io/hackathon/buidl-ctc-2026-fall/detail) states one explicit criterion: "Depth of Attestcoin Protocol utilization will be evaluated as one of the core scoring criteria." Requirements: testnet deployment, Attestcoin as a core feature, working integration code and technical documentation, GitHub repo with README, deck, demo video, original work.

[Fact] AI track text: "process cryptographically verified cross-chain data to autonomously inform decisions and trigger on-chain transactions without centralized oracle operators."

[Inference] We address five dimensions: (1) depth of Attestcoin use, (2) AI-track fit, (3) real problem with evidence, (4) novelty against other entries and prior art, (5) honesty about limits.

---

## 2. One paragraph

Creditcoin began as a credit history for borrowers banks cannot see. AI agents are the next such borrowers: over 19,000 are registered on ERC-8004 on Ethereum mainnet, other agents hire and pay them, and the registry cannot be read raw (most agents have one reviewer, one wallet wrote 37% of recent reviews, most new registrations come from clone-scale owners). **Tinjau** is a credit bureau for them. Its Creditcoin contract `GroundedFacts` stores **facts** about agents and their reviewers (this review exists; this reviewer was active for years before reviewing; a review index is missing; this reviewer owns agents; these agents share an owner, registrant, URI or minting transaction; this many bonded attestors stood behind the fact), and a fact enters only with an **Attestcoin proof** of the Ethereum transaction behind it. There is no score: consumers pass thresholds and get numbers anyone can recompute. `AgentHireEscrow` turns facts into a premium (the agent's cost of credit), `CoverageBounty` pays for evidence that changes a decision in either direction, and an autonomous scout decides what to prove.

---

## 3. Problem

### 3.1 What happens on-chain [Fact]

| Observation | Number | Source |
|---|---|---|
| ERC-8004 registries live on Ethereum mainnet | IdentityRegistry `0x8004A169…a432` 19,141 txs; ReputationRegistry `0x8004BAa1…9b63` 2,959 txs | eth.blockscout.com, 29 Aug 2026 |
| Reviewer concentration | last 600 reviews: 367 agents, 106 unique reviewers; 346 of 367 agents have exactly one reviewer; one EOA wrote 225 reviews for 195 agents | decoded `NewFeedback` events |
| Reviewers who own agents | 16 of 105 reviewers own agents and wrote 316 of 538 reviews (59%) | `Registered` decode + `balanceOf` |
| Clone-scale registration | last 60 days: 14,771 registrations, 83% from owners holding ≥ 10 agents; 8,136 agents minted in multi-`Registered` transactions | `eth_getLogs`, blocks 25,429,616–25,861,616 |
| Independent study | 73.5% of Ethereum reviewers show coordinated Sybil behaviour | arXiv 2606.26028 |
| Payment claims nobody checks | sample of 12 `proof_of_payment` claims saying `network: ethereum`: 0 of 12 transactions exist on Ethereum | feedbackURI + Blockscout on 5 chains + prover (`TxHashNotFound`) |
| The spec delegates filtering | "results without filtering by clientAddresses are subject to Sybil/spam attacks"; "more complex reputation aggregation will happen off-chain" | eips.ethereum.org/EIPS/eip-8004 |

### 3.2 Who is harmed [Inference]

Anyone choosing an agent from the registry (another agent, a marketplace, an escrow) without a way to check the filtering a score service applied; and anyone who wants to audit a reputation claim without trusting its publisher.

### 3.3 Why existing answers fall short

| Existing | Gives | Limit |
|---|---|---|
| RNWY (rnwy.com) | wallet trust score 0–95 from wallet age, commerce, clusters; API + MCP | [Fact] central API; a contract cannot verify the score |
| Sentinel8004 (Synthesis, 1st) | off-chain Sybil scanner, verdicts written to a registry on Celo | [Fact] one maintainer, heuristics, no proofs |
| AgentScore (Chainlink Convergence, 3rd) | reputation tied to x402 payments via CRE | [Fact] depends on an oracle network; single chain |
| ERC-8004 `proofOfPayment` field | optional `{chainId, txHash}` | [Fact] never verified on-chain (row 6 above) |

---

## 4. Solution

### 4.1 Design principles

1. **Facts, not scores.** The contract never decides who is trustworthy; consumers bring thresholds.
2. **Omission never helps.** Numbers only rise with proof; a reviewer counts as grounded only when every one of their review indices is proven; the escrow refuses facts it could not fully examine.
3. **Only proofs get in.** Every write goes through the BlockProver precompile; logs count only from the official registries.
4. **Recomputable.** An off-chain copy of the logic (`packages/core/src/facts-model.ts`) must return the same numbers; `recomputeFromChain()` does this from chain data alone.

### 4.2 `GroundedFacts`

| Input (proven) | Facts |
|---|---|
| `NewFeedback` / `FeedbackRevoked` from ReputationRegistry | reviews per (agent, reviewer, index); negatives; revocations; `gapCount` from the registry's monotone per-pair index |
| any transaction sent by a reviewer | activity: oldest proven height and distinct ~30-day buckets (seniority) |
| `Registered` / `Transfer` from IdentityRegistry | owner (newest proven transfer wins), registrant (tx sender), URI, minting tx → `cloneDensityLB`, `registrantSiblings`, `uriSiblings`, `sameTxSiblings`, `reviewerOwnsAgents` |
| every admitted proof | `minAttestors` (AttestorStash at admission), `coveredThrough` (highest source height) |

`facts(chainKey, agentId, minAge, minDepth)` returns thirteen fields; `attestedTip(chainKey)` reads ChainInfo.

### 4.3 Money moves through consumers

- **`AgentHireEscrow`**: `premiumBps = base + (max − base)·risk`, `risk = 1 − min(1, grounded/k) · c/(c + clones)`. Premium goes to the agent's owner (so owners want senior reviewers and clean provenance), the rest is held until release or refund. `hire` reverts `Gated` if any reviewer has holes, `Truncated` if more than 256 reviewers, `ThinQuorum` / `Stale` if the hirer asked for attestor or freshness floors.
- **`CoverageBounty`**: pays only if the proofs submitted *in that call* flip the consumer's decision tuple (grounded ≥ k, no gaps, clones ≥ c, any negatives). Hurting evidence pays the same as helping evidence.

### 4.4 The agent: `GroundedScout`

Four decisions, all logged with the alternatives it rejected:

| Role | Decision | Seen live, 11 Sep |
|---|---|---|
| R1 targeting | open bounties first, then requested or most-reviewed agents | picked bounty #0 (agent 21548) before the two requested agents |
| R2 two-way evidence | helps: complete review records + old, spread activity for reviewers who can be grounded; hurts: negatives, revocations, reviewers who own agents, owner's other agents, highest index of conflicted reviewers | 22771 (35 reviewers): 10 rejected as too new, 15 left unscanned (scan cap 20), 3 grounded chosen, 7 more skipped once k = 3 was covered; 50283: 5 clone siblings, reviewer owns agents, review #97 |
| R3 timing | skip what is already admitted; prove now only if the bounty covers gas | bounty 0.05 tCTC vs cost ≈ 0.0017 tCTC → prove now; second cycle on 50283: 7/7 already admitted, 0 gas |
| R4 consumer | hire if the facts pass its own thresholds, otherwise fund a bounty | hired 21548 and 22771 at 100 bps; refused 50283 (gated) |

No LLM sits in the fact path. The claim reader (below) is the only LLM component and produces a report, never a fact.

### 4.5 Claim reader (AI, report only)

Review documents (`feedbackURI`) carry free-form claims such as `proof_of_payment: {network, payment_tx}`, in formats that differ per marketplace. `apps/server` asks Gemini (structured output; a model ladder `gemini-3.8-flash` → `3.7` → `3.6` → `3.5` → `3.5-flash-lite` → `3.1-flash-lite` that falls to the next model when one is out of quota or unavailable) to list the claims; then deterministic checks decide: the hash must appear verbatim in the document (an invented hash is discarded), the network must be one Attestcoin reads (otherwise `unsupported-chain`), and the Attestcoin prover plus the BlockProver precompile say whether the transaction exists on the claimed chain. [Fact] The deterministic half is tested against the live prover: a real mainnet hash → `proven`; the same hash claimed on Sepolia → `not-on-claimed-chain`; Base → `unsupported-chain`; an invented hash → `hash-not-in-document`. [Fact] The LLM half was run live on 12 Sep 2026 against agent 50283 (Ethereum mainnet): 97 reviews, 97 with a `feedbackURI`, 6 of the first 6 documents read claimed a payment transaction "on ethereum", and the prover found **none of the 6** on Ethereum (`not-on-claimed-chain`); a manual spot-check of 3 of those hashes found them on Base too. Three different models in the ladder answered during that single run, which is the fallback path working. Agent 22771's `feedbackURI`s could not be fetched at all, so it produced no claims.

---

## 5. Depth of Attestcoin use

| # | Use | Evidence [Fact] |
|---|---|---|
| 1 | BlockProver `verify` on every proof inside the contract | 23 admitted source txs; `ProofRejected` on a bad proof (test) |
| 2 | `calculateTxIndex` for dedup and exact transfer ordering | second scout cycle: 0 gas; test `test_newestTransferWinsWhateverTheProofOrder` |
| 3 | AttestorStash `0x0FD4` read per proof, exposed as `minAttestors`, enforceable by the hirer | live: 4 attestors (Ethereum), 7 (Sepolia); `facts(3,22771).minAttestors = 4` |
| 4 | ChainInfo `0x0FD3` read in-contract (`attestedTip`) for staleness | `attestedTip(3)` = 25,955,150 at deploy |
| 5 | Two source chains in one contract | 22 Ethereum mainnet + 1 Sepolia |
| 6 | Years-old history as fact input (reviewer seniority) | oldest admitted: Ethereum block 14,306,215 (2 Mar 2022), 786 roots, 506,986 gas |
| 7 | Receipt decoding with `EvmV1Decoder`: status, sender, logs, emitter binding | 52 KB tx with 10 `Registered` logs admitted (2,997,204 gas) |
| 8 | Source-protocol counter as a completeness signal (`feedbackIndex`) | 50283: review #97 proven, #1–96 not → `Gated(1)` |
| 9 | Mainnet-ready | same proof verifies on CC3 **mainnet** precompile, 127,746 gas |
| 10 | Independent recomputation from chain data | `recomputeFromChain()`: 23/23 replayed, identical facts for 3 agents |

[Fact] Other entries: of 87 BUIDLs in the DoraHacks gallery (read 11 Sep), at least 7 use Ethereum mainnet and one (Singleton) also uses AttestorStash. [Inference] What is specific to Tinjau is the subject (AI agents and their reviewers; 0 of 87 BUIDLs touch ERC-8004), years-old history as a fact input, completeness from the source protocol's counter, and the chain-only recomputation.

---

## 6. AI-track fit

| Track element | How Tinjau meets it |
|---|---|
| cryptographically verified cross-chain data | every `GroundedFacts` input is an Attestcoin proof of an Ethereum tx |
| autonomously inform decisions and trigger transactions | the scout picks targets, proves, claims bounties and hires with no human step (txs 5–12 in the integration summary) |
| without centralized oracle operators | no oracle, no signed aggregator; the remaining trust is Creditcoin's bonded attestor set, which the contract exposes per fact |

[Inference] The scout's decisions have economic consequences (bounty, premium, hire), which separates it from a keeper that only optimises cost. The claim reader adds an LLM where rules cannot keep up (free-form documents) while keeping it out of the fact path.

---

## 7. Novelty

[Fact] 0 of 87 BUIDLs mention ERC-8004 or agent reputation; about 22 are "credit passports" for human borrowers. Closest prior art: RNWY, Sentinel8004, AgentScore (section 3.3).

[Inference] Not new: the signals (wallet age, clones). New: a contract verifies them from proofs, completeness comes from the registry's own counter, provenance comes from registration events, bounties pay only for decision-changing evidence, and anyone can replay the whole bureau from chain data.

---

## 8. Limits, risks, and what is not claimed

### 8.1 Limits [Fact unless marked]

- No consumer contract on Creditcoin today; ERC-8004 registries are not deployed on CC3 mainnet (`eth_getCode` = `0x`). The escrow is an example consumer. We do not claim demand.
- Anyone with an Ethereum archive node can compute the same facts without Creditcoin. What Attestcoin adds is that a **contract** can verify them and lock money on them.
- Partial completeness: a review nobody has submitted is invisible; only holes below the highest proven index show.
- Only Ethereum-side registries; Base has far more ERC-8004 activity and is unreachable today.
- Reviewers who review through a relayer or smart account have no activity of their own before the review and stay ungrounded (conservative).
- Mainnet AttestorStash reports a minimum bond of 0 for Ethereum attestors (testnet: 100 CTC).

### 8.2 Known attacks

| Attack | Status |
|---|---|
| Buy or farm aged wallets | accepted risk: costs gas over months; raise `minDepth` |
| Hide a recent negative review | mitigated: bounty pays for higher indices; not removed |
| Grief by proving a reviewer's highest index | by design: the hire stays gated until someone proves the rest (anyone can; bounties pay) |
| Spoof `NewFeedback` from another contract | closed: emitter must be the official registry (tested) |
| Replay a proof / split proofs to farm bounties | closed: dedup key; bounty pays only for a change caused in the same call (tested) |
| Clone farm with one EOA per agent | partly closed: `sameTxSiblings`, `uriSiblings`, `registrantSiblings` |
| Front-run a bounty claim | accepted: facts still improve; only the payee changes |

Code review: `docs/quality/code-review.md` (3 findings fixed before deploy, 0 open).

---

## 9. How to verify (no keys needed)

```bash
# facts for the demo agents, straight from the contract
cast call --rpc-url https://rpc.cc3-testnet.creditcoin.network 0xC045087Fd85Da4f2d981222b18E7e74c8040BC47 \
  "facts(uint64,uint256,uint64,uint32)((uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint32,bool))" 3 22771 500000 2

# the hire that must fail
cast call --rpc-url https://rpc.cc3-testnet.creditcoin.network --value 0.01ether 0x82C604Ebf1090f3dceFa6F96b6DF624DF7eF16cB \
  "hire(uint64,uint256,(uint64,uint32,uint64,uint64,uint16,uint16,uint32,uint64),uint64)" 3 50283 "(500000,2,3,5,100,2000,0,0)" 9999999999

# attestors and attested tip, read through the contract and the precompiles
cast call --rpc-url https://rpc.cc3-testnet.creditcoin.network 0x0000000000000000000000000000000000000fd4 "getAttestorsCount(uint64)(uint256)" 3
cast call --rpc-url https://rpc.cc3-testnet.creditcoin.network 0xC045087Fd85Da4f2d981222b18E7e74c8040BC47 "attestedTip(uint64)(uint64)" 3

# recompute the whole bureau from chain data (repo)
pnpm install && cd apps/mcp-server && VERIFY=1 npx tsx test/client.ts

# contract tests with real prover bytes
pnpm test:contracts
```

---

## 10. Sources

- Hackathon page: dorahacks.io/hackathon/buidl-ctc-2026-fall/detail
- Attestcoin docs: docs.attestcoin.org; prover `proof-gen-api.cc3-testnet.creditcoin.network`; SDK `@gluwa/usc-sdk` 0.18.0 (ChainInfo ABI); `@gluwa/usc-contracts` 0.2.0
- ERC-8004: eips.ethereum.org/EIPS/eip-8004; github.com/erc-8004/erc-8004-contracts
- Study: arXiv 2606.26028, "Can Trustless Agents Be Trusted? An Empirical Study of the ERC-8004 Decentralized AI Agent Ecosystem"
- Problem measurements (29 Aug 2026) and v2 history: `docs/legacy/`
