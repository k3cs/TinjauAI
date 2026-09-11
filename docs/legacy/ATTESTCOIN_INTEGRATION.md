# Attestcoin Integration Summary

**Precompiles used**
- BlockProver `0x0000000000000000000000000000000000000FD2`: `verify(uint64 chainKey, uint64 height, bytes encodedTx, MerkleProof, ContinuityProof)` (view) on every admitted transaction; `calculateTxIndex(MerkleProof)` to key admitted txs by `(chainKey, height, txIndex)` for deduplication.
- Source chains: Ethereum mainnet (`chainKey 3`) and Sepolia (`chainKey 1`), registry addresses hardcoded per chainKey; unknown chainKeys revert.

**Decoding**
- `EvmV1Decoder.decodeCommonTxFields` → `from` (reviewer / registrant activity), `decodeReceiptFields` → status and logs; logs are filtered by `address_` (official ERC-8004 registries only) and `topics[0]` (`NewFeedback`, `FeedbackRevoked`, `Registered`, `Transfer`).

**Why the product dies without Attestcoin**
- Every fact (feedback existence, reviewer age in blocks, clone density, gaps) is derived from proven Ethereum history. Without proofs `record` would trust the caller, i.e. it becomes a signed aggregator. A contract on Ethereum cannot read its own chain's history; a contract on Creditcoin can, through Attestcoin.

**Measured**
- Proofs: `proof-by-tx/3/…` HTTP 200 for txs from Aug 2026 (95–100 roots), Apr 2026 (183), Jan 2024 (604). On-chain `verify` = true at 117,971 / 157,059 / 414,624 gas respectively.
- Contract-side gas (forge, precompile mocked, real txBytes): `recordFeedback` 259,094; `recordRegistered` (8 logs) 439,104; activity 129,475–183,724.
- Scout dry-run on agent 34135: 25 feedbacks, 15 reviewers, 4 proofs chosen (~2.5M gas est.), 31 rejected with reasons, 8 proofs fetched (19–684 roots).

**Deployment (CC3 Testnet, chainId 102031, all verified on Blockscout — v2 after code review)**
- `GroundedFacts` 0x47212CE74EA4D6e300922AeB389A7b0a9D81Aabc — https://creditcoin-testnet.blockscout.com/address/0x47212CE74EA4D6e300922AeB389A7b0a9D81Aabc
- `AgentHireEscrow` 0x153201A94E83AB5aA1C64f095375F2916EDA9F98 — https://creditcoin-testnet.blockscout.com/address/0x153201A94E83AB5aA1C64f095375F2916EDA9F98
- `CoverageBounty` 0xBaAEAb3f635D39F6a9019745270Daf1812E0aE70 — https://creditcoin-testnet.blockscout.com/address/0xBaAEAb3f635D39F6a9019745270Daf1812E0aE70
- Deployer 0x3D3645529277091Fc12ee3eA9c8E2cA6F3390E49 · v1 deployment (same code before the review fixes) at 0x7DDE4Ad3…, 0x20497F17…, 0x1f29E842… remains on chain.
- Live UI: https://k3cs.github.io/TinjauAI/ (reads `facts()`/`quote()` from the contracts above)

**Measured on testnet (v2)**
| # | Tx (Creditcoin CC3 Testnet, 29–30 Aug 2026) | Block | gasUsed |
|---|---|---|---|
| 1 | deploy GroundedFacts `0xb617ab23ccc0fb8ac3e42e28bdecc9dd246b354f62962a0b960a35eab2eaa86a` | 5395591 | 2,808,637 |
| 2 | deploy AgentHireEscrow `0x04fa55a60997145902a96c1767bb50c43c9fb3fbaa2fb32b077a31e506372ccb` | 5395592 | 814,892 |
| 3 | deploy CoverageBounty `0x05339b92afea5d2fd32d0120d36ded0e5dd2ed9e8b1a1a19f97f63e96ffa9073` | 5395593 | 770,359 |
| 4 | record 22771 batch 1 (Registered, reviewerOwnsAgent, feedback+activity) `0x76605e445ed7462286e66e1a489741eb3e64ed5638edce471b98d90606015f51` | 5395605 | 2,246,165 |
| 5 | record 22771 batch 2 (feedback+activity ×2, tx @16.9M/@17.0M) `0x3fae28b32c9e1aaad6be6b06e1eddd7ad80692d2a0649cd5eccd5a22e523bc32` | 5395606 | 1,973,870 |
| 6 | record 50283 batch 1 (Registered, higherIndex #32, reviewerOwnsAgent, cloneSibling) `0x5f3f7a14a7290c24ff226a1835e18ba36c846f41c346b50f0b5ccb0451452bf8` | 5395611 | 1,972,690 |
| 7 | record 50283 batch 2 (cloneSibling ×4) `0xe58b1d2c68eb8cb9cc84eaad38516546410eaf79afbd0bdabf80baff43872247` | 5395612 | 1,229,062 |
| 8 | record Sepolia chainKey 1 NewFeedback (agent 9865, 15 roots) `0xefd5f240330ffb0d1f22accac0765edbe09704b9012b898efe33b0f815849b9a` | 5395613 | 303,069 |
| 9 | record mainnet mass-registration tx (10 Registered, 52 KB txBytes) → sameTxSiblings 9 `0x8e519fe95194f215eb2f6f6845a7e00b45e2e54607a0d1e9c87c84d180ea5d97` | 5395615 | 2,821,552 |
| 10 | fund bounty #0 on 21548 (0.05 tCTC) `0xb90f504bf28d18e4df82db0a7680b92b64af1adb61725f93338da21ae4d1a5b6` | 5395616 | 252,252 |
| 11 | scout: record 21548 batch 1 (bounty target) `0xa493d6a19ac3028737898f04dc3a7c85acd510207574b49cc2a4a404408fb325` | 5395622 | 1,725,895 |
| 12 | scout: proveAndClaim bounty #0 with final batch (paid 0.05 tCTC) `0xf4b3ae8f034cef6576e2271570ad5c120825677b0bd3bb475a63d4da1235e07c` | 5395623 | 861,110 |
| 13 | scout R4: hire 21548 (premium 1%) `0xc1435ce2e8b6cdf36377ebb326cfbe7412cd90a1b9b8a37874bd0ecd5df3bd1c` | 5395624 | 307,650 |
| 14 | hire 22771 (premium 1%, 0.0001 tCTC to owner) `0x7f902dbb29ab9962b32c4bc868cb024404365ede4f53268cc7eb72ed15930276` | 5395626 | 307,650 |
| 15 | release job 1 `0x7f6ecbb0d6e1fb61253222d3e62ed6f4a65482313b28c9c866fa14dc120a9aea` | 5395627 | 72,086 |
| — | hire 50283 → **revert `Gated(1)`** (review gap on its single reviewer) | — | estimateGas |

Per proof ≈0.30–0.56M gas (precompile + decode + storage); 17 mainnet proofs + 1 Sepolia proof admitted in 7 `record` txs; the 52 KB mass-registration tx costs 2.82M gas alone.

**On-chain facts (thresholds minAge 500,000 blocks, minDepth 2, k 3, c 5)**
- `facts(3, 22771)` = (3, 3, 3, 0, 0, 0, 0, 0, 0, 24,365,879, truncated=false) → `quote` risk 0, premium **100 bps**; hire ok.
- `facts(3, 21548)` = (3, 3, 3, 0, 0, 0, 0, 0, 0, 24,351,136, false) → hired by the scout itself (R4) after claiming the bounty.
- `facts(3, 50283)` = (1, 1, 0, 1, 0, 5, 5, 0, 0, 25,792,031, false); `reviewerOwnsAgents(0x1030…)` = 6 → `quote` risk 8,334 bps, premium **1,683 bps**, `hire` reverts `Gated(1)`.
- Off-chain recompute (`agent/src/verify.ts`, plan agent-22771) = breadthRaw 3, breadthGrounded 3, gapCount 0 — identical.
