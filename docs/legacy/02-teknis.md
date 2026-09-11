# Tinjau — Kebutuhan Teknis

Versi 1.0 · 29 Agu 2026 · Repo `hackathons/ctc/build/grounded-reputation/`

## 1. Lingkungan

| Komponen | Nilai |
|---|---|
| Chain target | Creditcoin CC3 Testnet, chainId 102031, RPC `https://rpc.cc3-testnet.creditcoin.network`, explorer `https://creditcoin-testnet.blockscout.com` |
| Chain sumber | Ethereum mainnet (Attestcoin chainKey 3), Sepolia (chainKey 1) |
| Prover API | `https://proof-gen-api.cc3-testnet.creditcoin.network/api/v1` (`attested-height/{chainKey}`, `proof-by-tx/{chainKey}/{tx}`, `proof-batch-by-tx/{chainKey}`) |
| Precompile | BlockProver `0x…0FD2` (`verify` view, `verifyAndEmit`, `calculateTxIndex`), ChainInfo `0x…0fd3` |
| Registri ERC-8004 | mainnet Identity `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`, Reputation `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`; Sepolia `0x8004A818BFB912233c491871b3d84c89A494BD9e`, `0x8004B663056A597Dffe9eCcC1965A193B7388713` |
| Toolchain | Foundry 1.7.1 (solc 0.8.28, via_ir), Node 24, ethers v6, tsx; `@gluwa/usc-contracts` 0.2.0 (vendored `lib/usc/`) |
| Faucet | Discord Creditcoin, kanal `token-faucet`: `/faucet address:<EVM address>` |
| Data eksplorasi | eth.blockscout.com (`getLogs`, `txlist`, v2 API) |

## 2. Arsitektur

```
Ethereum (mainnet/Sepolia)                Prover API (CC3)              Creditcoin CC3 Testnet
ERC-8004 Identity/Reputation  --logs-->  GroundedScout (TS)  --proof-->  GroundedFacts.record()
  NewFeedback / FeedbackRevoked                 |                          |  verify precompile
  Registered / Transfer                          |                          |  EvmV1Decoder → fakta
  tx apa pun (aktivitas pengulas)                |                          v
                                                 +--> CoverageBounty.proveAndClaim()  -> AgentHireEscrow.quote/hire()
verify.ts (siapa pun): hitung ulang fakta dari proof yang sama, off-chain
```

## 3. Spesifikasi kontrak

### 3.1 `GroundedFacts`
- `record(Proof[] calldata) → uint256 admitted`. Per proof: `UnknownChain` bila chainKey tak dikenal; `ProofRejected` bila `verify` false; dedup kunci `(chainKey, height, txIndex)` (skip, bukan revert); `decodeCommonTxFields.from` → aktivitas; `decodeReceiptFields` → status harus 1 untuk memproses log; log diterima hanya bila `address_` = registri resmi chainKey itu.
- Event yang ditangani: `NewFeedback` (topics agentId, client; data feedbackIndex, value, decimals…), `FeedbackRevoked` (3 topic indexed), `Registered` (agentId, owner indexed; data agentURI), `Transfer` (ERC-721; mint diabaikan).
- Aktivitas: `oldestHeight[addr]` = min; `bucketCount[addr]` = jumlah bucket 216.000 blok berbeda.
- Fakta agent: `owner` (mengikuti `Transfer` bila `from` = pemilik tercatat), `registrant` = `from` tx `Registered`, `uriHash`, `txKey`, `transfersProven`.
- `facts(chainKey, agentId, minAge, minDepth) → Facts` (10 field). `reviewerSeniority`, `reviewerOwnsAgents`, `clientsOf`.
- Batas: iterasi `clientsOf` linear (cukup untuk ≤ ratusan pengulas); tidak ada admin, tidak ada upgrade.

### 3.2 `AgentHireEscrow`
- `quote(chainKey, agentId, Params) → (riskBps, premiumBps, gapCount, Facts)`; `risk = 10000 − coverage·cloneFactor/10000`, `coverage = min(10000, breadthGrounded·10000/k)`, `cloneFactor = c·10000/(c + cloneDensityLB)`.
- `hire(...) payable`: revert `Gated` bila `gapCount > 0`, `UnknownAgent` bila belum ada `Registered` terbukti; premi dibayar ke `owner` saat itu; sisa ditahan; `release` oleh penyewa; `refund` setelah deadline.

### 3.3 `CoverageBounty`
- `fund(chainKey, agentId, minAge, minDepth, k, c, expiry) payable` menyimpan `decision = keccak(bg ≥ k, gap == 0, cloneLB ≥ c, negatives > 0)`.
- `proveAndClaim(id, proofs)`: `facts.record` lalu bandingkan tuple; `NoChange` revert; bayar penuh ke pengirim; tutup.
- `withdraw` oleh pendana setelah `expiry`.

### 3.4 Keamanan
- Tidak ada dana di `GroundedFacts`. Eskrow/bounty memakai `call` dengan efek state sebelum transfer (CEI). Tidak ada reentrancy guard eksplisit (state ditutup sebelum transfer); ditandai untuk review.
- Serangan yang diketahui dan statusnya: dosier §8.3.

## 4. Spesifikasi agent (`agent/src/scout.ts`)

| Peran | Input | Keputusan | Output |
|---|---|---|---|
| R1 Targeting | `CoverageBounty.bounties`, `NewFeedback` 7 hari terakhir, `--agents` | urutan: bounty terbuka → agent teraktif; batas `--maxTargets` | daftar target + alasan |
| R2 Dua arah | log registri per agent, `txlist` pengulas, `Registered` per pemilik | helps: ulasan pertama + tx tertua + bucket; hurts: negatif, indeks tertinggi, pencabutan, pengulas-pemilik, saudara klon | kandidat dengan `estGas` |
| R3 Timing | `txSeen`, harga gas 0,5 gwei, nilai bounty | buang yang sudah dimasukkan; `prove now` bila bounty ≥ biaya | proof yang dikirim / alasan menunggu |
| R4 Konsumen | `facts`, `quote`, `--hireWei` | sewa bila lolos ambang sendiri; kalau tidak, danai bounty | tx `hire` / `fund` |

- Estimasi gas: `precompile ≈ 110k + 600·roots`, `roots ≈ 90 + umur/13.000 blok`; decode: ulasan 260k, pendaftaran 440k, aktivitas 130k (terukur).
- Batch: ≤4 proof per tx `record`. Mode: dry-run (tanpa `PRIVATE_KEY`/`--facts`) menulis `plans/*.json`; live mengirim tx.
- `verify.ts`: decode `txBytes` (`(uint8, bytes[])`, chunk 0 = common, chunk 2/3 = receipt) dan hitung ulang fakta per pengulas.

## 5. Kriteria penerimaan

| # | Kriteria | Cara uji |
|---|---|---|
| A1 | `forge test` hijau dengan fixture `txBytes` mainnet asli | 14 test (7 fakta, 7 konsumen) |
| A2 | Deploy 3 kontrak di CC3 Testnet, terverifikasi di Blockscout | `script/Deploy.s.sol`, `forge verify-contract` |
| A3 | `record` live untuk ≥1 proof mainnet chainKey 3 dan ≥1 Sepolia chainKey 1, gas nyata dicatat | hash tx di dosier |
| A4 | Scout live: target dipilih sendiri, ≥1 bukti "hurts" dan ≥1 "helps" dikirim, log keputusan tersimpan | `plans/*.json` + tx |
| A5 | `proveAndClaim` membayar sekali dan `NoChange` untuk bukti berulang | tx testnet |
| A6 | `hire` dengan premi berbeda untuk dua agent nyata | tx testnet |
| A7 | `verify.ts` menghasilkan angka sama dengan `facts()` | log |
| A8 | Video ≤3 menit + README + Attestcoin Integration Summary + dosier | submission DoraHacks |

## 6. Risiko teknis yang tersisa

- `sameTxSiblings` pada tx pendaftaran massal (>100 log): decode memory besar; belum diuji.
- `txlist` Blockscout hanya 40 tx pertama per pengulas: senioritas bisa diremehkan (konservatif).
- Rate limit Blockscout/prover saat scout memindai banyak pengulas.
- Precompile tidak bisa diemulasi Foundry: pengujian penuh hanya di testnet.
