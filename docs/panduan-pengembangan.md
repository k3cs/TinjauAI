# Tinjau v3: Panduan Pengembangan (living document)

Versi 3.0 · dibuat 11 Sep 2026 · pemilik keputusan: Dien · penjaga dokumen: agent yang terakhir mengubah proyek

Dokumen ini adalah **sumber kebenaran pertama** untuk siapa pun (manusia atau AI agent) yang mengerjakan Tinjau v3. Status tugas rinci ada di `docs/task-tracker.md`. Kalau dokumen lain bertentangan dengan dokumen ini, dokumen ini yang benar, kecuali ada keputusan Dien yang lebih baru (§11).

---

## 0. Cara memakai dokumen ini

1. Baca §1 (ringkasan), §2 (aturan yang tidak boleh dilanggar), §3 (framing dan klaim terlarang).
2. Ambil task dari `docs/task-tracker.md` (P0 teratas yang dependensinya selesai).
3. Sebelum selesai sesi: perbarui status di tracker, log di tracker §9, angka baru di §4 dokumen ini, dan changelog §14.

Label klaim: **[Fakta]** ada sumber (hash tx, `path:baris`, URL, output perintah); **[Inferensi]** penalaran, dengan dasarnya. Jangan digabung dalam satu kalimat. Dokumen Indonesia memakai kurung `()` untuk sisipan, bukan em dash.

---

## 1. Ringkasan satu layar

| Hal | Isi |
|---|---|
| Nama | **Tinjau** (biro kredit untuk agent AI) |
| Satu kalimat | Fakta tentang agent ERC-8004 dan pengulasnya, dibuktikan dari Ethereum ke Creditcoin lewat Attestcoin. Tanpa skor, tanpa oracle |
| Hackathon | BUIDL CTC 2026 Fall, track AI; deadline **14 Sep 2026 10:59 WIB**; pengumuman 20 Sep |
| Folder | `CTC Hackathon/Tinjau/` (monorepo pnpm); repo v2 diarsipkan di `~/.Trash/grounded-reputation-v2-2026-09-11` |
| Remote | `https://github.com/k3cs/TinjauAI` (akan ditimpa lewat force-push, GH-2, izin Dien) |
| Kontrak v3 | CC3 Testnet, terverifikasi (§4.1) |
| Status 11 Sep 23:50 | Kontrak, core, scout, server, MCP, dokumen publik selesai; urutan live selesai. **Frontend menunggu aba-aba Dien.** Vercel ditunda. Video setelah frontend. Submit oleh Dien |

---

## 2. Aturan yang tidak boleh dilanggar

### 2.1 Invariant produk

1. **Fakta, bukan skor.** `GroundedFacts` tidak menghitung skor, bobot, atau vonis. Alasan: nilai Tinjau justru karena tidak menilai.
2. **Hanya proof yang masuk.** Setiap perubahan state `GroundedFacts` lewat `verify` di `0x…0FD2`. Tidak ada admin, setter, relayer tepercaya, atau upgrade.
3. **Omisi tidak boleh menguntungkan.** Pengulas dianggap senior hanya bila semua indeks ulasannya terbukti; eskrow menolak fakta `truncated`.
4. **Log hanya dari registri resmi** (alamat per chainKey dari constructor).
5. **Tidak ada LLM di jalur fakta.** LLM hanya di pembaca klaim (`apps/server/src/claims.ts`), hasilnya laporan.
6. **Bisa dihitung ulang.** Setiap perubahan logika kontrak wajib diikuti di `packages/core/src/facts-model.ts`, dan `recomputeFromChain()` harus tetap identik.

### 2.2 Aturan tindakan

| Tindakan | Aturan |
|---|---|
| Atribusi AI di git/GitHub | **Tidak pernah**: tanpa `Co-Authored-By`/`Claude-Session`, tanpa "Generated with Claude Code", agent bukan collaborator. Commit atas nama Dien |
| Push / force-push / hapus `gh-pages` | Hanya dengan izin eksplisit Dien di sesi itu |
| Deploy kontrak baru | Dilarang sebelum deadline tanpa keputusan Dien (semua hash dan angka publik merujuk deploy 11 Sep) |
| Deploy Vercel produksi | Hanya dengan izin Dien (VCL ditunda) |
| Frontend (`apps/web`, WEB-*) | Tunggu aba-aba Dien |
| `.env`, kunci privat, data pribadi | Tidak pernah di-commit; `Tinjau/.env` berisi kunci deployer |
| Submit DoraHacks | Hanya Dien |
| Transaksi on-chain dengan kunci Dien | Hanya bila task memintanya; catat hash di §4 dan tracker |
| Kode sebelum 13 Agu 2026 atau dari repo v2 | Tidak disalin (aturan "original work") |

### 2.3 Aturan kode

- Solidity 0.8.28, `via_ir`, `evm_version = paris`. `contracts/lib/usc/` adalah vendor `@gluwa/usc-contracts` 0.2.0: jangan diedit.
- Pola CEI di eskrow dan bounty wajib dipertahankan.
- `forge test` hijau (41 tes) setelah setiap perubahan kontrak; tambahkan tes untuk jalur baru.
- Precompile tidak bisa diemulasi Foundry: pakai fixture asli (`scripts/fetch-fixture.sh`) + mock, lalu verifikasi di testnet.

---

## 3. Framing dan klaim

### 3.1 Framing resmi

Tinjau adalah **biro kredit untuk agent AI**: mencatat fakta terbukti (biro), bukan meminjamkan atau menilai. Premi `AgentHireEscrow` = **biaya kredit** agent, dibayar ke pemilik agent. Kalimat pertama materi publik menyebut "AI agent" (dan "reviewer" bila muat), bukan "reputation" saja.

### 3.2 Klaim terlarang atau yang pernah salah

| Jangan tulis | Tulis |
|---|---|
| Angka, alamat, atau hash v2 (`0x4721…`, `0x1532…`, `0xBaAE…`, premi 1.683 bps untuk 50283, "17/17 tests", "18 proofs") | angka v3 di §4 |
| "Tidak ada peserta yang memakai mainnet" | "0 dari 87 BUIDL menyentuh ERC-8004" |
| "3 reviewers active for years" (22771) | "active 97 days to 4 years before their first review" |
| "Reviewer 50283 owns 43 agents" | angka on-chain dari `reviewerOwnsAgents` |
| "Works on Base / multi-chain" | "Ethereum-side registries only" |
| "Removes trust" | "moves trust to Creditcoin's bonded attestors" (mainnet min bond 0) |
| "AI scores agents" | "autonomous scout with four logged decisions; Gemini reads claims, precompile decides" |
| Hasil pembaca klaim LLM sebagai fakta | "report, not a fact" |

---

## 4. Angka resmi v3 (sumber: tracker §8, `ATTESTCOIN_INTEGRATION.md`)

### 4.1 Alamat (CC3 Testnet, chainId 102031)

| Kontrak | Alamat | Deploy |
|---|---|---|
| GroundedFacts | `0xC045087Fd85Da4f2d981222b18E7e74c8040BC47` | blok 5.470.068, 3.020.137 gas |
| AgentHireEscrow | `0x82C604Ebf1090f3dceFa6F96b6DF624DF7eF16cB` | blok 5.470.069, 920.666 gas |
| CoverageBounty | `0x6AbF1F5F8850A347A5D5Bc6AcbA8961595C09A0b` | blok 5.470.070, 862.895 gas |
| Deployer (wallet Dien) | `0x3D3645529277091Fc12ee3eA9c8E2cA6F3390E49` | ±9.999,9 tCTC |

### 4.2 Lingkungan

| Hal | Nilai |
|---|---|
| chainKey di CC3 **testnet** | Sepolia = 1, Ethereum mainnet = 3 |
| chainKey di CC3 **mainnet** | Ethereum mainnet = 1 |
| Prover testnet / mainnet | `proof-gen-api.cc3-testnet.creditcoin.network/api/v1` / `proofbuilder.cc3-mainnet-usc.creditcoin.network/api/v1` |
| RPC CC3 testnet / mainnet | `rpc.cc3-testnet.creditcoin.network` / `mainnet3.creditcoin.network` (chainId 102030) |
| Precompile | BlockProver `0x…0FD2`, ChainInfo `0x…0fd3` (selector snake_case), AttestorStash `0x…0fd4` (camelCase, tidak ada di docs) |
| Discovery Ethereum | Blockscout **REST v2** (`/api/v2/...`); `/api` v1 kena rate limit 429 pada 11 Sep |
| Toolchain | forge 1.7.1, Node 24.10, pnpm 10.18.3, TypeScript 5.9, Gemini REST (tanpa SDK), MCP SDK 1.30 |

### 4.3 Hasil live 11 Sep 2026

- 25 tx sumber teradmit per 12 Sep 2026 (24 Ethereum mainnet sejak blok 14.306.215 / 2 Mar 2022, 1 Sepolia). **Angka ini naik terus**: cron scout (SCT-8) jalan tiap 3 jam sampai deadline, jadi tulis sebagai "minimal N per <tanggal>", jangan sebagai angka tetap. Cek ulang sebelum rekam video dan submit: `pnpm -s scout verify 22771 50283 21548 50286`.
- 22771: grounded 3, gaps 0, clones 0, attestors 4 → premi 100 bps, disewa scout.
- 21548: sama; bounty #0 (0,05 tCTC) diklaim scout lewat `proveAndClaim`, lalu disewa 100 bps.
- 50283: raw 1, grounded 0, gaps 1, clones 6 → quote 2.000 bps, `hire` revert `Gated(1)`. (Klon 5 → 6 setelah siklus cron 12 Sep; premi tetap di batas maksimum.)
- Siklus kedua scout: 7/7 sudah teradmit, 0 gas.
- `recomputeFromChain()` dan `scout verify`: identik untuk ketiga agent.
- CC3 mainnet: proof pendaftaran 22771 `verify = true`, 127.746 gas; AttestorStash mainnet 7 attestor, bond minimal 0.
- Gas `verify` precompile: 62.292 (7 root) sampai 631.434 (984 root).

---

## 5. Peta monorepo

| Path | Isi | Perintah |
|---|---|---|
| `contracts/` | kontrak, tes, fixture, vendor | `pnpm test:contracts` |
| `packages/core` | config, prover client, decoder, `FactsModel`, klien kontrak, `recomputeFromChain`, `verifyWithPrecompile` | `pnpm --filter @tinjau/core test` (`LIVE=1` untuk uji ke prover) |
| `services/scout` | GroundedScout CLI: `scout`, `verify`, `record-one`, `export`, `balance`; plan di `plans/` (gitignored) | `cd services/scout && pnpm scout <cmd>` |
| `apps/server` | Hono API + pembaca klaim Gemini; entry Vercel `api/index.ts` | `pnpm dev` (port 8787) |
| `apps/mcp-server` | tools `tinjau_facts`, `tinjau_quote`, `tinjau_verify`; stdio + HTTP stateless (`api/mcp.ts`) | `pnpm stdio`; uji `npx tsx test/client.ts` |
| `apps/web` | kosong kecuali `public/demo/facts.json` (hasil `scout export`) | tunggu aba-aba |
| `scripts/` | `deploy.sh`, `live-sequence.sh`, `fetch-fixture.sh`, `export-abi.mjs` | |
| `docs/` | tracker, panduan ini, dosier, deck, submission, code review, legacy v2 | deck: `npx -y @marp-team/marp-cli@latest docs/deck.md --pdf --allow-local-files --no-stdin -o docs/deck.pdf` |

Catatan: package core diimpor lewat kondisi `development` (sumber `.ts`), jadi `tsx` dijalankan dengan `--conditions=development`; build `dist/` untuk konsumen lain.

---

## 6. Kontrak (ringkas)

- `record(Proof[])`: `UnknownChain`, `ProofRejected(i)`, dedup `(chainKey, height, txIndex)`, aktivitas `from`, log hanya bila status 1 dan emitter = registri; baca AttestorStash per proof.
- `facts()` 13 field: `breadthRaw`, `breadthGrounded` (butuh semua indeks terbukti + `minAge` + `minDepth`), `breadthIndependent`, `gapCount`, `negatives`, `cloneDensityLB`, `registrantSiblings`, `uriSiblings`, `sameTxSiblings`, `firstRegisteredHeight`, `coveredThrough`, `minAttestors`, `truncated`.
- Eskrow: `risk = 10000 − coverage·cloneFactor/10000`; gate `Gated`, `Truncated`, `ThinQuorum`, `Stale`, `UnknownAgent`, `BadDeadline`.
- Bounty: bayar hanya bila keputusan berubah **dalam panggilan itu** (perbaikan code review #1).

## 7. Scout (ringkas)

R1 bounty → agent diminta → paling ramai 7 hari. R2 bundel pengulas (semua indeks + aktivitas tertua + bucket) dan bukti merugikan (negatif, pencabutan, pengulas pemilik agent, saudara klon, indeks tertinggi hanya untuk pengulas yang memiliki agent, flag `--gapProofs`). R3 lewati yang sudah teradmit; bounty ≥ biaya. R4 sewa bila premi ≤ `--maxPremiumBps` (default 500) dan tidak gated; kalau tidak, danai bounty bila `--fundWei`. Batch 4 proof per tx; batch yang membalik keputusan bounty dikirim sebagai `proveAndClaim`.

## 8. Server, MCP, pembaca klaim

- Server: `GET /health`, `/facts/:ck/:id`, `/quote/:ck/:id`, `/agents/:ck/:id/reviewers`, `/scout/log`, `/claims/:ck/:id`.
- Pembaca klaim: **Gemini** lewat REST Google AI Studio (`generativelanguage.googleapis.com/v1beta`, tanpa SDK), structured output `responseSchema`, `temperature 0`. Butuh `GEMINI_API_KEY`.
- **Ladder model** (`DEFAULT_MODELS` di `apps/server/src/claims.ts`, bisa ditimpa lewat `TINJAU_CLAIMS_MODELS`): `gemini-3.8-flash` → `3.7-flash` → `3.6-flash` → `3.5-flash` → `3.5-flash-lite` → `3.1-flash-lite`. Error 429 (kuota habis), 503, 500, dan 404 → turun ke model berikutnya; jawaban yang tidak bisa di-parse tidak diulang ke model lain (teksnya sama). Model yang menjawab dicatat per ulasan (`review.model`, `report.modelsUsed`).
- [Fakta] Keluarga `gemini-2.5-*` mengembalikan 404 "no longer available to new users" (dicek 12 Sep 2026), jadi sengaja tidak ada di ladder.
- Verdict: `proven`, `not-on-claimed-chain`, `unsupported-chain`, `hash-not-in-document`, `malformed-hash`, `not-yet-attested`, `prover-error`.
- **Sudah diuji live** (12 Sep 2026): 7/7 tes lulus (`GEMINI_API_KEY=… LIVE=1 npx vitest run` di `apps/server`), termasuk uji fallback model. Laporan agent 50283: 6 klaim pembayaran, 6-6nya tidak ada di chain yang diklaim.

## 9. Hosting

Semua serverless di Vercel (DEC-D): web statis, server dan MCP sebagai Functions. Scout tidak di-host (memegang kunci, menunggu atestasi). Status: **ditunda Dien**; CLI `vercel` belum terpasang.

## 10. Status dan backlog

Lihat `docs/task-tracker.md`. Ringkas per 11 Sep 23:50:
- ✅ SET, CON, PKG, DEP-1…8, SCT-1…7, SRV-1/3, MCP-1, DOC-2…5, SUB-5.
- 🔄 SRV-2 (butuh API key).
- ⏳ WEB-* (aba-aba Dien), VCL (ditunda), DOC-6 dan SUB-1…4 (setelah frontend), GH-2 (izin Dien), SUB-6 (Dien).
- ⬜ P1/P2: SCT-8 (scout berkala lokal), MCP-2, CON-13.

## 11. Keputusan Dien (v3)

| Tanggal | Keputusan |
|---|---|
| 11 Sep | Build ulang dari nol di `Tinjau/`; repo v2 ke Trash; dokumen v2 ke `docs/legacy/` |
| 11 Sep | Force-push ke `k3cs/TinjauAI`; hapus `gh-pages` saat GH-2 |
| 11 Sep | Kontrak ditulis ulang + deploy baru; deploy disetujui ("lanjut") |
| 11 Sep | DEC-A (ChainInfo + AttestorStash di kontrak), DEC-B (server + MCP), DEC-C (LLM pembaca klaim), DEC-E (tanpa Supabase) disetujui; DEC-D: serverless di Vercel, ditunda |
| 11 Sep | Frontend dikerjakan setelah aba-aba Dien; video setelah frontend final |
| 11 Sep | Agent tidak boleh jadi collaborator / tanpa atribusi AI |

## 12. Batas dan risiko

Sama dengan `docs/evaluation-dossier.md` §8. Tambahan operasional: Blockscout v1 rate-limit (pakai v2 + cache), drpc gratis tidak stabil untuk query arsip (tidak dipakai), `cast` mencetak error `mixHash` saat membaca header CC3 (abaikan; tx tetap masuk).

## 13. Hierarki sumber kebenaran

On-chain → kode → dokumen ini → tracker → `ATTESTCOIN_INTEGRATION.md` → dosier → README/deck/submission → `docs/legacy/` (v2, hanya referensi desain).

## 14. Changelog

| Tanggal | Perubahan | Oleh |
|---|---|---|
| 2026-09-11 | v3.0 dibuat untuk monorepo `Tinjau/` setelah build ulang, deploy, dan urutan live | Claude |
