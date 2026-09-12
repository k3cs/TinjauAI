# Attestcoin Integration Summary: Tinjau v3

Tinjau is a credit bureau for AI agents. Its Creditcoin contract `GroundedFacts` admits facts about ERC-8004 agents and their reviewers **only** through Attestcoin proofs of Ethereum transactions. This page lists every Attestcoin surface Tinjau uses, why the product cannot exist without it, and every testnet transaction, with gas.

All numbers below were measured on 11 Sep 2026 against Creditcoin CC3 Testnet (chainId 102031) unless marked otherwise. Contracts are verified on Blockscout.

| Contract | Address |
|---|---|
| `GroundedFacts` | [`0xC045087Fd85Da4f2d981222b18E7e74c8040BC47`](https://creditcoin-testnet.blockscout.com/address/0xC045087Fd85Da4f2d981222b18E7e74c8040BC47) |
| `AgentHireEscrow` | [`0x82C604Ebf1090f3dceFa6F96b6DF624DF7eF16cB`](https://creditcoin-testnet.blockscout.com/address/0x82C604Ebf1090f3dceFa6F96b6DF624DF7eF16cB) |
| `CoverageBounty` | [`0x6AbF1F5F8850A347A5D5Bc6AcbA8961595C09A0b`](https://creditcoin-testnet.blockscout.com/address/0x6AbF1F5F8850A347A5D5Bc6AcbA8961595C09A0b) |

## 1. Precompiles used, inside the contract

| Precompile | Call | What Tinjau does with it |
|---|---|---|
| BlockProver `0x…0FD2` | `verify(chainKey, height, encodedTx, merkleProof, continuityProof)` | Every `record` call verifies each proof before reading a single byte of it. A failed proof reverts with `ProofRejected(i)`. |
| BlockProver `0x…0FD2` | `calculateTxIndex(merkleProof)` | Keys each admitted transaction by `(chainKey, height, txIndex)`: duplicates are skipped (not reverted), so several scouts can race without double-counting. It also orders ownership transfers exactly (height, txIndex, logIndex), so the newest proven transfer wins whatever order proofs arrive in. |
| AttestorStash `0x…0FD4` | `getAttestorsCount(chainKey)` | Read on every admitted proof. `facts().minAttestors` reports the weakest bonded attestor set behind any fact about the agent; `AgentHireEscrow` lets a hirer refuse facts admitted under too few attestors (`ThinQuorum`). Live value: 4 attestors for Ethereum mainnet, 7 for Sepolia, 100 CTC bond each. |
| ChainInfo `0x…0FD3` | `get_latest_attestation_height_and_hash(chainKey)` | `attestedTip(chainKey)` exposes how far Creditcoin has attested; with `facts().coveredThrough` a hirer can refuse stale facts (`Stale`). Live value at deploy: Ethereum tip 25,955,150. |

AttestorStash and ChainInfo have snake_case vs camelCase selector conventions that are not in the public docs; both were checked live on CC3 testnet before use (`contracts/src/interfaces/IPrecompiles.sol`).

## 2. Decoding and binding

- The official `EvmV1Decoder` (`@gluwa/usc-contracts` 0.2.0, vendored in `contracts/lib/usc/`) decodes the proven bytes: `from` (reviewer activity), receipt status, logs.
- **Inclusion is not success.** Logs of a reverted source transaction are never used; the sender's activity still counts (they paid gas).
- **Emitter binding.** A log is used only if `address_` equals the official ERC-8004 registry configured for that chainKey (constructor argument, no admin). A look-alike `NewFeedback` from any other contract, or a Sepolia registry log inside a mainnet proof, is ignored (tests `test_ignoresLogsFromOtherEmitters`).
- Events handled: `NewFeedback`, `FeedbackRevoked` (ReputationRegistry), `Registered`, `Transfer` (IdentityRegistry).
- **Completeness from the source protocol.** The registry's own per-pair `feedbackIndex` counter (`++_lastIndex[agentId][client]`) lets the contract see holes below the highest proven index (`gapCount`). A reviewer counts as grounded only when all their indices are proven, so omitting a review never helps an agent.

## 3. Why the product dies without Attestcoin

Every fact (a review exists, a reviewer was active for years before reviewing, a review index is missing, an owner holds N agents, 10 agents came from one transaction) is derived from Ethereum history. An EVM contract cannot read its own chain's history, and a contract on another chain cannot read Ethereum at all. Without the proof, `record` would have to trust its caller, and Tinjau would become one more signed off-chain aggregator (RNWY, 8004scan), which is exactly what the ERC-8004 spec leaves consumers to trust today. With Attestcoin, a Creditcoin contract checks the history itself and can lock money on it.

## 4. Two source chains, and mainnet-ready

- Ethereum mainnet (chainKey 3 on CC3 testnet) and Sepolia (chainKey 1) run through one contract. 22 mainnet source transactions and 1 Sepolia source transaction are admitted.
- **CC3 mainnet check (11 Sep 2026, read-only):** the proof for agent 22771's mainnet registration, fetched from the CC3 **mainnet** proof builder (Ethereum = chainKey 1 there), returns `verify = true` from the `0x0FD2` precompile on CC3 mainnet (chainId 102030), 127,746 gas: the same gas as on testnet for the same transaction. The same registries, the same contract code, and the same proofs work on mainnet; only the chainKey in the constructor changes. Mainnet AttestorStash reports 7 attestors for Ethereum with a minimum bond of 0.

## 5. Precompile gas, measured per proof (`eth_estimateGas` on `verify`)

| Source height (Ethereum) | Continuity roots | `verify` gas |
|---|---|---|
| 14,306,215 (2 Mar 2022, oldest admitted) | 786 | 506,986 |
| 22,841,017 | 984 | 631,434 |
| 24,365,879 (agent 22771 registration) | 122 | 127,746 |
| 25,489,494 | 7 | 62,292 |
| 25,949,112 | 89 | 112,477 |

Gas tracks the number of continuity roots (≈ 55k + ~580 per root), which depends on the distance to the nearest attestation checkpoint rather than on age alone. Total per admitted proof, including decoding and storage, is 0.3–0.6M gas; the 52 KB mass-registration transaction (10 `Registered` logs) costs 2,997,204 gas alone.

## 6. Every testnet transaction (v3)

| # | Block | Kind | Tx (CC3 testnet) | gasUsed | Note |
|---|---|---|---|---|---|
| 1 | 5,470,068 | deploy | [`0x6e42e11d…0dda`](https://creditcoin-testnet.blockscout.com/tx/0x6e42e11d243ae2bfa15e1449fecae3816f3e98ccf64b79591d49a4cf156a0dda) | 3,020,137 | GroundedFacts |
| 2 | 5,470,069 | deploy | [`0x64a8f850…eace`](https://creditcoin-testnet.blockscout.com/tx/0x64a8f850c00ba0cbef050fcdf5f97d876d803fd4599c61ec13011e3bfb01eace) | 920,666 | AgentHireEscrow |
| 3 | 5,470,070 | deploy | [`0x2035fa49…abb8`](https://creditcoin-testnet.blockscout.com/tx/0x2035fa49ce33d171a12099c2000d782268e9c495fa02ab9277fd07604562abb8) | 862,895 | CoverageBounty |
| 4 | 5,470,215 | fund | [`0x8a4dc077…dc3f`](https://creditcoin-testnet.blockscout.com/tx/0x8a4dc07710b801cbf55ce01939975d5946e91abd34ee335e5936132336bcdc3f) | 270,046 | bounty #0 on agent 21548, 0.05 tCTC |
| 5 | 5,470,218 | record | [`0x94de7b8e…7d51`](https://creditcoin-testnet.blockscout.com/tx/0x94de7b8ee4c796c5ea02ac37a2daf951d8f321717ff557dfbdddf1190c6c7d51) | 1,737,834 | scout, agent 21548, 4 proofs |
| 6 | 5,470,219 | proveAndClaim | [`0xfd342f65…cc79`](https://creditcoin-testnet.blockscout.com/tx/0xfd342f65a29c02b2ba3cd9e6aebbb9192a9910e1a47872782e7d0e4ada6ecc79) | 1,294,303 | scout, agent 21548, 3 proofs; bounty paid |
| 7 | 5,470,220 | hire | [`0xe6ba85dd…077d`](https://creditcoin-testnet.blockscout.com/tx/0xe6ba85dd9a70fe0ab0255150c044ff9b9b7eacaee70896f5c219f0ac40ff077d) | 319,312 | scout hires 21548, premium 100 bps |
| 8 | 5,470,225 | record | [`0xfdc228f8…63f9`](https://creditcoin-testnet.blockscout.com/tx/0xfdc228f86eeac92fa2049f764033e3395adccf680ba035d95b80fb38a16863f9) | 2,231,542 | scout, agent 22771, 4 proofs |
| 9 | 5,470,226 | record | [`0x00f1a2f7…f9e4`](https://creditcoin-testnet.blockscout.com/tx/0x00f1a2f76b7187a4e5de7a8475b82cd05397c06aecd9e71bf8827c5344b7f9e4) | 1,440,598 | scout, agent 22771, 3 proofs |
| 10 | 5,470,227 | hire | [`0x3c70c911…c8fe`](https://creditcoin-testnet.blockscout.com/tx/0x3c70c911bcf2b31440094d19b6ecf6562197d8f9cdec464d5e62beb82115c8fe) | 319,312 | scout hires 22771, premium 100 bps |
| 11 | 5,470,229 | record | [`0x82a8bf66…2353`](https://creditcoin-testnet.blockscout.com/tx/0x82a8bf66c24cd967cd936d38af243455b8798d5b44c1f0d8e9146b84705d2353) | 1,491,984 | scout, agent 50283, 4 proofs |
| 12 | 5,470,230 | record | [`0xe120eccd…55a6`](https://creditcoin-testnet.blockscout.com/tx/0xe120eccdedd326b0e43d8fb0a496855eb0b2dbf0899983ceb0d80140232f55a6) | 936,650 | scout, agent 50283, 3 proofs |
| 13 | 5,470,231 | record | [`0x9b78fe98…7e10`](https://creditcoin-testnet.blockscout.com/tx/0x9b78fe986333db5610ebb4a922878288c845fb0356e434244fbcfb1278207e10) | 312,228 | Sepolia `NewFeedback` (chainKey 1), 15 roots |
| 14 | 5,470,232 | record | [`0x03d459e0…24ce`](https://creditcoin-testnet.blockscout.com/tx/0x03d459e0b2055fe058ac2bb3648378bf59c84030a3d2dfd82e9dc75b807124ce) | 2,997,204 | mainnet mass registration, 10 `Registered`, 52 KB |
| 15 | 5,470,233 | release | [`0xe797621d…eb7a`](https://creditcoin-testnet.blockscout.com/tx/0xe797621d5bb1c2ddfa8f514ea0b58d5bcd8226fce0686b59ea8c01c0dc02eb7a) | 78,988 | release job 1 (22771) |
| - | - | hire 50283 | `eth_call` | - | reverts `Gated(1)` (`0x393108e5…01`): one reviewer has unproven review indices |

| 16 | 5,472,870 | record | [`0xd000ab70…9964`](https://creditcoin-testnet.blockscout.com/tx/0xd000ab70bda332c836177ccb06328258ec56df0c1c95e3d24b2c499f377f9964) | 594,349 | unattended cron cycle, agent 50286, 2 proofs |

A second scout cycle on agent 50283 found all 7 of its proofs already admitted and spent 0 gas.

The scout also runs unattended every three hours until the submission deadline (`scripts/scout-cron.sh`), so rows keep being added below #16 and the admitted-transaction count in this document is a floor. The full list is on-chain: every `record` emits `TxAdmitted`.

## 7. On-chain facts (thresholds minAge 500,000 blocks, minDepth 2, k 3, c 5)

| Agent | Facts | `quote` |
|---|---|---|
| 22771 | 3 reviewers, 3 grounded, 3 independent, 0 gaps, 0 clones, attestors 4 | risk 0, premium 100 bps, hired |
| 21548 | 3 reviewers, 3 grounded, 0 gaps, 0 clones, attestors 4 | risk 0, premium 100 bps, hired after the scout claimed the bounty |
| 50283 | 1 reviewer (who owns agents), 0 grounded, 1 gap, 6 clone siblings, 6 registrant siblings | risk 10,000, premium 2,000 bps, `hire` reverts `Gated(1)` |
| 50286 | found by the unattended cron cycle: 1 reviewer (who owns agents), 0 grounded, 1 gap, 6 clone siblings | risk 10,000, premium 2,000 bps, gated |

## 8. Anyone can recompute every number

`recomputeFromChain()` (`packages/core/src/recompute.ts`) reads every `TxAdmitted` event from `GroundedFacts`, finds each source transaction on Ethereum by (block, index), fetches its proof again from the Attestcoin prover, and replays it through an off-chain copy of the contract logic. On 12 Sep 2026 it replayed all 25 admitted transactions and produced facts identical to `facts()` for agents 22771, 50283, 21548 and 50286. The scout keeps running on a schedule until the submission deadline, so the admitted-transaction count only grows; every number here is a floor, not a ceiling. The MCP tool `tinjau_verify` exposes the same check to any agent.

## 9. What this does not claim

- Attestcoin moves trust from RPCs and indexers to Creditcoin's bonded attestor set; it does not remove trust.
- Only Ethereum-side registries are readable today; Base (where most ERC-8004 activity is) is not.
- A review nobody has submitted yet is invisible; only gaps below the highest proven index show.
- There is no consumer contract on Creditcoin today; `AgentHireEscrow` is an example consumer.
