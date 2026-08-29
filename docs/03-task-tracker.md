# Grounded Agent Reputation — Task Tracker

Turunan dari `02-teknis.md`. Status: ✅ selesai · 🔄 berjalan · ⏳ menunggu · ⬜ belum · ❌ dibatalkan. Deadline submission: 7 Sep 2026 10:59 WIB.

## T1 Kontrak (A1)
| ID | Task | Status | Bukti/Catatan |
|---|---|---|---|
| T1.1 | Foundry project, vendor `usc-contracts` (`EvmV1Decoder`, `INativeQueryVerifier`) | ✅ | `foundry.toml`, `lib/usc/` |
| T1.2 | `GroundedFacts`: verify, dedup, decode, feedback/revoke, aktivitas, identitas, `facts()` | ✅ | `src/GroundedFacts.sol` (342 baris) |
| T1.3 | Provenance: `registrant`, `registrantSiblings`, `sameTxSiblings`, `uriSiblings`, owner mengikuti `Transfer` | ✅ | test `test_recordRegistered_mainnet` (pola pabrik → ERC-6551) |
| T1.4 | `AgentHireEscrow` premi dinamis, release/refund | ✅ | 4 test |
| T1.5 | `CoverageBounty` fund/proveAndClaim/withdraw | ✅ | 3 test |
| T1.6 | Fixture proof mainnet asli (feedback, Registered, aktivitas 2024 & 2026) | ✅ | `test/fixtures/` |
| T1.7 | Uji `sameTxSiblings` dengan tx pendaftaran massal | ❌ dipotong | scope-cut 29 Agu |
| T1.8 | Review keamanan ringan (reentrancy, overflow cast) + lint | ❌ dipotong (opsional bila sisa waktu) | scope-cut 29 Agu |

## T2 Deploy (A2, A3)
| ID | Task | Status | Bukti/Catatan |
|---|---|---|---|
| T2.1 | Wallet deployer + `.env` | ✅ | `0xd25079d4E75076b1271e2283ed94c93BF92A77B9` |
| T2.2 | tCTC dari faucet Discord | ⏳ Dien | `/faucet address:0xd250…77B9` |
| T2.3 | `forge script Deploy --broadcast` | ⬜ | tergantung T2.2 |
| T2.4 | Verifikasi kontrak di Blockscout CC3 | ⬜ | |
| T2.5 | `record` live: 1 proof mainnet + 1 proof Sepolia; catat gas nyata | ⬜ | perbarui dosier §5/§8.4 |
| T2.6 | Buat ulasan & agent sendiri di registri **Sepolia** (cadangan demo chainKey 1) | ❌ dipotong | scope-cut 29 Agu |

## T3 Agent (A4–A6)
| ID | Task | Status | Bukti/Catatan |
|---|---|---|---|
| T3.1 | Scout v1: discovery, keputusan, proof, dry-run | ✅ | plan 34135/50283 |
| T3.2 | Peran R1 targeting (bounty → registri aktif) | ✅ | log `[R1]` |
| T3.3 | Peran R2 bukti dua arah (negatif, indeks tinggi, pencabutan, pengulas-pemilik, klon) | ✅ | log `[R2]` 50283: 7 hurts |
| T3.4 | Peran R3 timing (`txSeen`, bounty ≥ biaya) | ✅ (dry-run) | uji live setelah T2.3 |
| T3.5 | Peran R4 konsumen (`hire` / `fund`) | ✅ (kode) | uji live |
| T3.6 | Verifier off-chain | ✅ | `verify.ts` = `facts()` untuk 34135 |
| T3.7 | Kebijakan anggaran: "helps" tidak boleh selalu kalah oleh "hurts" (alokasi per arah) | ⬜ | dry-run: helps ditolak karena budget habis |
| T3.8 | Scout live end-to-end + `proveAndClaim` + `hire` | ⬜ | tergantung T2 |
| T3.9 | Jalankan 2 scout paralel untuk menunjukkan R3 (kompetisi) | ❌ dipotong | scope-cut 29 Agu |

## T4 Dokumen & submission (A8)
| ID | Task | Status | Bukti/Catatan |
|---|---|---|---|
| T4.1 | README, `ATTESTCOIN_INTEGRATION.md` | ✅ | perbarui alamat setelah deploy |
| T4.2 | Dosier penilaian (`docs/evaluation-dossier.md`) | ✅ v1.2 | revisi §6 dengan peran agent |
| T4.3 | Dokumen produk / teknis / tracker | ✅ | `docs/01-03` |
| T4.4 | Skrip video 3 adegan + rekaman ≤3 menit | ⬜ | |
| T4.5 | Deck/whitepaper PDF (syarat DoraHacks) | ⬜ | bisa dari `01-produk.md` |
| T4.6 | Commit & push repo publik (original work) | ⏳ Dien | belum ada commit |
| T4.7 | Submission DoraHacks (nama, deskripsi, Integration Summary, repo, video, tim) | ⬜ | |

## Rencana implementasi rinci: `hackathons/ctc/outputs/04-planning/implementation-plan.md` (Task 1–11, owner & exit criterion per langkah)

## Urutan berikutnya (setelah scope-cut 29 Agu, `hackathons/ctc/outputs/03-product/scope-cut.md`)
Jalur kritis (≈21,5 jam dari 43 tersedia): T2.2 faucet (Dien) → T2.3 deploy → T2.5 record live 2 agent → facts/quote + hire → T3.7 → T3.8 scout live → T4.6 commit/push → T4.4 video → T4.5 deck → T4.7 submit → T4.2 dosier v1.3.
Dipotong (sengaja, jawaban ke juri di scope-cut): T1.7, T1.8, T3.9, T2.6, bounty di demo live. Gerbang: 1 Sep 11:00 deploy + 1 record; 3 Sep 06:00 hire + scout live + push; 6 Sep 04:00 video/deck/form; 6 Sep 22:00 kunci.
