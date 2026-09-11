# Code review: Tinjau v3 contracts (CON-14)

Date: 11 Sep 2026 · Scope: `contracts/src/` (GroundedFacts, AgentHireEscrow, CoverageBounty, interfaces) · Reviewer: Claude (manual review against security, correctness, gas) · Result: 3 findings fixed, 0 open critical. Tests after fixes: 41/41.

## Findings (fixed)

| # | Severity | File | Issue | Fix | Test |
|---|---|---|---|---|---|
| 1 | High (funds) | `CoverageBounty.sol` `proveAndClaim` | Compared the decision with the snapshot taken at funding. If anyone moved the facts via `GroundedFacts.record` directly, any caller could claim the bounty with zero proofs. | Compare the decision immediately before and after `record(proofs)` in the same call. | `test_bounty_cannotFreeRideOnSomeoneElsesProof` |
| 2 | Medium (omission helps) | `AgentHireEscrow.sol` `hire` | With more than `MAX_REVIEWERS` (256) reviewers, pairs past the cap are not examined, so a hidden review there would not gate the hire. | `hire` reverts `Truncated()` when `facts().truncated`. | `test_hire_truncatedFactsAreRefused` |
| 3 | Medium (omission helps) | `GroundedFacts.sol` `facts` | Seniority used the earliest *proven* review. Proving only a later review made a reviewer look older at review time than they were. | A reviewer counts as grounded only if every review index up to the highest proven one is proven (`maxIndex == known`). | `test_groundedRequiresEveryIndexProven`, `test_fixture_oldActivityGroundsReviewer` |

## Checked, no change

- Reentrancy: escrow and bounty set state (`closed`, job pushed) before any value transfer (CEI); `GroundedFacts` holds no funds and calls only precompiles.
- Proof binding: `verify` binds `encodedTx` to the Merkle root at `height`; every decoded field (sender, status, logs) comes from the proven bytes, never from the caller. Reverted source txs contribute activity only, never logs.
- Emitter spoofing: logs are accepted only when `address_` equals the registry configured for that chainKey (tested with a fake registry and with a Sepolia registry inside a mainnet proof).
- Ownership order: newest proven transfer wins by (height, txIndex, logIndex), whatever order proofs arrive in (tested).
- Casts: `uint32(attestors)` is clamped; `uint16(premiumBps)` ≤ 10 000 by `BadParams`; order packing assumes txIndex and logIndex < 2^32 (documented).
- Gas: `facts()` is bounded at 256 reviewers; `record` gas scales with the proven receipt and is paid by the caller.
- Admin: none in any contract; registries fixed at construction.

## Accepted risks (documented, not fixed)

- Bounty front-running: a watcher can copy pending proofs and claim first. The facts still improve; only the payee changes.
- Aged wallets can be bought to pass `minAge`; `minDepth` raises the cost.
- Review via relayer/smart account: reviewer stays ungrounded (conservative).
- `evm_version = paris`: chosen for compatibility; newer opcodes on CC3 not tested.
