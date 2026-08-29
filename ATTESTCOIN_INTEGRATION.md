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

**Deployment** (CC3 Testnet): pending faucet — addresses will be listed here.
