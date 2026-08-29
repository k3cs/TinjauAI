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

**Deployment (CC3 Testnet, chainId 102031, all verified on Blockscout)**
- `GroundedFacts` 0x7DDE4Ad36827e1e975ef98c0d876454BD4c215Ad — https://creditcoin-testnet.blockscout.com/address/0x7DDE4Ad36827e1e975ef98c0d876454BD4c215Ad
- `AgentHireEscrow` 0x20497F17A14669E4D149374061BC063a4880eb7c — https://creditcoin-testnet.blockscout.com/address/0x20497F17A14669E4D149374061BC063a4880eb7c
- `CoverageBounty` 0x1f29E8427aBaF8b2Fdc24906a17fb0Fde2d885BB — https://creditcoin-testnet.blockscout.com/address/0x1f29E8427aBaF8b2Fdc24906a17fb0Fde2d885BB
- Deployer 0x3D3645529277091Fc12ee3eA9c8E2cA6F3390E49

**Measured on testnet**
| Tx (Creditcoin CC3 Testnet, 29 Aug 2026) | Block | gasUsed |
|---|---|---|
| deploy `GroundedFacts` `0x06e30a1e…4fb0e3` | 5395516 | 2,788,101 |
| deploy `AgentHireEscrow` `0xa86f96d7…d9d2ae1` | 5395517 | 783,788 |
| deploy `CoverageBounty` `0x78acbaf1…d18599c` | 5395518 | 762,803 |
| `record` agent 22771 batch 1 (Registered + reviewerOwnsAgent + 2 feedback/activity) `0xdb759cc3…389657` | 5395529 | 2,246,143 |
| `record` agent 22771 batch 2 (4 proofs incl. activity @16.9M / @17.0M) `0x8db3e950…6fc97f` | 5395530 | 1,973,848 |
| `record` agent 50283 batch 1 (Registered, higherIndex, reviewerOwnsAgent, cloneSibling) `0x433f0dce…96de3f` | 5395534 | 1,972,668 |
| `record` agent 50283 batch 2 (4 cloneSibling) `0xcdb42bd7…285c107` | 5395535 | 1,229,040 |
| `hire` 22771, premium 1% (0.0001 tCTC to owner) `0x388416db…91a04f` | 5395542 | 304,304 |
| `hire` 50283 → **revert `Gated(1)`** (review gap) | — | estimateGas |
| `release` job 0 `0x38ef9adb…65821a` | 5395543 | 70,070 |
| `fund` bounty #0 on agent 21548 (0.05 tCTC) `0xcab3d959…a3780c` | — | — |

Per proof: ≈0.31–0.56M gas (precompile + decode + storage), consistent with the 0.4–0.85M estimate. 16 mainnet proofs admitted in 4 txs.

**On-chain facts (thresholds minAge 500,000 blocks, minDepth 2, k 3, c 5)**
- `facts(3, 22771)` = (breadthRaw 3, breadthGrounded 3, breadthIndependent 3, gapCount 0, negatives 0, cloneDensityLB 0, registrantSiblings 0, uriSiblings 0, sameTxSiblings 0, firstRegisteredHeight 24,365,879) → `quote` risk 0, premium **100 bps**.
- `facts(3, 50283)` = (1, 1, 0, 1, 0, 5, 5, 0, 0, 25,792,031); `reviewerOwnsAgents(0x1030…)` = 6 → `quote` risk 8,334 bps, premium **1,683 bps**, `hire` reverts `Gated(1)`.
- Off-chain recompute (`agent/src/verify.ts`, plan agent-22771) = breadthRaw 3, breadthGrounded 3, gapCount 0 — identical.
