# Grounded Agent Reputation

**Facts about ERC-8004 agents and their reviewers, admitted into a Creditcoin contract only through Attestcoin proofs of Ethereum transactions. No score, no oracle, no aggregator signature: consumers bring their own thresholds and anyone can recompute the facts from the published proofs.**

BUIDL CTC 2026 Fall · Track: AI · Creditcoin CC3 Testnet (chainId 102031) · Source chains: Ethereum mainnet (Attestcoin chainKey 3) and Sepolia (chainKey 1).

## Why

The ERC-8004 Reputation Registry on Ethereum mainnet is live (19k identity txs, feedback every day) and unusable raw: in the last 600 feedbacks, 346 of 367 agents have exactly one reviewer, one EOA wrote 225 feedbacks for 195 agents, 16 of 105 reviewers own agents themselves and wrote 59% of all feedback, and 59% of the latest registrations belong to owners holding ≥10 agents. The spec itself says aggregation "will happen off-chain" through trusted aggregators. See `docs/` for the full evidence.

## What

`GroundedFacts` (Creditcoin) accepts `record(Proof[])`. For every proof it calls the BlockProver precompile (`0x…0FD2`) `verify`, decodes the proven `txBytes` with the official `EvmV1Decoder`, and only admits logs emitted by the official registries (`0x8004A…` identity, `0x8004B…` reputation). It records:

| Fact | From | Property |
|---|---|---|
| feedback per (agent, reviewer, `feedbackIndex`), revocations | `NewFeedback`, `FeedbackRevoked` | gaps *below* the highest proven index are detectable (`feedbackIndex` is `++_lastIndex[agent][client]` in the registry) |
| reviewer seniority: oldest proven tx, distinct ~30-day activity buckets | any proven tx (`from`) | can only grow with evidence; absence reads as "new" |
| agent provenance: owner (follows `Transfer`), registrant (tx sender), URI hash, same-tx siblings | `Registered`, `Transfer` | clone density by owner *and* by registrant (robust to factory / token-bound-account patterns) |

`facts(chainKey, agentId, minAge, minDepth)` returns `breadthRaw, breadthGrounded, breadthIndependent, gapCount, negatives, cloneDensityLB, registrantSiblings, uriSiblings, sameTxSiblings, firstRegisteredHeight`. Thresholds are the consumer's; the contract has no weights.

Consumers (examples): `AgentHireEscrow` (dynamic premium paid to the agent owner, gate only on gaps) and `CoverageBounty` (pays whoever submits proofs that change the consumer's decision tuple; evidence that hurts the agent pays the same as evidence that helps).

`agent/src/scout.ts` is the autonomous agent: it discovers registry events, decides which evidence is worth proving under a gas budget (cheapest reviewer to ground first, stops when `k` is reached, logs every rejection with its reason), fetches proofs from the CC3 prover API and submits `record`. `agent/src/verify.ts` recomputes the facts from the same proofs off-chain.

## Attestcoin depth (all measured on 29 Aug 2026)

- `verify` on-chain for mainnet `NewFeedback` (100 continuity roots): 117,971 gas; for a Jan-2024 tx (604 roots): 414,624 gas. Contract-side decode+storage (forge tests, precompile mocked): feedback 259k, Registered tx with 8 logs 439k, activity 130–184k.
- Two chain keys in one contract; `calculateTxIndex` for dedup; `EvmV1Decoder` for `from`, receipt status and log address filtering; registry counters (`feedbackIndex`) as a partial completeness oracle.

## Run

```bash
forge test -vv                      # unit tests with real mainnet txBytes fixtures (precompile mocked)
cd agent && npm i
npx tsx src/scout.ts --agents=34135,50283 --minAge=1300000 --minDepth=3 --k=3 --c=5   # dry-run: plan + proofs
npx tsx src/verify.ts plans/agent-34135-*.json                                          # recompute facts
# live: PRIVATE_KEY=… npx tsx src/scout.ts --facts=<GroundedFacts address> …
forge script script/Deploy.s.sol --rpc-url cc3 --broadcast --private-key $PRIVATE_KEY
```

## Limits (stated, not hidden)

- Only Ethereum-side registries (chainKey 1/3); payments for ERC-8004 feedback happen on Base/Celo/Polygon and are not admitted.
- Newest feedback that nobody submits is undetectable (only gaps below the highest proven index are); mitigated by bounties that pay for higher indices.
- Clone density is a lower bound; aged wallets can be bought; multi-agent operators look like clone farms — all reported as facts for the consumer to weigh.
- No consumer contract exists on Creditcoin today; the escrow is an example consumer. Attestcoin moves trust from RPC/indexers to Creditcoin's bonded attestor set; it does not remove it.

License: MIT. Original work created during the hackathon.
