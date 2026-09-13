# Attestcoin Integration Summary: Tinjau v3

Tinjau is a verified background check for AI agents (a credit bureau in Creditcoin's sense: it records, it does not lend or judge). Its Creditcoin contract `GroundedFacts` admits facts about ERC-8004 agents and their reviewers **only** through Attestcoin proofs of Ethereum transactions. This page lists every Attestcoin surface Tinjau uses, why the product cannot exist without it, and every testnet transaction, with gas.

All numbers below were measured on 11–13 Sep 2026 against Creditcoin CC3 Testnet (chainId 102031) unless marked otherwise. The contracts were redeployed on 12 Sep 2026 (to add `recordBatch` and to drop Sepolia); every admitted transaction was re-proven into the new contract on 13 Sep, and the numbers here are from that deployment. Contracts are verified on Blockscout.

| Contract | Address |
|---|---|
| `GroundedFacts` | [`0x67394eC13E911ab0D3A26132BECa404F26e17a98`](https://creditcoin-testnet.blockscout.com/address/0x67394eC13E911ab0D3A26132BECa404F26e17a98) |
| `AgentHireEscrow` | [`0xF801a8a01E018f3Bf9a648F4C095a53979282EEA`](https://creditcoin-testnet.blockscout.com/address/0xF801a8a01E018f3Bf9a648F4C095a53979282EEA) |
| `CoverageBounty` | [`0xa27f14CD50BF334E7Fb09601cEf203745aADF569`](https://creditcoin-testnet.blockscout.com/address/0xa27f14CD50BF334E7Fb09601cEf203745aADF569) |

## 1. Precompiles used, inside the contract

| Precompile | Call | What Tinjau does with it |
|---|---|---|
| BlockProver `0x…0FD2` | `verify(chainKey, height, encodedTx, merkleProof, continuityProof)` | Every `record` call verifies each proof before reading a single byte of it. A failed proof reverts with `ProofRejected(i)`. |
| BlockProver `0x…0FD2` | `calculateTxIndex(merkleProof)` | Keys each admitted transaction by `(chainKey, height, txIndex)`: duplicates are skipped (not reverted), so several scouts can race without double-counting. It also orders ownership transfers exactly (height, txIndex, logIndex), so the newest proven transfer wins whatever order proofs arrive in. |
| AttestorStash `0x…0FD4` | `getAttestorsCount(chainKey)` | Read on every admitted proof. `facts().minAttestors` reports the lowest attestor count registered for the source chain at the moment any of the agent's facts was admitted (network context at admission, not the signers of a specific proof); `AgentHireEscrow` lets a hirer refuse facts admitted while too few attestors were registered (`ThinQuorum`). Live value: 4 attestors for Ethereum mainnet, 100 CTC bond each. |
| ChainInfo `0x…0FD3` | `get_latest_attestation_height_and_hash(chainKey)` | `attestedTip(chainKey)` exposes how far Creditcoin has attested; with `facts().coveredThrough` (the highest source height among the agent's proven facts) a hirer can refuse stale facts (`Stale`). `Stale` measures the age of the newest proven fact, not whether every block up to the tip was examined. Live value on 13 Sep 2026: Ethereum tip 25,968,140. |

AttestorStash and ChainInfo have snake_case vs camelCase selector conventions that are not in the public docs; both were checked live on CC3 testnet before use (`contracts/src/interfaces/IPrecompiles.sol`).

## 2. Decoding and binding

- The official `EvmV1Decoder` (`@gluwa/usc-contracts` 0.2.0, vendored in `contracts/lib/usc/`) decodes the proven bytes: `from` (reviewer activity), receipt status, logs.
- **Inclusion is not success.** Logs of a reverted source transaction are never used; the sender's activity still counts (they paid gas).
- **Emitter binding.** A log is used only if `address_` equals the official ERC-8004 registry configured for that chainKey (constructor argument, no admin). A look-alike `NewFeedback` from any other contract, or a Sepolia registry log inside a mainnet proof, is ignored (tests `test_ignoresLogsFromOtherEmitters`).
- Events handled: `NewFeedback`, `FeedbackRevoked` (ReputationRegistry), `Registered`, `Transfer` (IdentityRegistry).
- **Completeness from the source protocol.** The registry's own per-pair `feedbackIndex` counter (`++_lastIndex[agentId][client]`) lets the contract see holes below the highest proven index (`gapCount`). A reviewer counts as grounded only when all their indices are proven, so omitting a review never helps an agent. This exposes **known gaps** below the highest proven index; it does not prove that index is the registry's latest, so Tinjau reports admitted evidence, never a complete history.

## 3. Why the product dies without Attestcoin

Every fact (a review exists, a reviewer was active for years before reviewing, a review index is missing, an owner holds N agents, 10 agents came from one transaction) is derived from Ethereum history. An EVM contract cannot read its own chain's history, and a contract on another chain cannot read Ethereum at all. Without the proof, `record` would have to trust its caller, and Tinjau would become one more signed off-chain aggregator (RNWY, 8004scan), which is exactly what the ERC-8004 spec leaves consumers to trust today. With Attestcoin, a Creditcoin contract checks the history itself and can lock money on it.

## 4. One source chain by design, and mainnet-ready

- The contract takes its registry table per chainKey from the constructor, so several source chains can run through one deployment; the 11 Sep deployment admitted Ethereum mainnet (chainKey 3) and Sepolia (chainKey 1). The 12 Sep deployment keeps **Ethereum mainnet only**: a Sepolia registry entry costs nothing to mint, so admitting it would let anyone fabricate a record for free (`scripts/deploy.sh`). Proofs for chainKey 1 now revert `UnknownChain(1)`. 33 mainnet source transactions are admitted.
- **CC3 mainnet check (11 Sep 2026, read-only):** the proof for agent 22771's mainnet registration, fetched from the CC3 **mainnet** proof builder (Ethereum = chainKey 1 there), returns `verify = true` from the `0x0FD2` precompile on CC3 mainnet (chainId 102030), 127,746 gas: the same gas as on testnet for the same transaction. The same registries, the same contract code, and the same proofs work on mainnet; only the chainKey in the constructor changes. Mainnet AttestorStash reports 7 attestors for Ethereum with a minimum bond of 0.

## 5. Precompile gas, measured per proof (`eth_estimateGas` on `verify`)

| Source height (Ethereum) | Continuity roots | `verify` gas |
|---|---|---|
| 14,306,215 (2 Mar 2022, oldest admitted) | 786 | 506,986 |
| 22,841,017 | 984 | 631,434 |
| 24,365,879 (agent 22771 registration) | 122 | 127,746 |
| 25,489,494 | 7 | 62,292 |
| 25,949,112 | 89 | 112,477 |

Gas tracks the number of continuity roots (≈ 55k + ~580 per root), which depends on the distance to the nearest attestation checkpoint rather than on age alone. Total per admitted proof, including decoding and storage, is 0.3–0.6M gas; the 52 KB mass-registration transaction (10 `Registered` logs) costs 2,999,199 gas alone.

## 6. Every testnet transaction (v3, 12 Sep deployment)

| # | Block | Kind | Tx (CC3 testnet) | gasUsed | Note |
|---|---|---|---|---|---|
| 1 | 5,475,585 | deploy | [`0x9cb61f28…8ba6`](https://creditcoin-testnet.blockscout.com/tx/0x9cb61f2888af36b4ccab38064c82c0a1e4b44a84e149706f349abacf59c98ba6) | 3,192,770 | GroundedFacts (12 Sep 21:54 WIB) |
| 2 | 5,475,586 | deploy | [`0xad10ca1d…feab`](https://creditcoin-testnet.blockscout.com/tx/0xad10ca1d257dcfc80535795be811fd8a1e71a17a159be1cea669ba13c728feab) | 920,666 | AgentHireEscrow |
| 3 | 5,475,587 | deploy | [`0x6c663e7c…b940`](https://creditcoin-testnet.blockscout.com/tx/0x6c663e7c0d68cc810e742ca4e71dd49f72c6fd8c5d2c80ee54d7f0b8edd6b940) | 862,895 | CoverageBounty |
| 4 | 5,480,420 | fund | [`0xea3b3712…b27f`](https://creditcoin-testnet.blockscout.com/tx/0xea3b3712f6274a601270106d8396d0c334907ec71b0374641f6540441b1ab27f) | 284,256 | bounty #0 on agent 21548, 0.05 tCTC (13 Sep 18:05 WIB) |
| 5 | 5,480,426 | record | [`0x36781b79…ff7b`](https://creditcoin-testnet.blockscout.com/tx/0x36781b79351ef730cb7307c68131fcc299d0e12639aa95b2f74cfb57cb3bff7b) | 1,736,223 | scout, agent 21548, 4 proofs |
| 6 | 5,480,427 | proveAndClaim | [`0x8a32b470…d68d`](https://creditcoin-testnet.blockscout.com/tx/0x8a32b4704d6c336ad72d626f55339c3f065d2e21caf6dc8a097d3a73b5bcd68d) | 1,292,891 | scout, agent 21548, 3 proofs; decision flipped, bounty paid |
| 7 | 5,480,428 | hire | [`0x02933cb3…48d0`](https://creditcoin-testnet.blockscout.com/tx/0x02933cb3b2d287e6a0d0b62f9e84cdcb5363cb9789240b742246b4ca712348d0) | 333,522 | scout hires 21548, premium 100 bps |
| 8 | 5,480,444 | record | [`0x4c3283ad…a620`](https://creditcoin-testnet.blockscout.com/tx/0x4c3283ad7ef3bdf9ce2086a663fe7a0d156d76900d841f8f540aa3ee9087a620) | 2,229,802 | scout, agent 22771, 4 proofs |
| 9 | 5,480,445 | record | [`0x6e94b12b…800d`](https://creditcoin-testnet.blockscout.com/tx/0x6e94b12b4968aef68b79d185013a745043e9d0fd07ea9c4cb1ca90ba1f88800d) | 1,439,328 | scout, agent 22771, 3 proofs |
| 10 | 5,480,446 | hire | [`0x3a8d2c53…b8c4`](https://creditcoin-testnet.blockscout.com/tx/0x3a8d2c53ef4d8f59f9f2d77c5f55f8d2fb15ec110cbc540860c266d19616b8c4) | 333,522 | scout hires 22771, premium 100 bps |
| 11 | 5,480,449 | record | [`0x53315fa0…c6b8`](https://creditcoin-testnet.blockscout.com/tx/0x53315fa06dd4b3d57db9d697ff2e863819f4005cdd81ca21e5ca63904531c6b8) | 1,490,402 | scout, agent 50283, 4 proofs |
| 12 | 5,480,450 | record | [`0xda7d9263…1b1c`](https://creditcoin-testnet.blockscout.com/tx/0xda7d926313d1f0f499318c33665642be308cf8f697c3b1cfa99ce7adb2bc1b1c) | 935,394 | scout, agent 50283, 3 proofs |
| 13 | 5,480,456 | record | [`0x6f8cb9a8…42c4`](https://creditcoin-testnet.blockscout.com/tx/0x6f8cb9a8dad239dd7b71a3dbd0761eae67906b58c89298839509edcbe04d42c4) | 2,999,199 | mainnet mass registration, 10 `Registered`, 52 KB |
| 14 | 5,480,457 | release | [`0x27fbf060…b95b`](https://creditcoin-testnet.blockscout.com/tx/0x27fbf0600eae94af02c9dadeb35e88516226f4704d585a1850496b3bec36b95b) | 78,988 | release job 1 (22771) |
| - | - | hire 50283 | `eth_call` | - | reverts `Gated(1)` (`0x393108e5…01`): one reviewer has unproven review indices |
| 15 | 5,480,466 | record | [`0xc3ed7234…cd08`](https://creditcoin-testnet.blockscout.com/tx/0xc3ed7234ea5810d763b8153e49ef546572ca1fa75c5366b73706701a3ce8cd08) | 939,249 | migration from the 11 Sep contract, 3 proofs (agents found by the unattended cycles) |
| 16 | 5,480,467 | record | [`0xa841a19b…b7d6`](https://creditcoin-testnet.blockscout.com/tx/0xa841a19b8dd8332f69bf767320c848b52391102f453daa750ef2355f37eeb7d6) | 1,011,603 | migration, 3 proofs |
| 17 | 5,480,468 | record | [`0xbb43a7ec…6686`](https://creditcoin-testnet.blockscout.com/tx/0xbb43a7ec411b4e41402d73a38f10e24864a3caa99d418d5bd5f4c2f41d446686) | 907,043 | migration, 3 proofs |
| 18 | 5,480,469 | record | [`0x1b0b8029…4df4`](https://creditcoin-testnet.blockscout.com/tx/0x1b0b802929996e6536ad4ebc7dddcec26e026262aa4f5c5198a7a88723974df4) | 1,169,781 | migration, 2 proofs (incl. the 2022 activity tx, 695 roots) |

A second scout cycle on agent 50283 (13 Sep 18:15 WIB) found all 7 of its proofs already admitted and spent 0 gas.

The 11 Sep deployment (`0xC045087F…BC47`, `0x82C604Eb…16cB`, `0x6AbF1F5F…9A0b`) held 34 admitted source transactions when it was retired; 33 were re-proven into the new contract (`services/scout/src/migrate.ts` reads the old contract's `TxAdmitted` events, fetches every proof again from the prover and records it), and the one Sepolia transaction was left out on purpose. The scout also runs unattended every three hours until the submission deadline (`scripts/scout-cron.sh` under launchd), so rows keep being added and the admitted-transaction count in this document is a floor. The full list is on-chain: every `record` emits `TxAdmitted`.
## 7. On-chain facts (thresholds minAge 500,000 blocks, minDepth 2, k 3, c 5)

| Agent | Facts | `quote` |
|---|---|---|
| 22771 | 3 reviewers, 3 grounded, 3 independent, 0 gaps, 0 clones, attestors 4 | risk 0, premium 100 bps, hired |
| 21548 | 3 reviewers, 3 grounded, 0 gaps, 0 clones, attestors 4 | risk 0, premium 100 bps, hired after the scout claimed the bounty |
| 50283 | 1 reviewer (who owns agents), 0 grounded, 1 gap, 9 clone siblings, 9 registrant siblings | risk 10,000, premium 2,000 bps, `hire` reverts `Gated(1)` |
| 50286 | found by the unattended cycle of 12 Sep: 1 reviewer (who owns agents), 0 grounded, 1 gap, 9 clone siblings | risk 10,000, premium 2,000 bps, gated |

## 8. Anyone can recompute every number

`recomputeFromChain()` (`packages/core/src/recompute.ts`) reads every `TxAdmitted` event from `GroundedFacts`, finds each source transaction on Ethereum by (block, index), fetches its proof again from the Attestcoin prover, and replays it through an off-chain copy of the contract logic. On 13 Sep 2026 it replayed all 33 admitted transactions of the 12 Sep deployment and produced facts identical to `facts()` for agents 22771, 50283, 21548 and 50286. The scout keeps running on a schedule until the submission deadline, so the admitted-transaction count only grows; every number here is a floor, not a ceiling. The MCP tool `tinjau_verify` exposes the same check to any agent. Public Ethereum RPCs have started pruning pre-merge history (publicnode on 13 Sep 2026: "earliest available 15500000"), so the (block, index) → hash lookup falls back to the chain's Blockscout block listing; the proof itself is still fetched from the Attestcoin prover and verified by the precompile.

## 9. What this does not claim

- Attestcoin moves trust from RPCs and indexers to Creditcoin's bonded attestor set; it does not remove trust.
- Only Ethereum mainnet is admitted (Sepolia excluded by design since 12 Sep); Base (where most ERC-8004 activity is) is not readable by Attestcoin today.
- A review nobody has submitted yet is invisible; only gaps below the highest proven index show.
- There is no consumer contract on Creditcoin today; `AgentHireEscrow` is an example consumer.
- `minAttestors` is the registered attestor count at admission, not a proof-specific signer count; `coveredThrough` is the newest proven relevant height, not a completeness certificate.
- Facts are admitted evidence with known gaps, never a complete history.
- Evidence Exchange: the decision-delta payout (`fund` / `decisionOf` / `proveAndClaim`) and source-order conflict resolution are live; `proveBatchAndClaim`, an adjudication receipt (decision before and after, predicate flipped) and same-transaction hire re-pricing are not built.

## 10. Who submits proofs, and why that cannot corrupt a fact

Anyone can call `record` or `proveAndClaim`; Tinjau's own scout does so unattended every three hours (`scripts/scout-cron.sh`, scheduled by launchd on the builder's machine). A submitter only carries proofs: `verify` rejects anything not included in an attested Ethereum block, and logs are used only from the official registries. A dishonest submitter can therefore only withhold evidence, which the registry's per-pair counter exposes as `gapCount`. Who submits affects completeness, never correctness.
