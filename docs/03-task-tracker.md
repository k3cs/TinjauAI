# Tinjau — Task Tracker

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
| T2.2 | tCTC ke deployer | ⏳ Dien | Dien mengisi wallet-nya sendiri `0x3D36…0E49` (10.000 tCTC), tetapi deployer `0xd250…77B9` masih 0 dan kuncinya `0x3D36…` tidak ada di `.env`. Pilih: kirim ≥0,1 tCTC ke `0xd250…77B9`, atau tulis `PRIVATE_KEY` wallet `0x3D36…` ke `.env` sendiri |
| T2.3 | `forge script Deploy --broadcast` | ⏸ ditunda Dien (29 Agu: "task 3–5 nanti") | tergantung T2.2 |
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
| T3.7 | Kebijakan anggaran: "helps" tidak boleh selalu kalah oleh "hurts" (alokasi per arah) + lengkapi semua indeks pengulas yang dijadikan dasar (supaya tidak gated) | ✅ | cadangan 40% helps; commit 91d7319, 022bfc3; demo 22771: 3 senior, 0 celah |
| T3.8 | Scout live end-to-end + `proveAndClaim` + `hire` | ⬜ | tergantung T2 |
| T3.9 | Jalankan 2 scout paralel untuk menunjukkan R3 (kompetisi) | ❌ dipotong | scope-cut 29 Agu |

## T6 Frontend (DEC-004, 29 Agu)
| ID | Task | Status | Bukti/Catatan |
|---|---|---|---|
| T6.1 | Scaffold Vite+React+TS+Tailwind, token desain, font | ✅ | `web/tailwind.config.js`, `src/index.css` |
| T6.2 | Ekspor data demo dari plan + proof (`export-demo.ts`) | ✅ | `web/public/demo/facts.json` (22771 vs 50283) |
| T6.3 | Halaman: ambang konsumen, kuitansi fakta (klik → rantai bukti + stempel), meter premi, pengulas, log scout, verifikasi | ✅ | `web/src/App.tsx` |
| T6.4 | Mode live (baca `facts()`/`quote()` via RPC CC3) | ✅ kode; uji setelah deploy | `VITE_FACTS`, `VITE_ESCROW` |
| T6.5 | Audit kontras/aksesibilitas + kritik visual | ✅ | semua teks ≥4,5:1 terang & gelap |
| T6.6 | Hosting (Vercel/Pages) | ⬜ SVC-007 deferred | localhost cukup untuk video |

## T4 Dokumen & submission (A8)
| ID | Task | Status | Bukti/Catatan |
|---|---|---|---|
| T4.1 | README, `ATTESTCOIN_INTEGRATION.md` | ✅ | perbarui alamat setelah deploy |
| T4.2 | Dosier penilaian (`docs/evaluation-dossier.md`) | ✅ v1.2 | revisi §6 dengan peran agent |
| T4.3 | Dokumen produk / teknis / tracker | ✅ | `docs/01-03` |
| T4.4 | Skrip video 3 adegan + rekaman ≤3 menit | 🔄 skrip ✅ (`docs/demo-script.md`), rekaman ⏳ Dien | placeholder hash diisi setelah T2–T3 |
| T4.5 | Deck/whitepaper PDF (syarat DoraHacks) | 🔄 draf ✅ (`docs/deck.md`), PDF via marp | placeholder alamat/URL |
| T4.6 | Commit & push repo publik (original work) | 🔄 commit ✅ (5 commit); push ❌ 403 | remote `k3cs/TinjauAI` ada (publik), tapi git lokal terautentikasi sebagai `scientivan` → Dien: tambah `scientivan` sebagai collaborator, atau jalankan `gh auth login` sebagai `k3cs` di mesin ini |
| T4.7 | Submission DoraHacks (nama, deskripsi, Integration Summary, repo, video, tim) | 🔄 teks ✅ (`docs/submission.md`); submit ⏳ Dien | |

## T5 Pipeline web3-hackathon (skill & plugin per stage, mulai 29 Agu malam)
| ID | Stage → skill/plugin | Status | Output |
|---|---|---|---|
| T5.0 | 0 → `web3-hackathon-pipeline` (workspace `hackathons/ctc/` disinkronkan: HACKATHON, TEAM, REFERENCES REF-001..012, DECISIONS DEC-001..004, SERVICES SVC-001..007, SKILLS, PIPELINE, LEARNINGS; validator 0 error) | ✅ | `hackathons/ctc/*.md` |
| T5.1 | 1 → `wh-core:prior-art-scan` (4 lapis, konfirmasi ide terkunci) | ✅ | `docs/hackathon/prior-art/grounded-agent-reputation.md`; verdict CELAH NYATA sempit; Kleros/MainStreet |
| T5.2 | 1 → `wh-core:onchain-validate` (RPC 60 hari, pembanding Base/Arbitrum; tanpa Dune) | ✅ | `docs/hackathon/validation/grounded-agent-reputation.md`; 121 ulasan/60 hari; 83% klon |
| T5.3 | 2 → `superpowers:brainstorming`, `validate-idea`, `find-next-crypto-idea` | ❌ tidak dijalankan | Checkpoint 1 sudah disetujui; diganti idea-loop (OVERRIDE-001/002) |
| T5.4 | 3 → `pm-product-strategy:value-proposition` | ✅ | `hackathons/ctc/outputs/03-product/value-proposition.md` |
| T5.5 | 3 → `wh-core:scope-cut` | ✅ | `outputs/03-product/scope-cut.md`; 43 jam, gerbang 1/3/6 Sep |
| T5.6 | 3 → `product-review` (opsional) | ⬜ | bila waktu tersisa, setelah UI |
| T5.7 | 4 → `engineering:architecture` | ✅ | `outputs/04-planning/adr-001-architecture.md` |
| T5.8 | 4 → `superpowers:writing-plans` | ✅ | `outputs/04-planning/implementation-plan.md` (Task 1–11) |
| T5.9 | 4 → Checkpoint 2 (DEC-003) | ✅ disetujui Dien 29 Agu | `DECISIONS.md` |
| T5.10 | 5 → `superpowers:executing-plans` | 🔄 | Task 1 ✅, Task 6 Step 1–3 ✅, Task 7 skrip ✅, Task 8 draf+PDF ✅, Task 11 teks ✅; Task 3–5 ditunda Dien |
| T5.11 | 5 → `frontend-design:frontend-design` + `ui-ux-pro-max:ui-styling` (UI, DEC-004) | ✅ | `web/` (Vite+React+Tailwind): kuitansi fakta 2 agent, meter premi, tabel pengulas, log scout, blok verifikasi; mode demo (`public/demo/facts.json`) / live (`VITE_FACTS`); kontras AA diaudit (proven `#0B6B58`, token `edge`), reduced-motion, fokus; screenshot ditinjau di Chrome; commit 98dbc16, 022bfc3 |
| T5.12 | 6 → `superpowers:verification-before-completion` (wajib sebelum exit stage) | ⬜ | |
| T5.13 | 6 → `engineering:code-review` / `review-and-iterate` / `cso` (opsional, sesuai risiko) | ⬜ | |
| T5.14 | 7 → `wh-core:demo-package` (wajib sebelum Checkpoint 3) | ⬜ | |
| T5.15 | 7 → `elements-of-style:writing-clearly-and-concisely` (README, deskripsi) | ⬜ | |
| T5.16 | 7 → `hyperframes:hyperframes` / `marketing-video` / `create-pitch-deck` / `submit-to-hackathon` | ⬜ | video/deck; submit oleh Dien |
| T5.17 | 8 → `learn`, `pm-execution:retro` | ⬜ | setelah pengumuman |

## Rencana implementasi rinci: `hackathons/ctc/outputs/04-planning/implementation-plan.md` (Task 1–11, owner & exit criterion per langkah)

## Urutan berikutnya (setelah scope-cut 29 Agu, `hackathons/ctc/outputs/03-product/scope-cut.md`)
Jalur kritis (≈21,5 jam dari 43 tersedia): T2.2 faucet (Dien) → T2.3 deploy → T2.5 record live 2 agent → facts/quote + hire → T3.7 → T3.8 scout live → T4.6 commit/push → T4.4 video → T4.5 deck → T4.7 submit → T4.2 dosier v1.3.
Dipotong (sengaja, jawaban ke juri di scope-cut): T1.7, T1.8, T3.9, T2.6, bounty di demo live. Gerbang: 1 Sep 11:00 deploy + 1 record; 3 Sep 06:00 hire + scout live + push; 6 Sep 04:00 video/deck/form; 6 Sep 22:00 kunci.
