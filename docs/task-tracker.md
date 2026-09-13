# Tinjau v3: Task Tracker (build ulang dari nol)

Dibuat 11 Sep 2026 22:10 WIB · pemilik keputusan: Dien · diperbarui oleh setiap agent yang mengerjakan task

Dokumen ini menjabarkan **semua** pekerjaan untuk membangun ulang Tinjau dari nol di folder `Tinjau/` sampai submission BUIDL CTC 2026 Fall. Setiap task punya ID, detail, output, dependensi, kriteria selesai, estimasi, pemilik, dan status.

---

## 0. Cara memakai tracker ini

- Status: ⬜ belum · 🔄 berjalan · ✅ selesai · ⏳ menunggu orang/keputusan · ❌ dibatalkan · ✂️ dipotong (sengaja, lihat §3).
- Prioritas: **P0** wajib untuk submission · **P1** menaikkan nilai, dikerjakan bila gerbang aman · **P2** hanya bila ada sisa waktu.
- Agent mengambil task P0 teratas yang dependensinya sudah ✅. Jangan mengerjakan P1/P2 selama ada P0 yang belum selesai di gerbang yang sama.
- Setelah menyelesaikan task: ubah status, isi kolom bukti (hash tx, path, output perintah), tambahkan baris di §9 (log).
- Aturan produk dan klaim terlarang tetap berlaku dari panduan lama `docs/legacy/00-panduan-pengembangan.md` §2–§3 sampai panduan baru (DOC-1) selesai.
- **Tidak ada atribusi AI di git/GitHub**: tanpa trailer `Co-Authored-By`/`Claude-Session`, tanpa "Generated with Claude Code", agent tidak jadi collaborator. Commit atas nama Dien.

---

## 0b. Verifikasi independen 13 Sep 2026 18:10 WIB (sumber: git, filesystem, RPC CC3, Blockscout, crontab)

Dilakukan karena status tracker diragukan. Setiap baris = fakta yang dicek langsung, bukan dari tracker.

| Hal | Tracker sebelumnya | Kenyataan 13 Sep 18:10 | Akibat |
|---|---|---|---|
| **Kontrak yang dipakai kode** | v3 = `0xC045…BC47` / `0x82C6…16cB` / `0x6AbF…9A0b` (deploy 11 Sep) | **Ada deploy kedua 12 Sep 21:54 WIB** (blok 5.475.585, tx `0x9cb61f28…8ba6`): GroundedFacts `0x67394eC13E911ab0D3A26132BECa404F26e17a98`, AgentHireEscrow `0xF801a8a01E018f3Bf9a648F4C095a53979282EEA`, CoverageBounty `0xa27f14CD50BF334E7Fb09601cEf203745aADF569`; ketiganya terverifikasi Blockscout; escrow dan bounty baru menunjuk facts baru. `.env` dan `packages/core/src/deployments.json` sudah diarahkan ke alamat baru (**belum di-commit**). **Facts baru kosong: 0 `TxAdmitted`, `bountyCount` = 0.** Tidak ada catatan di tracker, panduan, log, maupun keputusan Dien | Semua materi publik, `facts.json`, `scout-summary.json` masih memakai alamat 11 Sep; web dan scout (lewat `deployments.json`/`.env`) membaca kontrak baru yang kosong. **Butuh keputusan Dien (DEC-F)** |
| Kenapa deploy kedua ada | - | [Inferensi] CON-13 (`recordBatch`) di-commit 12 Sep 19:17; ABI kontrak 11 Sep di Blockscout hanya punya `record`, jadi `recordBatch` memang butuh kontrak baru. Deploy 21:54 kemungkinan untuk itu | Kalau tetap di kontrak 11 Sep, jalur `recordBatch` scout gagal (fungsi tidak ada) |
| Data on-chain (kontrak 11 Sep) | 25 tx teradmit per 12 Sep | **34 `TxAdmitted` dalam 14 tx `record`**, terakhir blok 5.475.383 = 12 Sep 21:03 WIB | Angka publik "25" masih benar sebagai floor; angka segar = 34 |
| Tes kontrak | 41/41 | **49/49** (`forge test`, 13 Sep) | §8 diperbarui |
| CON-13 | ⬜ P2 | **✅ selesai** di commit `3add60e` (12 Sep 19:17), tapi hanya hidup di kontrak deploy kedua | status diubah |
| SCT-8 cron | ✅ terpasang, tiap 3 jam | `crontab -l` **kosong**, tidak ada launchd job. `cron.log`: 4 siklus jalan (12 Sep 05:00, 08:00, 11:00, 14:00 UTC), siklus terakhir 12 Sep 21:00 WIB, **tidak ada siklus sejak itu** | Klaim "scout keeps running until the deadline" di README, integration summary, dosier, submission **tidak lagi benar** sejak 12 Sep 21:00 WIB |
| GH-2 push | ⏳ izin Dien | Sudah pernah force-push (origin/main = `ef692d2`, `gh-pages` sudah tidak ada). Lokal **3 commit di depan** (`8461f12` web, `472ed07` docs, `3add60e` CON-13) + **12 file belum di-commit** (sinkronisasi 13 Sep + `deployments.json` alamat baru) | Repo publik belum memuat frontend, CON-13, dan koreksi 13 Sep |
| WEB-9 / VCL-1…5 | ⏳ / ⬜ | `vercel` tidak terpasang, tidak ada `.vercel/`, `docs/screenshot-live.jpg` tidak ada | benar, belum |
| DOC-6, SUB-1…4, SUB-6 | ⬜ | `docs/demo-script.md` tidak ada; `<VIDEO_URL>`/`<APP_URL>` masih placeholder | benar, belum |
| Commit author | - | 20 commit, semua `Scientivan <dienmuhammad030406@gmail.com>`, tanpa trailer | aturan atribusi terpenuhi |

**DEC-F: ✅ Dien memilih (b) pada 13 Sep 18:00 WIB; dikerjakan 18:05–18:20** (fund → scout cycle 1 → 2 hire → mass registration → Gated → release → cycle 2 → migrasi 11 proof dari kontrak lama via `services/scout/src/migrate.ts`; 33 `TxAdmitted`; Sepolia sengaja tidak dimigrasi). Opsi yang ditawarkan:
- (a) **Tetap kontrak 11 Sep** (`0xC045…`): kembalikan `.env` + `deployments.json` ke alamat lama, matikan jalur `recordBatch` di scout (fallback single proof sudah ada), semua dokumen tetap benar. Biaya ±15 menit. `recordBatch` hanya diklaim sebagai kode + tes + pengukuran gas, bukan sebagai kontrak live.
- (b) **Pindah ke kontrak 12 Sep** (`0x6739…`): admit ulang semua bukti (34 tx sumber, ±3–4 jt gas per batch, menunggu prover), ulang urutan live (fund → proveAndClaim → hire ×2 → Gated), ganti alamat dan semua hash di README, integration summary, deck, dosier, submission, panduan §4, `facts.json`, `scout-summary.json`. Biaya ±3–4 jam. Untung: `recordBatch` live dan gas batch bisa ditunjukkan.
- [Inferensi] Dengan deadline 14 Sep 10:59 WIB dan video belum direkam, (a) lebih aman; (b) hanya kalau Dien menganggap `recordBatch` live wajib untuk skor depth.

**DEC-G: ✅ dipasang 13 Sep 18:10 sebagai launchd `com.tinjau.scout` (StartInterval 10800); `crontab -` menggantung di macOS.** Opsi awal: pasang ulang (`crontab -e` → `0 */3 * * * "…/scripts/scout-cron.sh"`, memakai kontrak sesuai DEC-F) atau ubah kalimat "keeps running until the deadline" menjadi "ran unattended on 12 Sep (4 cycles)" di semua dokumen.

---

## 1. Konteks keputusan (11 Sep 2026)

| Keputusan Dien | Akibat |
|---|---|
| Codebase v2 dihapus; build ulang semuanya dari nol | Kode lama tidak disalin. Repo v2 diarsipkan di `~/.Trash/grounded-reputation-v2-2026-09-11` (masih bisa dipulihkan) |
| Pakai struktur folder `Tinjau/` | Monorepo: `apps/web`, `apps/server`, `apps/mcp-server`, `contracts`, `packages`, `services`, `scripts`, `docs` |
| Dokumen penting dipindah ke `Tinjau/` | Ada di `docs/legacy/` sebagai **referensi desain**, bukan kode |
| Repo GitHub: timpa `k3cs/TinjauAI` | Riwayat lama di GitHub hilang saat force-push. Force-push hanya setelah Dien menyetujui di sesi itu (GH-2) |
| Kontrak ditulis ulang dan dideploy baru | Semua alamat, hash, dan angka on-chain v2 **tidak berlaku lagi** untuk materi publik. Semua proof dibuat ulang |
| Video direkam setelah frontend final | Video (SUB-3) bergantung pada freeze frontend (WEB-9) |

[Fakta] Deadline: **13 Sep 2026 23:59 ET = 14 Sep 2026 10:59 WIB**. Target submit: **13 Sep 22:00 WIB** (±13 jam cadangan).
[Fakta] `Tinjau/.env` berisi kunci deployer `0x3D36…0E49` (disalin dari repo v2; alamat kontrak lama diberi prefix `LEGACY_V2_`). Jangan pernah di-commit.
[Fakta] `node_modules` di `Tinjau/` adalah sisa proyek lain (`@mysten` = Sui SDK, `@luber`, `@supabase`); dibersihkan di SET-1.

---

## 2. Gerbang waktu

Sisa waktu dari 11 Sep 22:10 WIB: ±61 jam sampai deadline.

| Gerbang | Batas (WIB) | Harus ✅ |
|---|---|---|
| G0 Fondasi | 12 Sep 02:00 | SET-1…SET-6, DEC-A…DEC-D dijawab |
| G1 Kontrak | 12 Sep 14:00 | CON-1…CON-9 (P0), tes hijau |
| G2 On-chain | 12 Sep 21:00 | DEP-1…DEP-6, PKG-1…PKG-5 |
| G3 Agent + data | 13 Sep 04:00 | SCT-1…SCT-7, DEP-7 |
| G4 Frontend freeze | 13 Sep 13:00 | WEB-1…WEB-9 (mulai hanya setelah aba-aba Dien, lihat §5.8), DOC-1…DOC-6 |
| G5 Video | 13 Sep 19:00 | SUB-1…SUB-3 |
| G6 Submit | 13 Sep 22:00 | GH-2, SUB-4…SUB-6 |

**Aturan potong otomatis** (tanpa perlu diskusi ulang):
- G1 lewat 12 Sep 18:00 → P1 kontrak (CON-10, CON-11) dipotong.
- G2 lewat 13 Sep 00:00 → `apps/server` dan `apps/mcp-server` jadi P2; web membaca chain langsung.
- G4 lewat 13 Sep 17:00 → freeze frontend apa adanya; lanjut ke video.
- Aba-aba frontend belum datang saat semua P0 non-frontend sampai G3 selesai → agent mengingatkan Dien, lalu mengerjakan P1 non-frontend (CON-10/11, SRV, MCP, DEP-8, SCT-8) sambil menunggu.
- Kapan pun: jangan memotong P0, jangan memotong video.

---

## 3. Keputusan yang harus dijawab Dien sebelum G0

| ID | Pertanyaan | Rekomendasi agent [Inferensi] | Status |
|---|---|---|---|
| DEC-A | Karena kontrak toh dideploy ulang, masukkan peningkatan kedalaman Attestcoin ke kontrak baru? (ChainInfo `0x0FD3` sebagai penjaga finalitas di dalam kontrak, AttestorStash `0x0FD4` untuk mencatat jumlah attestor ber-bond per fakta) | Ya, sebagai P1 (CON-10, CON-11). Ini menutup kelemahan K1 di penilaian 87 BUIDL tanpa biaya redeploy tambahan | ✅ disetujui Dien 11 Sep |
| DEC-B | Apakah `apps/server` dan `apps/mcp-server` masuk scope submission? | Ya, tetapi P1. Web tetap bisa jalan tanpa server (baca chain langsung). MCP = distribusi (pola pemenang Sentinel8004/Mandate) | ✅ disetujui Dien 11 Sep |
| DEC-C | Apakah LLM pembaca klaim (`feedbackURI` → kueri proof) masuk? | P1 di `apps/server`, hasilnya laporan/log, **bukan** fakta on-chain. Menaikkan kecocokan track AI | ✅ disetujui Dien 11 Sep |
| DEC-D | Hosting | **Direvisi Dien 11 Sep: semua yang di-host dibuat serverless di Vercel.** Web = statis; server dan MCP = Vercel Functions (stateless). Scout tidak di-host: dijalankan lokal oleh Dien/agent karena memegang kunci deployer dan menunggu atestasi 6–10 menit (§5.12) | 🔄 menunggu konfirmasi final Dien |
| DEC-E | Supabase (ada di sisa `node_modules`) dipakai? | Tidak. Tidak ada kebutuhan database; fakta ada di chain, plan scout di file JSON | ✅ disetujui Dien 11 Sep (Supabase tidak dipakai) |

---

## 4. Arsitektur target

```
Tinjau/
├─ contracts/            Foundry: GroundedFacts, AgentHireEscrow, CoverageBounty, IAgentFacts
├─ packages/
│  └─ core/              TS bersama: config chain, alamat, ABI, klien prover API, decoder txBytes,
│                        hitung-ulang fakta (verifier), tipe Facts/Quote
├─ services/
│  └─ scout/             GroundedScout: R1 targeting, R2 bukti dua arah, R3 timing, R4 konsumen
├─ apps/
│  ├─ web/               Vite + React + TanStack Query + Tailwind; baca facts()/quote() via RPC
│  ├─ server/            Hono API: fakta, quote, log scout, laporan klaim (LLM, P1)
│  └─ mcp-server/        MCP tools: tinjau_facts, tinjau_quote, tinjau_verify (P1)
├─ scripts/              deploy, verifikasi Blockscout, ekspor ABI, record-one, export-demo
└─ docs/                 panduan, produk, teknis, integrasi Attestcoin, dosier, deck, naskah video,
                         submission, task-tracker (ini), legacy/ (referensi v2)
```

Alur data (sama dengan v2, sumber: `docs/legacy/02-teknis.md` §2):
Ethereum mainnet/Sepolia (registri ERC-8004) → scout memilih tx → prover API → `GroundedFacts.record()` di CC3 Testnet (verify `0x0FD2` → decode → fakta) → `AgentHireEscrow` / `CoverageBounty` → web, server, MCP, dan `verify` off-chain membaca angka yang sama.

Invariant yang tidak berubah (sumber: `docs/legacy/00-panduan-pengembangan.md` §2.1): fakta bukan skor; hanya proof yang masuk; omisi tidak menguntungkan; log hanya dari registri resmi; tidak ada LLM di jalur fakta; bisa dihitung ulang; tanpa admin/upgrade.

---

## 5. Daftar task

### 5.1 SET: Fondasi monorepo (G0)

**SET-1 · Bersihkan sisa proyek lain** · P0 · agent · 15 menit · ✅
- Detail: hapus semua `node_modules` di `Tinjau/` (root dan `apps/*`), karena berisi dependensi proyek Sui/Luber. Jangan menyentuh `.env` dan `docs/`.
- Kriteria selesai: `find Tinjau -name node_modules -maxdepth 3` kosong.

**SET-2 · Workspace pnpm** · P0 · agent · 30 menit · ✅ · dep: SET-1
- Detail: `package.json` root (private, scripts `build`, `test`, `lint`, `dev`), `pnpm-workspace.yaml` (`apps/*`, `packages/*`, `services/*`), pakai `tsconfig.base.json` yang sudah ada; tiap paket punya `tsconfig.json` yang `extends` base.
- Kriteria selesai: `pnpm install` sukses; `pnpm -r build` jalan (paket kosong boleh).

**SET-3 · `.gitignore` dan pengaman rahasia** · P0 · agent · 15 menit · ✅
- Detail: isi `.gitignore` (`node_modules/`, `.env`, `.env.*` kecuali `.env.example`, `contracts/out/`, `contracts/cache/`, `contracts/broadcast/*/dry-run/`, `dist/`, `services/scout/plans/`, `.DS_Store`). Buat `.env.example` tanpa nilai (`PRIVATE_KEY=`, `CC3_RPC=`, `PROVER_API=`, `FACTS=`, `ESCROW=`, `BOUNTY=`).
- Kriteria selesai: `git status` setelah `git init` tidak menampilkan `.env`.

**SET-4 · Git lokal dan remote** · P0 · agent · 10 menit · ✅ · dep: SET-3
- Detail: `git init -b main`; set remote `origin` ke `https://github.com/k3cs/TinjauAI`; **jangan push** (lihat GH-2). Konfigurasi commit memakai identitas Dien yang sudah ada di mesin.
- Kriteria selesai: `git remote -v` menunjuk `k3cs/TinjauAI`; belum ada push.

**SET-5 · Instruksi agent** · P0 · agent · 20 menit · ✅
- Detail: isi `claude.md` (sekarang 0 byte) dan buat `AGENTS.md`: arahkan ke `docs/panduan-pengembangan.md` (DOC-1) dan tracker ini; tulis aturan keras (tanpa atribusi AI, tanpa commit `.env`, tanpa push/deploy tanpa izin, invariant produk).
- Kriteria selesai: kedua file ada dan saling konsisten.

**SET-6 · Toolchain** · P0 · agent · 15 menit · ✅
- Detail: pastikan Foundry (v2 memakai 1.7.1, solc 0.8.28, `via_ir`), Node 24, pnpm tersedia; catat versi di DOC-1.
- Kriteria selesai: `forge --version`, `node -v`, `pnpm -v` tercatat.

### 5.2 CON: Kontrak (G1)

Spesifikasi acuan: `docs/legacy/02-teknis.md` §3 dan `docs/legacy/evaluation-dossier.md` §4. Tulis ulang dari nol; jangan menyalin kode v2 dari Trash.

**CON-1 · Proyek Foundry** · P0 · agent · 30 menit · ✅ · dep: SET-6
- Detail: `contracts/foundry.toml` (solc 0.8.28, `via_ir = true`, optimizer, `rpc_endpoints.cc3`), `forge-std`, vendor `@gluwa/usc-contracts` 0.2.0 (`EvmV1Decoder`, `INativeQueryVerifier`) ke `contracts/lib/usc/` beserta catatan asal dan lisensi.
- Kriteria selesai: `forge build` sukses dengan kontrak kosong.

**CON-2 · Fixture proof asli** · P0 · agent · 1 jam · ✅ · dep: CON-1
- Detail: skrip (`scripts/fetch-fixture.ts`) yang mengambil `proof-by-tx/{chainKey}/{tx}` dari prover API dan menyimpan `txBytes` + proof ke `contracts/test/fixtures/`. Minimal: satu `NewFeedback` mainnet, satu `Registered` mainnet (pola pabrik → ERC-6551, agent 50609), satu tx aktivitas Jan 2024, satu tx aktivitas 2026, satu tx pendaftaran massal (`0x6c89bc776674e98a1b773aadcd22ba09c0de333e84a29994ead20c163a1a23c6`, 10 `Registered`), satu `NewFeedback` Sepolia (`0x5ee427faa835e1064e60b281095b87fe58eb900cf42d39df79fe8e6e8e5cab07`).
- Kriteria selesai: fixture tersimpan; ukuran dan jumlah root dicatat.

**CON-3 · `GroundedFacts`: jalur proof** · P0 · agent · 2 jam · ✅ · dep: CON-1
- Detail: `record(Proof[] calldata) returns (uint256 admitted)`. Per proof: tolak chainKey tak dikenal (`UnknownChain`); panggil `verify` di `0x0FD2` (`ProofRejected` bila false); dedup kunci `(chainKey, height, txIndex)` via `calculateTxIndex` (duplikat di-skip, bukan revert); decode `from` (aktivitas) dan receipt (status harus 1); log diproses hanya bila `address_` = registri resmi chainKey itu. Registri per chainKey di-hardcode (mainnet = 3, Sepolia = 1 di testnet).
- Kriteria selesai: tes proof palsu ditolak, duplikat di-skip, log dari alamat lain diabaikan, status 0 diabaikan.

**CON-4 · `GroundedFacts`: fakta ulasan** · P0 · agent · 2 jam · ✅ · dep: CON-3
- Detail: `NewFeedback` (agentId, client, feedbackIndex, value int128, decimals), `FeedbackRevoked`. Simpan per pasangan (agent, pengulas, indeks); negatif dihitung; pencabutan membatalkan; `gapCount` dari indeks monoton per pasangan.
- Kriteria selesai: tes dengan fixture mainnet; gap terdeteksi saat indeks 1 dan 3 ada tanpa 2.

**CON-5 · `GroundedFacts`: senioritas pengulas** · P0 · agent · 1 jam · ✅ · dep: CON-3
- Detail: `oldestHeight[addr]` = minimum tinggi tx terbukti; `bucketCount[addr]` = jumlah bucket 216.000 blok berbeda; `reviewerSeniority(addr)`.
- Kriteria selesai: fixture Jan 2024 menurunkan `oldestHeight`; bucket tidak dihitung ganda.

**CON-6 · `GroundedFacts`: provenance agent** · P0 · agent · 2 jam · ✅ · dep: CON-3
- Detail: `Registered` (owner, registrant = `from` tx, uriHash, txKey), `Transfer` (ikuti pemilik bila `from` = pemilik tercatat; mint diabaikan), `cloneDensityLB`, `registrantSiblings`, `uriSiblings`, `sameTxSiblings`, `firstRegisteredHeight`, `reviewerOwnsAgents(client)`.
- Kriteria selesai: tes pola pabrik → ERC-6551 (pemilik akhir + registrant EOA); tx massal → `sameTxSiblings` = 9.

**CON-7 · `GroundedFacts.facts()`** · P0 · agent · 1 jam · ✅ · dep: CON-4…CON-6
- Detail: `facts(chainKey, agentId, minAge, minDepth)` → `breadthRaw`, `breadthGrounded`, `breadthIndependent`, `gapCount`, `negatives`, `cloneDensityLB`, `registrantSiblings`, `uriSiblings`, `sameTxSiblings`, `firstRegisteredHeight`, `truncated` (batas iterasi 256 pengulas). Tanpa admin, tanpa upgrade, tanpa bobot.
- Kriteria selesai: tes angka untuk dua skenario (agent dengan pengulas senior vs pengulas tunggal yang memiliki agent).

**CON-8 · `AgentHireEscrow`** · P0 · agent · 1,5 jam · ✅ · dep: CON-7
- Detail: `quote(chainKey, agentId, Params)` → (riskBps, premiumBps, gapCount, Facts); `risk = 10000 − coverage·cloneFactor/10000`, `coverage = min(10000, breadthGrounded·10000/k)`, `cloneFactor = c·10000/(c + cloneDensityLB)`, `premium = base + (max − base)·risk`. `hire` payable: `Gated` bila `gapCount > 0`, `UnknownAgent` bila belum ada `Registered` terbukti, `BadDeadline`; premi ke `owner` saat itu; `release` oleh penyewa; `refund` setelah deadline. Pola CEI.
- Kriteria selesai: tes premi, gate, release, refund, deadline buruk.

**CON-9 · `CoverageBounty`** · P0 · agent · 1,5 jam · ✅ · dep: CON-7
- Detail: `fund(chainKey, agentId, minAge, minDepth, k, c, expiry)` menyimpan `decision = keccak(bg ≥ k, gap == 0, cloneLB ≥ c, negatives > 0)`; `proveAndClaim(id, proofs)` memanggil `record` lalu membandingkan; `NoChange` revert; bayar penuh; `withdraw` setelah `expiry`; `BadExpiry`. Pola CEI.
- Kriteria selesai: tes klaim sekali, `NoChange`, withdraw.

**CON-10 · Penjaga finalitas ChainInfo di kontrak** · P1 (DEC-A) · agent · 1,5 jam · ✅ · dep: CON-3
- Detail: sebelum menerima proof, baca tinggi teratestasi dari `0x0FD3` di dalam transaksi yang sama dan tolak proof yang terlalu dekat dengan ujung (konstanta finalitas per chainKey, didokumentasikan). Pola ini dipakai Singleton (64 blok).
- Kriteria selesai: tes dengan mock precompile; ukuran gas tambahan dicatat.

**CON-11 · Provenance keamanan per fakta (AttestorStash)** · P1 (DEC-A) · agent · 2 jam · ✅ · dep: CON-3
- Detail: saat fakta masuk, baca jumlah attestor ber-bond untuk chainKey itu dari `0x0FD4` dan simpan bersama fakta; ekspos `attestorsAt(factKey)` dan jumlah minimum per agent di `facts()` atau view terpisah. Tidak menolak apa pun (fakta, bukan vonis), kecuali konsumen memberi ambang.
- Kriteria selesai: tes dengan mock; di testnet `attestorsAt` terbaca (DEP-5).

**CON-12 · Interface `IAgentFacts`** · P1 · agent · 30 menit · ✅ · dep: CON-7
- Detail: `contracts/src/interfaces/IAgentFacts.sol` + contoh konsumen 10 baris di dokumen integrasi (cara kontrak lain membaca `facts()`).
- Kriteria selesai: `AgentHireEscrow` memakai interface ini.

**CON-13 · Batch proof (continuity bersama)** · P2 · agent · 3 jam · ✅ kode + 49 tes (commit `3add60e`, 12 Sep 19:17; `recordBatch`, gas 167.344 vs 227.904 untuk 2 proof) · ⚠️ **live hanya di kontrak deploy kedua 12 Sep 21:54 (lihat §0b, DEC-F)**; kontrak 11 Sep tidak punya fungsi ini · dep: CON-3
- Detail: jalur `verify` batch (≤10 proof, rentang ≤1.000 blok) untuk riwayat rapat. Hanya bila CON-1…CON-12 selesai sebelum G1.

**CON-14 · Review keamanan** · P0 · agent · 1 jam · ✅ (review manual 11 Sep; skill `engineering:code-review` hanya berisi kerangka, review dikerjakan langsung; 3 temuan diperbaiki, lihat `docs/quality/code-review.md`) · dep: CON-8, CON-9
- Detail: jalankan skill `engineering:code-review` pada kontrak; periksa reentrancy, cast overflow, gas loop, akses; perbaiki temuan kritis; simpan laporan di `docs/quality/code-review.md`.
- Kriteria selesai: 0 temuan kritis terbuka; `forge test` hijau.


**Catatan implementasi CON-1…CON-12 (11 Sep 2026 malam)** [Fakta, `contracts/`]
- `forge test`: **38/38 lulus** (25 `GroundedFactsTest`, 13 `ConsumersTest`). Fixture asli: 4 proof dari prover API (`scripts/fetch-fixture.sh`): `NewFeedback` mainnet (agent 50286, indeks 24), aktivitas mainnet tertua pengulas `0x1030…` (blok 23.779.699), tx pendaftaran massal 52 KB (10 `Registered`, agent 41885…), `NewFeedback` Sepolia (agent 9865).
- Precompile dicek live di CC3 testnet sebelum dipakai: `verify` proof mainnet segar = `true`, `calculateTxIndex` = 300 (sama dengan API); AttestorStash `0x0fd4` `getAttestorsCount` = 7 (chainKey 1) / 4 (chainKey 3), bond 100 CTC; ChainInfo `0x0fd3` `get_latest_attestation_height_and_hash` jalan (selector snake_case). ABI ChainInfo dari `@gluwa/usc-sdk` 0.18.0; AttestorStash tidak ada di docs/SDK (selector dari repo Singleton, lalu diverifikasi sendiri).
- **CON-10 berubah desain** [Inferensi]: penjaga "jarak minimum dari tip" tidak dipakai karena prover hanya memberi proof untuk blok yang sudah teratestasi (margin tambahan hanya menambah jeda demo). Gantinya: `attestedTip(chainKey)` membaca ChainInfo, `facts()` mengembalikan `coveredThrough`, dan `AgentHireEscrow` bisa menolak fakta basi (`maxStaleness`, error `Stale`). Konsumen memutuskan, kontrak fakta tidak menilai.
- **CON-11**: jumlah attestor ber-bond dibaca dari `0x0fd4` saat setiap proof masuk; `facts().minAttestors` = jumlah attestor terdaftar saat proof masuk, terendah di antara fakta agent itu (konteks jaringan saat admisi, **bukan** penandatangan proof tertentu; koreksi 13 Sep); eskrow bisa menolak (`minAttestors`, error `ThinQuorum`).
- Registri ERC-8004 per chainKey diberikan lewat constructor (bukan hardcode), supaya kontrak yang sama bisa dideploy di CC3 mainnet (Ethereum = chainKey 1 di sana). Tetap tanpa admin.
- Transfer kepemilikan: yang menang adalah transfer terbukti **terbaru** (urutan height, txIndex, logIndex), apa pun urutan proof diajukan.
- Angka pricing sama dengan desain v2: 1 pengulas grounded dari k=3, 5 klon, c=5 → risk 8.334 bps, premi 1.683 bps (tes `test_quote_cloneDensityAndThinCoverage`).
- `evm_version = paris` (paling konservatif untuk EVM CC3; belum diuji apakah versi lebih baru didukung).

### 5.3 PKG: Paket bersama `packages/core` (G2)

**PKG-1 · Konfigurasi chain dan alamat** · P0 · agent · 30 menit · ✅ · dep: SET-2
- Detail: RPC CC3 testnet, explorer, prover API, chainKey (testnet: Sepolia 1, mainnet 3; CC3 mainnet: Ethereum 1), alamat registri ERC-8004 per chain, alamat kontrak Tinjau (diisi dari DEP-2, satu sumber).
- Kriteria selesai: satu modul `config.ts` diimpor semua app.

**PKG-2 · ABI dan tipe** · P0 · agent · 30 menit · ✅ · dep: CON-7…CON-9
- Detail: skrip ekspor ABI dari `contracts/out` ke `packages/core/src/abi/`; tipe `Facts`, `Quote`, `Params`.
- Kriteria selesai: build gagal bila ABI tidak sinkron dengan kontrak.

**PKG-3 · Klien prover API** · P0 · agent · 1 jam · ✅ (uji live mainnet + Sepolia lulus) · dep: PKG-1
- Detail: `attestedHeight(chainKey)`, `proofByTx(chainKey, tx)`, `proofBatch(chainKey, txs)`; retry, penanganan `BlockNotReady` dan `TxHashNotFound`, batas ukuran tx 500 KB.
- Kriteria selesai: uji ke API nyata untuk satu tx mainnet dan satu Sepolia.

**PKG-4 · Decoder `txBytes` dan hitung-ulang fakta** · P0 · agent · 2 jam · ✅ (model TS = kontrak pada 4 fixture dan 3 agent live) · dep: PKG-3
- Detail: decode `(uint8, bytes[])` (chunk common + receipt), ekstrak `from`, status, log; hitung ulang fakta per agent dari kumpulan proof dengan logika identik dengan kontrak.
- Kriteria selesai: untuk data demo, hasil = `facts()` on-chain (DEP-6).

**PKG-5 · Klien kontrak** · P0 · agent · 45 menit · ✅ · dep: PKG-2
- Detail: `readFacts`, `readQuote`, `record`, `hire`, `fund`, `proveAndClaim` (ethers v6), dipakai scout, server, MCP, web.
- Kriteria selesai: `readFacts` berjalan terhadap kontrak baru.

### 5.4 DEP: Deploy dan data on-chain (G2–G3)

**DEP-1 · Cek saldo dan faucet** · P0 · agent (Dien bila perlu faucet) · 10 menit · ✅ (9.999,93 tCTC, 11 Sep 22:50)
- Detail: saldo tCTC deployer `0x3D36…0E49` (v2 memakai ±10.000 tCTC). Bila kurang: Dien meminta faucet di Discord (`/faucet address:…`).
- Kriteria selesai: saldo tercatat.

**DEP-2 · Deploy 3 kontrak ke CC3 Testnet** · P0 · agent · 30 menit · ✅ (izin Dien "lanjut" 11 Sep; `scripts/deploy.sh`) · dep: CON-14, DEP-1
- Detail: `scripts/deploy.sh` memakai `forge create --broadcast` (bukan `forge script`: simulasi forge menolak header blok Creditcoin, `prevrandao`). Tulis alamat ke `.env` dan `packages/core` config.
- Kriteria selesai: tiga alamat + hash tx deploy tercatat di §8.

**DEP-3 · Verifikasi Blockscout** · P0 · agent · 20 menit · ✅ (3/3 `is_verified = true`) · dep: DEP-2
- Detail: `forge verify-contract --verifier blockscout --verifier-url https://creditcoin-testnet.blockscout.com/api/`.
- Kriteria selesai: 3/3 terverifikasi.

**DEP-4 · Record data demo** · P0 · agent · 1,5 jam · ✅ (22 proof via scout + 2 record-one) · dep: DEP-2, PKG-5
- Detail: rekam ulang bukti untuk agent demo mainnet **22771** (target: 3 pengulas senior, 0 celah), **50283** (pengulas tunggal pemilik agent, saudara klon, celah → `Gated`), **21548** (target bounty), satu `NewFeedback` Sepolia, tx pendaftaran massal, tx aktivitas Jan 2024. Daftar tx acuan: `docs/legacy/ATTESTCOIN_INTEGRATION.md` dan plan scout.
- Kriteria selesai: semua tx `record` tercatat dengan gas; fakta sesuai skenario.

**DEP-5 · Bounty, hire, release live** · P0 · agent · 45 menit · ✅ · dep: DEP-4
- Detail: `fund` bounty untuk 21548; `hire` 22771 (sukses); `hire` 50283 (harus revert `Gated`); `release`. Bila CON-11 ada: baca `attestorsAt`.
- Kriteria selesai: hash dan hasil tercatat.

**DEP-6 · Rekonsiliasi on-chain vs off-chain** · P0 · agent · 30 menit · ✅ (identik untuk 22771, 50283, 21548) · dep: DEP-4, PKG-4
- Detail: `facts()` on-chain = hitung ulang `packages/core` untuk 22771 dan 50283.
- Kriteria selesai: identik; output disimpan di `docs/`.

**DEP-7 · Scout live end-to-end** · P0 · agent · 1 jam · ✅ · dep: SCT-6
- Detail: scout memilih target sendiri (bounty dulu), mengirim bukti dua arah, menagih bounty, menyewa (R4), dan siklus kedua 0 gas (`txSeen`).
- Kriteria selesai: log live tersimpan; hash tercatat.

**DEP-8 · Bukti siap mainnet CC3** · P1 · agent · 1–2 jam · ✅ (verify=true di CC3 mainnet, 127.746 gas) · dep: PKG-3
- Detail: ambil proof event ERC-8004 dari proof builder CC3 **mainnet** (Ethereum = chainKey 1 di sana) dan `verify` via `eth_call` ke `0x0FD2` CC3 mainnet. Tanpa deploy.
- Kriteria selesai: hasil `verify` + gas dicatat di dosier.

### 5.5 SCT: GroundedScout di `services/scout` (G3)

Spesifikasi acuan: `docs/legacy/02-teknis.md` §4, `docs/legacy/01-produk.md` §3.3.

**SCT-1 · Discovery registri** · P0 · agent · 1,5 jam · ✅ (Blockscout REST v2; /api v1 kena rate limit) · dep: PKG-1
- Detail: ambil log `NewFeedback`/`Registered` per agent dan `txlist` pengulas (Blockscout `eth.blockscout.com`), dengan rate limit dan cache lokal.

**SCT-2 · R1 Targeting** · P0 · agent · 45 menit · ✅ · dep: SCT-1, PKG-5
- Detail: bounty terbuka dulu, lalu agent paling aktif 7 hari; `--agents`, `--maxTargets`; alasan dicetak di log `[R1]`.

**SCT-3 · R2 Bukti dua arah** · P0 · agent · 2 jam · ✅ (gap proof hanya untuk pengulas yang memiliki agent (--gapProofs)) · dep: SCT-1
- Detail: helps (ulasan pertama, tx tertua, bucket berbeda) dan hurts (negatif, indeks tertinggi, pencabutan, pengulas-pemilik, saudara klon); 40% anggaran gas dicadangkan untuk helps; lengkapi semua indeks pengulas dasar (agar tidak gated karena kelalaian scout).

**SCT-4 · R3 Timing dan biaya** · P0 · agent · 1 jam · ✅ · dep: SCT-3
- Detail: buang yang sudah `txSeen`; estimasi gas (precompile ≈110k + 600·roots; roots ≈ 90 + umur/13.000 blok; decode ulasan 260k, pendaftaran 440k, aktivitas 130k); buktikan hanya bila bounty ≥ biaya; batch ≤4 proof per `record`.

**SCT-5 · R4 Konsumen** · P0 · agent · 45 menit · ✅ · dep: SCT-4
- Detail: sewa lewat eskrow bila fakta lolos ambang scout sendiri; jika tidak, danai bounty.

**SCT-6 · Mode dry-run dan live, plan JSON** · P0 · agent · 45 menit · ✅ · dep: SCT-2…SCT-5
- Detail: tanpa `PRIVATE_KEY` → dry-run menulis `services/scout/plans/*.json`; dengan kunci → kirim tx. Log bertag `[R1]…[R4]`, `[tx]`.

**SCT-7 · Ekspor data demo** · P0 · agent · 30 menit · ✅ (`scout export`) · dep: SCT-6
- Detail: `scripts/export-demo.ts` menulis `apps/web/public/demo/facts.json` dari plan + proof (mode demo web).

**SCT-8 · Scout tanpa pengawasan sampai deadline** · P1 · agent · 1 jam setup · ⚠️ **cron tidak lagi terpasang** (dicek 13 Sep 18:10: `crontab -l` kosong; 4 siklus jalan 12 Sep 05:00–14:00 UTC, terakhir 12 Sep 21:00 WIB; siklus terakhir menambah 9 `TxAdmitted`). Skrip `scripts/scout-cron.sh` ada. Keputusan DEC-G (§0b) · dep: DEP-7
- Detail: jadwal berkala **lokal** (launchd/cron di mesin Dien, bukan Vercel; alasan di §5.12) dengan batas anggaran; laporan N proof, N agent, N pengulas, gas total; dipakai di dosier dan video.

### 5.6 SRV: `apps/server` (P1, DEC-B)

**SRV-1 · Kerangka Hono** · P1 · agent · 30 menit · ✅ (diuji lokal) · dep: PKG-5
- Detail: `GET /health`, `GET /facts/:chainKey/:agentId?minAge&minDepth`, `GET /quote/...`, `GET /scout/log`, `GET /card/:agentId` (WEB-21); semua angka dibaca dari chain via `packages/core`, tanpa database.

**SRV-2 · LLM pembaca klaim** · P1 (DEC-C) · agent · 3 jam · ✅ (Gemini REST, ladder 6 model dengan fallback saat kuota habis; 7/7 tes live; laporan 50283: 6 klaim, 0 terbukti) · dep: SRV-1, PKG-3
- Detail: baca `feedbackURI`, ekstrak `proof_of_payment {network, txHash}` dengan AI SDK (skema terstruktur), coba ambil proof via prover API; hasil: "terbukti", "chain salah", "tidak ditemukan". **Tidak menulis fakta on-chain.** Wajib ada contoh kasus LLM salah → precompile/prover menolak.
- Kriteria selesai: laporan untuk agent demo; angka dibandingkan dengan temuan v2 (0 dari 12 klaim benar chain-nya).

**SRV-3 · Endpoint laporan klaim** · P1 · agent · 30 menit · ✅ · dep: SRV-2
- Detail: `GET /claims/:agentId` untuk web dan MCP.

### 5.7 MCP: `apps/mcp-server` (P1, DEC-B)

**MCP-1 · Server MCP stdio** · P1 · agent · 1,5 jam · ✅ (diuji via SDK client stdio; tinjau_verify identik dari data chain saja) · dep: PKG-5
- Detail: tools `tinjau_facts(chainKey, agentId, minAge, minDepth)`, `tinjau_quote(...)`, `tinjau_verify(agentId)` (hitung ulang dari proof). Keluaran berisi angka + hash tx sumber.
- Kriteria selesai: bisa dipanggil dari Claude/Inspector MCP; contoh transkrip disimpan.

**MCP-2 · `SKILL.md` untuk agent** · P2 · agent · 30 menit · ⬜ · dep: MCP-1
- Detail: "sebelum menyewa agent ERC-8004, panggil Tinjau" (pola Mandate).

**MCP-3 · x402 per panggilan** · P2 · ✂️ untuk hackathon (roadmap)

### 5.8 WEB: `apps/web` (G4)

**✅ Aba-aba diberikan Dien 12 Sep.** Arah ditetapkan Dien dalam sesi itu:

| Keputusan Dien (12 Sep) | Akibat |
|---|---|
| Pembaca utama = **orang non-teknis yang belum tahu apa-apa**, dengan porsi penjelasan dan porsi alat seimbang, dibungkus use case nyata (marketplace agent AI) | Jargon kontrak (`breadthGrounded`, `gapCount`, `bps`, `chainKey`, hash) dilarang di lapisan pertama. Semua kalimat dibangkitkan di `apps/web/src/lib/plain.ts` dari jawaban kontrak |
| Aksi utama = **benar-benar menyewa** dengan wallet sendiri, plus jalur **pratinjau** tanpa wallet | `HirePanel` punya dua jalur; `hire()` payable ditandatangani wallet pengunjung. Tanpa wallet, split biaya tetap dihitung dari `quote()` dan diberi label pratinjau |
| Bukti transaksi **sembunyi di balik satu klik** | Disclosure "How do we know?" per agent; di dalamnya pasangan tx Ethereum ↔ Creditcoin |
| Bahasa visual mengikuti `prompt-ui-tech-forward.md` **untuk seluruh halaman** | React 19 + Vite + `motion` + `lucide-react`, **CSS biasa tanpa Tailwind** (menggantikan catatan WEB-1 lama), Inter 300–600, hitam-putih, easing `[0.16, 1, 0.3, 1]` |
| Latar hero **buatan sendiri**, bukan video di file itu | `Backdrop.tsx` (canvas): bukti berjalan Ethereum → Creditcoin, menumpuk sebagai tanda di ledger. Video CloudFront di file itu milik proyek lain, tidak dipakai |
| Bahaya dibedakan **bentuk, bukan warna** | Lolos = garis tipis; ditahan = blok tinta penuh + ikon kunci. Tanpa hijau/merah/amber |

[Fakta] Dokumen desain: `apps/web/PRODUCT.md` (untuk siapa, apa yang wajib benar) dan `apps/web/DESIGN.md` (palet, tipografi, komponen, gerak, penyimpangan yang disengaja).
[Fakta] Penyimpangan sengaja dari file panduan: teks 13px memakai hitam **62%**, bukan 55%. Hitam 55% pada 13px = **4,48:1**, gagal WCAG AA.

Acuan tampilan v2: `docs/legacy/screenshot-live.jpg`. Framing wajib: **biro kredit untuk agent AI** (`docs/legacy/00-panduan-pengembangan.md` §3).

**WEB-1 · Kerangka** · P0 · agent · 45 menit · ✅ · dep: SET-2, PKG-1
- Detail (direvisi 12 Sep): Vite + React 19 + TypeScript + **CSS biasa** + `motion` + `lucide-react`; **tanpa Tailwind, tanpa TanStack Query** (keputusan Dien: ikuti `prompt-ui-tech-forward.md`). Token di `src/styles/tokens.css`. Baca chain langsung lewat `ethers` + `@tinjau/core/contracts`; `VITE_CC3_RPC` opsional. Snapshot scout pindah dari `public/demo/` ke `src/data/facts.json` (meng-import dari `public/` adalah error Vite dan menggandakan file).

**WEB-2 · Header dan framing** · P0 · agent · 30 menit · ✅ · dep: WEB-1
- Detail: kalimat pembuka menyebut AI agent, reviewer, dan credit bureau; tanpa kata "score" untuk keluaran Tinjau.

**WEB-3 · Ambang konsumen + daftar agent** · P0 · agent · 1 jam · ✅ · dep: WEB-1, PKG-5
- Detail (direvisi): ambang mentah tidak ditampilkan sebagai input. Satu pertanyaan ("How careful do you want to be?") dengan tiga preset (Careful / Normal / Relaxed) di `src/lib/params.ts`; angka aslinya tetap bisa dibuka di "the exact settings". Empat agent: 22771, 21548, 50283, 50286.
- [Fakta] Preset Careful awalnya memakai `minDepth 3`, yang **tidak bisa dipenuhi data nyata** (tak ada pengulas dengan >2 bucket), sehingga semua biaya jatuh ke plafon 20% dan preset itu tidak mengajarkan apa pun. Diubah ke `minDepth 2`, `minAge 1.000.000`, `k 4`, `c 3`, `minAttestors 4` → 22771 jadi **10,5%**, 21548 jadi **5,75%**.
- [Fakta] Relaxed sama dengan Normal (1%) karena kedua agent bersih sudah di lantai biaya, dan `gapCount` adalah gerbang, bukan harga. Ini dijelaskan eksplisit di halaman, bukan disembunyikan.

**WEB-4 · Kuitansi fakta** · P0 · agent · 2 jam · ✅ (`Evidence.tsx`: tiap fakta menampilkan tx Ethereum berdampingan dengan tx `record` Creditcoin, jumlah root, gas batch, tanggal perkiraan yang dikalibrasi dari `attestedTip`) · dep: WEB-3
- Detail: tiap fakta bisa diklik → rantai bukti: tx Ethereum (Etherscan/Blockscout) **berdampingan** dengan tx `record` di Creditcoin (Blockscout CC3), jumlah root, gas.

**WEB-5 · Premi = biaya kredit** · P0 · agent · 45 menit · ✅ (biaya ditulis sebagai persen **dan** sebagai uang: "0,0005 tCTC ke pemilik sekarang, 0,0495 ditahan") · dep: WEB-3
- Detail: `quote()` → premi (bps dan %) dan status `Gated` dengan alasannya.

**WEB-6 · Narasi "kenapa" dengan sitasi** · P1 · agent · 1,5 jam · ✅ (`plain.ts`, deterministik dari fakta; `gapCount` dijelaskan dengan indeks ulasan sebenarnya, mis. "#97 terbukti, 96 sebelumnya tidak") · dep: WEB-4, WEB-5
- Detail: satu kalimat per keputusan ("gated karena ulasan #N dari pengulas X hilang", "premi 1% karena 3 pengulas senior"), setiap kalimat mengutip hash tx. Dibangkitkan deterministik dari fakta, bukan LLM.

**WEB-7 · Tabel pengulas, log scout, blok "Verify it yourself"** · P0 · agent · 1,5 jam · ✅ (pengulas + alasan **tidak dihitung**; log scout jadi narasi 4 langkah bertautan tx; perintah `cast call` dan `scout verify` di "Show the exact mechanism") · dep: WEB-3, SCT-7
- Detail: pengulas (senioritas, bucket, memiliki agent?), log keputusan scout (dipilih vs ditolak dengan alasan), perintah `cast call` dan hitung-ulang yang bisa dijalankan juri.

**WEB-8 · Kualitas** · P0 · agent · 1 jam · ✅ · dep: WEB-2…WEB-7
- Alat: `scripts/screenshot.mjs` (playwright-core + Chrome for Testing) memotret setiap bagian di 1440 dan 375, lalu mengukur kontras terhadap latar yang benar-benar terkomposisi, ukuran target sentuh, dan overflow horizontal.
- [Fakta] Hasil 12 Sep: **0 kegagalan kontras, 0 target <44px, 0 overflow, 0 error konsol** di kedua lebar; 4 agent termuat; cap sesuai kontrak.
- [Fakta] Alat ukur pertamaku salah: mengabaikan kanal alpha dan menolak `rgb(0,0,0)` sebagai transparan, jadi melaporkan kegagalan palsu. Versi sekarang mengkomposisi rgba di atas latar sebenarnya.

**WEB-9 · Freeze + publish Vercel** · P0 · agent (deploy produksi: izin Dien) · 30 menit · ⏳ menunggu Vercel (VCL-1) · dep: WEB-8, DEP-6, VCL-2
- Detail: build dengan alamat v3; deploy produksi ke Vercel (VCL-2); screenshot baru `docs/screenshot-live.jpg`. Setelah freeze, perubahan UI hanya perbaikan bug.

**WEB-10 · Tampilan laporan klaim dan attestor** · P1 · agent · 1 jam · 🔄 (jumlah attestor sudah tampil per agent; hasil pembaca klaim baru disebut sebagai angka di bagian scout, belum jadi tampilan sendiri) · dep: SRV-3 dan/atau CON-11

**WEB-11 · Alur sewa dengan wallet pengunjung** · P0 (baru, keputusan Dien 12 Sep) · agent · ✅ · dep: WEB-5
- Detail: `src/lib/wallet.ts` + `HirePanel.tsx`. Connect wallet, tambah/ganti ke CC3 testnet (`wallet_addEthereumChain`), `hire()` payable dengan nilai yang diisi pengunjung, `staticCall` lebih dulu supaya penolakan bureau muncul sebagai kalimat bukan transaksi gagal, dan error wallet diterjemahkan ke bahasa manusia.
- Tanpa wallet atau tanpa saldo: jalur **pratinjau**, split biaya dihitung dari `quote()`, tidak ada yang dibelanjakan. Kunci privat tidak pernah ada di frontend.
- [Diuji 14 Sep 02:30, WEB-21] Transaksi `hire` sungguhan dijalankan dari browser lewat `scripts/wallet-browser-test.mjs`: agent 21548, 0,01 tCTC, panel sukses muncul dengan pembagian premi/escrow dari log `Hired`. Jalur pratinjau dan `quote()` sudah diuji live sebelumnya.

**WEB-12 · Halaman compare** · P0 (keputusan Dien 13 Sep 19:00) · agent · 2 jam · ✅ (`#/compare?a=&b=`, `src/components/ComparePage.tsx`: 9 baris fakta, tiap baris buka "what / how Attestcoin proves it / why"; pilih agent lewat select; hire + bounty per kolom) · dep: WEB-3
- Detail: rute `#/compare?a=<id>&b=<id>`: dua agent berdampingan di bawah satu care level; baris per fakta (pengulas terverifikasi, celah, klon, attestor, kesegaran) dengan penjelasan "apa yang dilakukan, teknologi Attestcoin/precompile apa, manfaatnya" satu klik di bawahnya; tombol hire per agent; label **"passes your settings" vs "held"**, bukan "Recommended" (aturan §8b: tanpa vonis). Agent nyata: 22771 vs 50283 (533571/591140 tidak punya bukti on-chain).

**WEB-13 · Tombol bounty di UI** · P0 (keputusan Dien 13 Sep 19:00) · agent · 1,5 jam · ✅ (`BountyPanel.tsx` + `wallet.fundBounty` dengan `staticCall` dulu; bounty terbuka dibaca `openBounties()` dan tampil di baris agent dan compare; [Diuji 14 Sep 02:30, WEB-21] transaksi `fund` dijalankan dari browser: agent 50283, 0,01 tCTC) · dep: WEB-11
- Detail: agent yang ditahan (atau siapa pun) bisa didanai bounty dari wallet pengunjung: `CoverageBounty.fund(chainKey, agentId, minAge, minDepth, k, c, expiry)` payable memakai ambang care level yang aktif; pratinjau tanpa wallet; bounty terbuka untuk agent itu dibaca dari `bountyCount`/`bountyOf` dan ditampilkan ("0,05 tCTC menunggu bukti yang mengubah keputusan"). Penjelasan scout: siapa pun boleh menjalankannya, tanpa batasan tugas; dibayar hanya bila predikat keputusan berubah.

**WEB-22 · Bounty jadi tab marketplace, compare keluar dari navbar** · P0 (keputusan Dien 14 Sep 03:10) · agent · 1,5 jam · ✅
- **Marketplace punya dua tab** di bawah callout: "Agents" dan "Bounties", masing-masing dengan jumlahnya. Keduanya menyimpan alamatnya sendiri (`#/marketplace` dan `#/bounties`), jadi tiap tab bisa ditautkan dan tombol back bekerja di antara keduanya. Rute lama `#/bounties` sekarang membuka tab, bukan menggulir ke bawah, jadi tidak ada lagi tebakan posisi.
- Daftar bounty naik dari `BountyBoard` ke `useOpenBounties` (`src/lib/useOpenBounties.ts`) supaya tab bisa menyebut jumlahnya sebelum papannya dibuka, dan keduanya tidak mungkin berbeda angka. Judul "Open bounties" jadi `sr-only`: tab di atasnya sudah menamainya.
- **Compare dicabut dari navbar.** Alasannya: tautan navbar mendarat di tabel kosong dan tidak mengajarkan apa pun. Gantinya, di tiap kartu agent ada tombol **Compare** (jadi **Picked** saat aktif) menggantikan checkbox polos yang dulu menempel di judul, dan begitu ada satu pilihan muncul **tray** di kaki jendela: nama agent yang dipilih, slot kosong yang tersisa, tombol Clear, dan tombol Compare yang aktif mulai dua agent.
- Tray dirender ke `document.body` lewat portal. `.route` memakai `animation: routeIn … both`, dan transform di keyframe terakhirnya membuat `position: fixed` terikat ke `.route`, bukan ke jendela; tanpa portal tray terparkir di kaki dokumen (terukur: `top` 3720px pada viewport 950px).
- Baris hitungan kini berisi ajakan, bukan tombol mati: "Press Compare on two to four agents to read them side by side".
- Kriteria selesai: audit 6 rute × 1440/375 × terang+gelap bersih; `tsc` dan `pnpm build` bersih; `wallet-browser-test.mjs` 4/4 (diperbarui untuk mengklik tab, bukan menggulir).

**WEB-21 · Skeleton, proxy agent card, uji wallet dari browser, state kosong bergambar, bundle dipecah** · P0 (keputusan Dien 14 Sep 02:10, "kerjakan semuanya") · agent · 3 jam · ✅
- **Halaman tidak lagi kosong 7 detik.** Marketplace dan compare menampilkan skeleton dalam bentuk kartu/kolom aslinya (`Skeleton` di `ui.tsx`, `.skel` bersinar, bukan berdenyut) mulai ~0,3 detik. Urutan baca di `useBureau` dibalik: pemindaian `AgentProven`/`ReviewProven` jalan sendiri lebih dulu, sedangkan penghitung jaringan dan daftar bounty menyusul di bawahnya. [Fakta] kartu pertama: 7,2 dtk → 4,6–7,2 dtk (median ~5,3 dtk dari 3 pengukuran); bentuk halaman: 7,2 dtk → 0,3 dtk.
- **Rute prosa tidak lagi memicu pembacaan chain.** `useBureau(care, key, enabled)`; FAQ, How it works dan Developers tidak lagi menjalankan tiga pemindaian log dan 25 kuota untuk halaman teks. [Fakta] FAQ siap dalam 1,0 dtk.
- **Proxy dokumen registrasi** (`GET /card/:agentId` di `apps/server`, `src/card.ts`): mengambil `tokenURI` dan dokumennya apa adanya, tanpa menafsirkan; semua penguraian tetap di browser. Browser menjalankan bacaan langsung dan proxy **bersamaan**, bacaan langsung tetap yang menang. [Fakta] agent dengan deskripsi: 2/25 → 4/25, dan semua kartu selesai dalam ~15 dtk, bukan menggantung. [Fakta] 21 agent sisanya memang tidak bisa dibaca siapa pun: 12 memuat halaman web (`execution.market`), 10 host mati (`agents.exquisite.land`), sisanya tanpa `tokenURI`. Teks kartu sekarang menyebut sebab yang benar (`reason`: `not-a-document` / `unreachable` / `none`), bukan menuduh CORS.
- **Tiga alur wallet akhirnya diuji dari browser sungguhan** (`scripts/wallet-browser-test.mjs`): provider EIP-1193 disuntik ke halaman, baca diteruskan ke RPC publik, tanda tangan dilakukan Node dengan kunci proyek. `connect`, `hire` (agent 21548, 0,01 tCTC), `fund` (agent 50283, 0,01 tCTC) dan seluruh jalur `claim` (prover → `proveAndClaim.staticCall` → kalimat `NoChange`) lulus 4/4.
- **Bug browser ditemukan dan diperbaiki oleh uji itu**: `ProverClient` menyimpan `fetch` tanpa mengikatnya, sehingga `this.fetchImpl(...)` dipanggil dengan `this` = klien. Node memaafkan, browser menolak dengan "Illegal invocation" — jadi klaim bounty dari browser **tidak pernah bisa jalan** sebelum ini (`packages/core/src/prover.ts`).
- **State kosong dan gagal jadi bergambar** (`illustrations/StateMarks.tsx`: `NoMatchMark`, `NoBountyMark`, `OfflineMark`), dengan langkah berikutnya di dalam kalimatnya ("Clear the search", "Show all 25 agents"). Keadaan kosong tidak lagi ditampilkan sebelum chain benar-benar menjawab, supaya "tidak ada agent" tidak pernah berarti "belum dibaca".
- **Preamble marketplace dipadatkan**: callout jadi satu baris ringkas, care level dan wallet bar berdampingan di `.market-head` pada ≥900px. Kartu pertama kini terlihat di 1440×950 tanpa menggulir.
- **Compare 3–4 kolom** tidak lagi diperas: tabel punya lebar kolom minimum dan menggulir di dalam bingkainya sendiri (`.compare-scroll`), halaman tidak pernah menggulir menyamping. [Fakta] diuji di 820px (menggulir di bingkai) dan 1024px (muat).
- **Tautan `#/bounties`** menunggu elemennya benar-benar ada dan punya tinggi, bukan timer 400 ms.
- **Bundle dipecah**: halaman prosa dan compare jadi chunk `lazy`, `ethers`/`motion`/vendor terpisah. [Fakta] satu berkas 258 kB gzip → kode aplikasi 35 kB gzip + vendor yang di-cache terpisah.
- Kriteria selesai: audit 6 rute × 1440/375 × terang+gelap bersih (0 masalah); `tsc` bersih di web, server dan core; `pnpm build` bersih; 49 tes kontrak + 7 tes server + 5 tes core lulus.

**WEB-20 · Bounty digabung ke marketplace, callout use case, favicon** · P0 (keputusan Dien 14 Sep 01:30) · agent · 1 jam · ✅
- **Bounty pindah ke marketplace** (`BountyBoard`, bagian `#bounties` di bawah daftar agent, lengkap dengan alur klaim). Item "Bounties" dicabut dari navbar; rute lama `#/bounties` tetap hidup dan langsung menggulir ke bagian itu, jadi tautan lama dan tautan footer tidak mati.
- **Callout tersorot** di atas marketplace (latar teal 9%, garis teal 32%, ikon dalam lingkaran): menegaskan halaman ini hanya satu contoh pemakaian Tinjau, sementara produknya adalah kontrak bureau yang bisa dibaca marketplace, escrow, atau agent mana pun; dengan tautan ke Developers dan How it works.
- **Favicon** digambar ulang mengikuti logo navbar (kaca pembesar teal di atas bidang membulat 32×32, garis lebih tebal supaya terbaca di 16px). Dicek di 16/32/64 px.
- Kriteria selesai: audit 6 rute × 1440/375 × terang+gelap bersih; `tsc` dan `pnpm build` bersih.

**WEB-19 · Halaman bounty + klaim dari browser, compare sampai 4, daftar agent penuh, rincian harga** · P0 (keputusan Dien 14 Sep 00:00) · agent · 2,5 jam · ✅
- **`#/bounties` (baru, masuk navbar)**: daftar bounty terbuka dibaca dari `CoverageBounty` (`openBounties()`), lengkap dengan syaratnya (k, c, tenggat, pendana). Setiap kartu punya **alur klaim di browser**: tempel sampai 4 hash transaksi Ethereum → `ProverClient.proofByTx` mengambil proof → `proveAndClaim.staticCall` lebih dulu (penolakan muncul sebagai kalimat) → kirim. Jadi scout tidak lagi wajib CLI.
- Pesan error kontrak diterjemahkan: `NoChange` (proof tidak mengubah keputusan, disertai saran bukti apa yang biasanya mengubah), `Closed`, `Expired`, `ProofRejected`, `TxHashNotFound`.
- **Compare 2–4 agent**: rute jadi `#/compare?ids=a,b,c` (format `?a=&b=` lama tetap jalan), grid memakai `--compare-cols`, tiap kolom bisa diganti, dihapus, dan ada tombol "Add an agent". Marketplace memilih sampai 4.
- **Daftar agent penuh**: `readAgents` batas dinaikkan dan `useBureau` memuat dua gelombang (12 dulu, sisanya menyusul). Bureau memuat **25 agent**, semuanya kini tampil; sebelumnya terpotong 12.
- **Rincian harga** (`PriceBreakdown`): coverage, faktor look-alike, risk, dan premi ditampilkan dengan angkanya plus rumus kontrak, di balik "Why" tiap agent. Menjawab dugaan bahwa fee 1%/20% itu hardcode: fee dihitung; contoh nyata agent 50724 = risk 7223 bps → premi 1472 bps (14,72%).
- On-chain hari ini: bounty 0,04 tCTC didanai untuk agent 50283 (tx `0x4450ce60…e276`) supaya halaman bounty punya isi nyata.
- Kriteria selesai: audit 7 rute × 1440/375 × terang+gelap bersih; `tsc` dan `pnpm build` bersih.

**WEB-18 · Grid dua kolom, teks dipangkas, penjelasan jadi ilustrasi** · P0 (keputusan Dien 13 Sep 23:40, referensi layout okx.ai/agents) · agent · 2 jam · ✅
- Layout marketplace: kartu ringkas **dua per baris** (≥900px), thumbnail 5,5 rem + nama + verdict + deskripsi terpotong 2 baris + baris statistik (`#id · N proven reviews · sejak · pemilik`) + chip kategori + fee di kanan bawah + baris aksi (Hire · Bounty · Why · tautan ke halaman/harga agent). Monogram memakai ekor nomor registry supaya 50283 dan 50286 bisa dibedakan sekilas.
- **Teks dipangkas di semua halaman** tanpa membuang informasi: hero, problem, scout, deployed, limits, CTA, marketplace, how, developers, FAQ, compare. Contoh: lede marketplace dari 4 kalimat jadi 2; langkah "path a fact takes" dari paragraf jadi satu kalimat per langkah.
- **Tiga ilustrasi menggantikan paragraf** (`src/components/illustrations/`): `ProofPath` (tx Ethereum → proof → kontrak memverifikasi sendiri → fakta + harga) menggantikan tiga kartu teks; `ReviewGaps` (kotak ulasan bernomor, #97 terbukti, 96 sebelumnya kosong, stempel Held) menggantikan penjelasan gate; `FeeLadder` (20% turun ke 1% seiring pengulas terverifikasi) menggantikan penjelasan harga. Semuanya SVG bertoken, punya `<title>` untuk pembaca layar.
- Pembersihan: blok CSS marketplace dan developer yang tergandakan dihapus (menyebabkan clamp deskripsi tidak berlaku).
- Kriteria selesai: audit 6 rute × 1440/375 × terang+gelap bersih; detector impeccable 0 temuan; `tsc` dan `pnpm build` bersih.

**WEB-17 · Marketplace jadi katalog agent sungguhan** · P0 (keputusan Dien 13 Sep 23:00, referensi layout okx.ai/agents) · agent · 2 jam · ✅
- Detail: tiap listing kini punya **dua kompartemen yang tidak pernah dicampur**: "What it says it does" (kata-kata agent sendiri) dan "What Tinjau charges to hire it" (jawaban kontrak).
- Sumber deskripsi: **agent card ERC-8004** dibaca langsung dari Ethereum di browser (`tokenURI` di `0x8004A169…a432` lewat RPC publik ber-CORS), lalu dokumennya diambil dari `data:`, IPFS (tiga gateway berurutan), atau HTTPS (`src/lib/agentCard.ts`). Isi yang dipakai: nama, deskripsi, gambar, kategori/tag, skill, antarmuka (A2A/MCP/API/x402), tautan halaman sendiri dan daftar harga sendiri.
- **Kejujuran**: semua itu ditandai sebagai kata-kata agent yang tidak diperiksa siapa pun; kalau dokumen tidak bisa dibaca (host menolak CORS, atau isinya halaman web), kartu menyebut host-nya dan menautkannya, tidak pernah menebak isinya. Harga yang Tinjau tampilkan tetap premi kontrak + contoh uang, bukan harga karangan.
- Alat: pencarian (nama, deskripsi, tag, skill, nomor), filter verdict (All / Hireable / Held), urutan (Most proven / Lowest fee / Newest), avatar dengan fallback monogram, chip kategori, tetap ada pilih-dua-untuk-compare.
- Kriteria selesai: audit 6 rute × 1440/375 × terang+gelap bersih; `tsc` dan `pnpm build` bersih.

**WEB-16 · Satu latar, daftar agent live, wallet + faucet, rute FAQ dan Developers** · P0 (keputusan Dien 13 Sep 22:00) · agent · 2,5 jam · ✅
- Detail: **band warna dicabut** (Dien: tidak boleh ada section berlatar beda) → satu latar untuk seluruh produk, pemisah hanya garis rambut dan ritme; token `--field*` dihapus karena tak punya konsumen. Palet tetap terang bernuansa teal dengan satu aksen.
- **Daftar agent jadi live**: dibaca dari event `AgentProven` + `ReviewProven` milik kontrak, diurutkan paling banyak terbukti, dibatasi 12 (`readAgents()` di `chain.ts`); `src/lib/agents.ts` (roster hardcode 4 agent) dihapus. Pengulas dimuat malas saat baris dibuka (`useReviewers`) supaya halaman tetap cepat.
- **Wallet bersama** (`useWallet`): satu koneksi untuk seluruh halaman, saldo disegarkan setelah bayar. Marketplace punya **WalletBar**: tombol connect + saldo + tombol **Get test tCTC** (Discord `/faucet`, dokumentasi faucet, explorer) dan peringatan saat saldo di bawah 0,01 tCTC.
- **Rute baru**: `#/faq` (FAQ jadi halaman sendiri, masuk navbar) dan `#/developers` (cara memakai Tinjau sebagai MCP: tiga tool, cara jalankan stdio, konfigurasi klien; baca kontrak langsung; read API; cara menjalankan scout). Navbar: Overview · Marketplace · Compare · How it works · Developers · FAQ.
- **Animasi tambahan**: transisi antar rute, headline wipe clip-path, underline nav menyapu, ikon tombol bergeser, ikon tema berputar, baris/manifest/bukti terangkat saat hover, chip segmented tumbuh, stats + findings + item FAQ masuk berurutan, tombol salin muncul saat hover snippet.
- Kriteria selesai: audit 6 rute × 1440/375 × terang+gelap = `contrast []`, `targets []`, `overflow false`, `problems []`; `tsc` dan `pnpm build` bersih; `apps/web/DESIGN.md` diperbarui.

**WEB-15 · Palet berwarna, animasi, FAQ, halaman How it works** · P0 (keputusan Dien 13 Sep 21:00) · agent · 3 jam · ✅
- Detail: palet **Committed** (keputusan Dien: "jangan hitam saja", tema terang default): netral nyaris putih bernuansa teal + tiga **band** teal pekat (hero, scout, penutup) yang membawa suara; tema gelap jadi tema kedua (tinta bernuansa, bukan hitam murni). Elemen "pill dengan titik berdenyut" dihapus total (permintaan Dien: terlihat generik AI); blok live jadi teks mono biasa.
- Animasi: masuknya baris tabel berurutan (70 ms), pill verdict muncul skala-pudar, disclosure/panel memakai clip-path wipe, nilai compare di-crossfade saat care level berubah, kartu verdict crossfade, jawaban FAQ memakai `grid-template-rows`, glow band bergeser pelan 26 s. Angka live **tidak** dianimasikan (aturan produk: angka chain ditulis apa adanya); count-up hanya untuk fakta terkarang (346 / 225 / 83). Semua hormat `prefers-reduced-motion`.
- FAQ (`src/components/Faq.tsx`): dua kolom pertanyaan, **For judges** (kedalaman Attestcoin, apakah load-bearing, kecocokan track AI, apa yang live, kebaruan, orisinalitas) dan **For visitors** (apakah ini skor, arti "Held", asal fakta, ke mana uang pergi, apa itu scout dan bounty, uang sungguhan?, kenapa Ethereum saja, cara mengecek sendiri).
- Halaman **How it works** (`#/how`, `HowPage.tsx`): tiga pintu (penyewa, scout, pemilik agent), alur 5 langkah perjalanan sebuah fakta, pencarian agent langsung ke kontrak, dan perintah verifikasi. Navbar "Agents" → **"Marketplace"** dengan salinan use case.
- Kriteria selesai: audit `scripts/screenshot.mjs` di 4 rute × 1440/375 × terang+gelap = `contrast []`, `targets []`, `overflow false`, `problems []`; `tsc` dan `pnpm build` bersih; `apps/web/DESIGN.md` ditulis ulang dari hasil build.

**WEB-14 · Rombak UI/UX mengikuti aturan dan layout Veritas-UHI9** · P0 (keputusan Dien 13 Sep 19:00, via `/impeccable`) · agent · 4 jam · 🔄 build selesai 13 Sep 20:10, menunggu finish review: rute hash landing/agents/compare, token Veritas + aksen teal, Fraunces/Hanken Grotesk/IBM Plex Mono, gelap default + toggle; audit `scripts/screenshot.mjs` (kontras oklch→sRGB nyata) = 0 kontras gagal, 0 target <24px, 0 overflow di 1440/375 gelap+terang · dep: WEB-8
- Detail: dunia visual Veritas (`Veritas-UHI9/DESIGN.md`): netral gelap chroma 0 + toggle terang, satu aksen brand untuk interaksi (Tinjau memakai aksen sendiri, bukan biru Reactive; keputusan Dien), hijau/amber/merah hanya untuk status dan selalu berpasangan dengan ikon + label; Fraunces (display) + Hanken Grotesk (body) + IBM Plex Mono (angka/hash); radius 14/10; ease-out-expo, satu reveal terorkestrasi; nav sticky dengan link + toggle tema; tabel baris tenang (bukan grid kartu); footer 3 kolom dengan manifest kontrak. Struktur: landing (`#/`) + `#/agents` + `#/compare`. Tetap CSS biasa (tanpa Tailwind) dan invariant §8b (tanpa skor, tanpa jargon di lapisan pertama, kalimat dari `plain.ts`).
- Kriteria selesai: `node ../../scripts/screenshot.mjs` bersih di 1440 dan 375; detector impeccable dijalankan; DESIGN.md `apps/web` ditulis ulang dari hasil build.

### 5.9 DOC: Dokumen (G4)

**DOC-1 · Panduan pengembangan v3 (living document)** · P0 · agent · 1,5 jam · ✅ (`docs/panduan-pengembangan.md` v3.0) · dep: SET-5
- Detail: `docs/panduan-pengembangan.md`, diturunkan dari `docs/legacy/00-panduan-pengembangan.md`, diperbarui untuk struktur monorepo, alamat v3, perintah pnpm/forge baru. Wajib: invariant, aturan tindakan, klaim terlarang, angka resmi (§8 tracker ini), peta folder, changelog.

**DOC-2 · README** · P0 · agent · 1 jam · ✅ (tanpa screenshot sampai frontend) · dep: DEP-6
- Detail: judul "a credit bureau for AI agents…"; bagian Why a credit bureau, Problem, Solution, How it works (mermaid), Run locally (pnpm), Contract addresses v3, What was built during the hackathon, Known limitations. Screenshot dari WEB-9.

**DOC-3 · `ATTESTCOIN_INTEGRATION.md`** · P0 · agent · 1 jam · ✅ (`ATTESTCOIN_INTEGRATION.md`, 15 tx + gas) · dep: DEP-5
- Detail: precompile yang dipakai (0x0FD2, dan 0x0FD3/0x0FD4 bila CON-10/11), decoding, kenapa produk mati tanpa Attestcoin, tabel semua tx testnet v3 dengan gas, fakta on-chain. Teks ini ditempel ke form DoraHacks.

**DOC-4 · Dosier penilaian v3** · P0 · agent · 1,5 jam · ✅ (`docs/evaluation-dossier.md` v3.0, bahasa Inggris untuk juri) · dep: DOC-3
- Detail: turunan `docs/legacy/evaluation-dossier.md` v1.5 dengan angka v3; bagian verifikasi berisi perintah yang bisa dijalankan juri.

**DOC-5 · Deck** · P0 · agent · 1 jam · ✅ (11 halaman; `<VIDEO_URL>` menyusul) · dep: DOC-3
- Detail: `docs/deck.md` (Marp) dari `docs/legacy/deck.md` dengan angka v3; build `npx -y @marp-team/marp-cli@latest docs/deck.md --pdf --allow-local-files -o docs/deck.pdf`; periksa halaman yang berubah sebagai gambar.

**DOC-6 · Naskah video** · P0 · agent · 45 menit · ✅ (`docs/demo-script.md`, 13 Sep, mengikuti alur Dien; hash 12 Sep deployment; tiga bagian alur yang tidak ada di UI ditandai) · dep: WEB-9
- Detail: `docs/demo-script.md` dengan hash v3 dan angka yang diucapkan = fakta on-chain; urutan adegan dari `docs/legacy/demo-script.md`.

**DOC-7 · Produk dan teknis v3** · P1 · agent · 1 jam · ✅ (digabung ke panduan §5–§9 dan dosier §4) · dep: DOC-1
- Detail: `docs/produk.md`, `docs/teknis.md` turunan legacy dengan arsitektur monorepo.

**DOC-8 · Perbarui `CLAUDE.md` workspace** · P0 · agent · 10 menit · ✅ · dep: DOC-1
- Detail: baris status Tinjau menunjuk ke `Tinjau/` dan tracker ini; path lama `docs/build/grounded-reputation/` dicabut.

### 5.10 GH: Repo GitHub

**GH-1 · Commit bertahap** · P0 · agent · berjalan · 🔄 (commit bertahap, semua atas nama Scientivan tanpa trailer) · dep: SET-4
- Detail: commit kecil per task (`feat:`, `fix:`, `docs:`, `chore:`), tanpa atribusi AI, tanpa `.env`. Periksa `git log --format='%an %(trailers)'` sebelum push.

**GH-2 · Force-push ke `k3cs/TinjauAI`** · P0 · agent · 15 menit · 🔄 push pertama sudah (12 Sep, origin/main `ef692d2`, `gh-pages` terhapus); **push kedua diperlukan**: lokal 3 commit di depan + 12 file belum di-commit (13 Sep). Izin Dien per push · dep: WEB-9, DOC-2
- Detail: minta izin eksplisit Dien di sesi itu; `git push --force origin main` (tanpa branch `gh-pages`; hosting di Vercel). Branch `gh-pages` lama (UI v2 di k3cs.github.io/TinjauAI) masih menampilkan angka v2: **keputusan Dien 11 Sep: hapus saat GH-2** (`git push origin --delete gh-pages`). Riwayat v2 di GitHub hilang (salinan lokal ada di Trash). Setelah push: buka repo di browser, pastikan README, deck, dan tidak ada `.env`.
- Kriteria selesai: repo publik menampilkan v3; commit hanya atas nama Dien.

### 5.11 SUB: Submission

**SUB-1 · Checklist pra-rekam** · P0 · agent · 20 menit · 🔄 (checklist di `docs/demo-script.md` §4; tinggal dijalankan bersama Dien setelah web live) · dep: WEB-9, DOC-6
- Detail: semua tab Blockscout, UI live, terminal siap; semua angka di layar dicocokkan dengan §8.

**SUB-2 · Uji alur demo tanpa rekam** · P0 · agent + Dien · 30 menit · ⬜ · dep: SUB-1

**SUB-3 · Rekam video ≤3 menit** · P0 · **Dien** · 1–2 jam · ⬜ · dep: SUB-2
- Detail: 1080p, font terminal ≥16 pt, YouTube unlisted, cek di incognito.

**SUB-4 · Isi `<VIDEO_URL>`** · P0 · agent · 15 menit · ⬜ · dep: SUB-3
- Detail: di `docs/submission.md` dan `docs/deck.md`; build ulang deck; commit + push (izin Dien).

**SUB-5 · Teks form** · P0 · agent · 45 menit · ✅ (284 kata; `<VIDEO_URL>`, `<APP_URL>` menyusul) · dep: DOC-3
- Detail: `docs/submission.md`: nama, sektor AI, one-liner ≤140 karakter, deskripsi ≤300 kata (framing biro kredit), Integration Summary, repo, deck URL, video URL, alamat v3. Tanpa data pribadi.

**SUB-6 · Submit DoraHacks** · P0 · **Dien** · 30 menit · ⬜ · dep: GH-2, SUB-4, SUB-5
- Detail: data tim diisi langsung di form; submit sebelum 13 Sep 22:00 WIB (target), batas keras 14 Sep 10:59 WIB.

---

### 5.12 VCL: Hosting Vercel (DEC-D)

[Fakta] Yang perlu di-host hanya tiga, dan ketiganya tanpa state di server: fakta ada di chain, angka dihitung dari RPC dan prover API.
[Inferensi] Tidak ada komponen yang butuh server yang hidup terus. Satu-satunya proses panjang (scout) sengaja tidak di-host.

| Komponen | Bentuk di Vercel | Catatan |
|---|---|---|
| `apps/web` | situs statis (Vite build) | env `VITE_*` di proyek Vercel |
| `apps/server` | Vercel Functions (Hono adapter Vercel) | stateless; `maxDuration` dinaikkan untuk rute LLM/prover; kunci LLM di env Vercel |
| `apps/mcp-server` | Vercel Function dengan transport MCP HTTP (stateless) + mode stdio lokal | tidak menyimpan sesi |
| `services/scout` | **tidak di-host**, CLI lokal | memegang `PRIVATE_KEY`; menunggu atestasi 6–10 menit per blok; kunci privat tidak ditaruh di platform hosting |
| Kontrak | on-chain CC3 Testnet | tidak di-host |

Log scout untuk web/server: scout menulis JSON (`services/scout/plans/`, lalu `scripts/export-demo.ts` menyalin ringkasannya ke `apps/web/public/demo/` dan `apps/server` membaca file statis yang ikut ter-deploy). Tidak ada penyimpanan tulis di Vercel.

**VCL-1 · Akun, proyek, dan CLI Vercel** · P0 · Dien (login) + agent · 20 menit · ⏳ · dep: SET-2
- Status 11 Sep: **ditunda oleh Dien** ("vercelnya nanti saja"). CLI `vercel` belum terpasang di mesin (`command not found`); pasang saat VCL-1 dimulai (`npm i -g vercel`), lalu Dien menjalankan `vercel login`.
- Detail: Dien login `vercel` CLI (agent tidak memasukkan kredensial). Buat tiga proyek (web, server, mcp) dengan root directory monorepo masing-masing; pnpm workspace terdeteksi.
- Kriteria selesai: `vercel link` untuk ketiganya.

**VCL-2 · Deploy web** · P0 · agent · 20 menit · ⬜ · dep: VCL-1, WEB-8 (setelah aba-aba frontend)
- Detail: preview dulu, produksi setelah izin Dien; env `VITE_CC3_RPC`, `VITE_FACTS`, `VITE_ESCROW`.

**VCL-3 · Deploy server** · P1 · agent · 30 menit · ⬜ · dep: VCL-1, SRV-1
- Detail: adapter Vercel untuk Hono; env RPC, prover API, alamat kontrak, kunci LLM (diisi Dien di dashboard/CLI, bukan di repo); uji `GET /health` dan `/facts`.

**VCL-4 · Deploy MCP** · P1 · agent · 30 menit · ⬜ · dep: VCL-1, MCP-1
- Detail: endpoint MCP HTTP stateless; uji dengan MCP Inspector; mode stdio lokal tetap ada.

**VCL-5 · Cek batas platform** · P0 · agent · 15 menit · ⬜ · dep: VCL-1
- Detail: baca dokumentasi Vercel terkini untuk batas durasi function, ukuran bundle, dan cron pada paket akun Dien; catat di sini. Belum diverifikasi saat tracker ditulis.

---

## 6. Jalur kritis

SET-1 → SET-2 → CON-1 → CON-3 → CON-4…CON-7 → CON-8/CON-9 → CON-14 → DEP-2 → DEP-4 → DEP-6 → (aba-aba Dien) WEB-1…WEB-9 → VCL-2 → DOC-6 → SUB-3 (Dien) → GH-2 → SUB-6 (Dien)

Paralel yang aman: PKG-1…PKG-3 dan WEB-1…WEB-2 bisa dikerjakan saat kontrak ditulis; SCT-1 setelah PKG-1; DOC-1 kapan saja setelah SET-5.

## 7. Risiko build ulang

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Waktu 61 jam untuk semua komponen | tinggi | gerbang + aturan potong otomatis (§2); P1 hanya bila gerbang aman |
| Prover API/Blockscout rate limit atau lambat | sedang | cache fixture dan plan; batch; retry di PKG-3 |
| Precompile tidak bisa diemulasi Foundry | sedang | fixture `txBytes` asli + mock; verifikasi final di testnet (DEP-4) |
| Saldo tCTC habis | sedang | DEP-1 di awal; faucet via Dien |
| Force-push menghapus riwayat v2 di GitHub | diterima (keputusan Dien) | salinan lokal di Trash; GH-2 hanya dengan izin |
| Angka lama v2 bocor ke materi v3 | tinggi (klaim salah) | semua angka publik hanya dari §8; grep angka v2 sebelum GH-2 |

## 8. Angka resmi v3 (diisi saat task selesai)

| Hal | Nilai | Sumber |
|---|---|---|
| `GroundedFacts` | `0x67394eC13E911ab0D3A26132BECa404F26e17a98` (tx `0x9cb61f28…8ba6`, blok 5.475.585, 3.192.770 gas, 12 Sep 21:54 WIB; DEC-F) | DEP-2 |
| `AgentHireEscrow` | `0xF801a8a01E018f3Bf9a648F4C095a53979282EEA` (tx `0xad10ca1d…feab`, blok 5.475.586, 920.666 gas) | DEP-2 |
| `CoverageBounty` | `0xa27f14CD50BF334E7Fb09601cEf203745aADF569` (tx `0x6c663e7c…b940`, blok 5.475.587, 862.895 gas) | DEP-2 |
| Jumlah tes | 49/49 (`forge test`, 13 Sep; 41 saat deploy 11 Sep) | CON-14, CON-13 |
| Jumlah tx sumber teradmit | **33 per 13 Sep 18:20** di kontrak 12 Sep (`TxAdmitted`, 11 tx `record`/`proveAndClaim`, sumber blok 14.306.215–25.949.112, semua mainnet). Kontrak 11 Sep (pensiun) memegang 34 termasuk 1 Sepolia | DEP-4, SCT-8 |
| `facts(3, 22771)` / premi | raw 3, grounded 3, independent 3, gaps 0, clones 0, attestors 4 → premi **100 bps**, disewa scout (tx `0x3a8d2c53…b8c4`, 13 Sep) | DEP-5 |
| `facts(3, 50283)` / quote / `Gated` | raw 1, grounded 0, gaps 1, clones 9, registrantSib 9 (13 Sep) → quote **2.000 bps**, `hire` revert `Gated(1)` (`0x393108e5…01`) | DEP-5 |
| Bounty diklaim / hire scout | bounty #0 0,05 tCTC (fund `0xea3b3712…b27f`) diklaim scout via `proveAndClaim` `0x8a32b470…d68d`; hire 21548 `0x02933cb3…48d0` (100 bps); release job 1 `0x27fbf060…b95b` | DEP-7 |
| Gas `verify` precompile | 62.292 (7 root) … 631.434 (984 root); tx tertua blok 14.306.215 (2 Mar 2022) = 506.986 gas; gas ≈ 55k + ~580·roots, jumlah root tidak monoton terhadap umur | DEP-4 |
| URL video | ⬜ | SUB-3 |

Referensi v2 (**tidak boleh dipakai di materi publik v3**): lihat `docs/legacy/ATTESTCOIN_INTEGRATION.md`.

## 9. Log

| Waktu (WIB) | Task | Perubahan | Oleh |
|---|---|---|---|
| 14 Sep 03:40 | WEB-22 | Bounty jadi tab marketplace (`#/bounties` membuka tab, jumlahnya tampil di tab), compare dicabut dari navbar dan diganti tombol Compare per kartu + tray pilihan di kaki jendela (portal ke body, karena transform `.route` menangkap `position: fixed`) | Claude |
| 14 Sep 02:40 | WEB-21 | Skeleton di marketplace dan compare (bentuk halaman 7,2 dtk → 0,3 dtk), rute prosa tidak lagi membaca chain, proxy dokumen registrasi `/card/:agentId`, state kosong/gagal bergambar, preamble dipadatkan, compare 3–4 kolom menggulir di bingkainya, bundle dipecah (258 → 35 kB gzip kode aplikasi). Hire, fund dan claim akhirnya dijalankan dari browser sungguhan (4/4 lulus) dan menemukan bug `fetch` tak terikat di `ProverClient` yang membuat klaim dari browser mustahil | Claude |
| 14 Sep 01:40 | WEB-20 | Bounty digabung ke marketplace (rute lama tetap jalan), callout use case tersorot di atas marketplace, favicon mengikuti logo navbar | Claude |
| 14 Sep 01:00 | WEB-19 | Halaman `#/bounties` + klaim bounty dari browser (tempel hash tx → proof → proveAndClaim), compare 2–4 agent, daftar agent penuh (25, dua gelombang), rincian perhitungan fee; bounty 0,04 tCTC didanai on-chain | Claude |
| 14 Sep 00:10 | WEB-18 | Marketplace jadi grid dua kolom kartu ringkas (referensi okx.ai/agents); teks seluruh halaman dipangkas; tiga ilustrasi SVG (ProofPath, ReviewGaps, FeeLadder) menggantikan paragraf penjelas; CSS ganda dibersihkan | Claude |
| 13 Sep 23:20 | WEB-17 | Marketplace jadi katalog agent: deskripsi, kategori, skill, antarmuka, dan tautan diambil dari agent card ERC-8004 milik agent sendiri (dibaca dari Ethereum di browser), ditandai sebagai klaim tak terverifikasi, berdampingan dengan premi kontrak; plus pencarian, filter, urutan, avatar | Claude |
| 13 Sep 22:30 | WEB-16 | Band warna dicabut (satu latar), daftar agent live dari event kontrak (12 agent, roster hardcode dihapus), wallet bersama + WalletBar dengan faucet tCTC di marketplace, rute `#/faq` dan `#/developers` (panduan MCP), 9 animasi tambahan. Audit bersih di 6 rute × 2 lebar × 2 tema | Claude |
| 13 Sep 21:40 | WEB-15 | Palet Committed (terang default + tiga band teal, gelap jadi tema kedua), pill berdenyut dihapus, 8 animasi ditambahkan, FAQ dua audiens, halaman `#/how`, navbar "Agents" → "Marketplace". Audit bersih di 4 rute × 2 lebar × 2 tema; `DESIGN.md` ditulis ulang | Claude |
| 13 Sep 20:40 | WEB-12…14, §8b panduan | Frontend dirombak (WEB-14): rute hash landing/agents/compare, dunia visual Veritas + aksen teal, gelap default + toggle; compare (WEB-12) dan bounty di UI (WEB-13) selesai. Finish review impeccable: disposisi **fix**, 8 temuan diterapkan (jargon lapisan pertama, tint per-baris compare, eyebrow, contoh uang, nav mobile, motion, DESIGN.md, sitasi pin); audit ulang bersih; verdict pass + DESIGN.md (documenter) sedang berjalan. Panduan §8b ditulis ulang | Claude |
| 13 Sep 19:00 | WEB-12…14 | Keputusan Dien: naskah pakai 22771 vs 50283 dan label "passes your settings"/"held"; tambah halaman compare (WEB-12), tombol bounty (WEB-13), rombak UI/UX mengikuti Veritas-UHI9 via /impeccable (WEB-14): aksen sendiri, gelap default + toggle, rute landing/agents/compare | Claude |
| 13 Sep 18:45 | DEP-6, PKG-4 | `recomputeFromChain` dari data chain saja: 33/33 replay, identik untuk 22771, 21548, 50283, 50286. Perbaikan `packages/core/src/recompute.ts`: fallback Blockscout untuk lookup (blok, indeks) karena RPC publik memangkas riwayat < 15.500.000; tes core hijau. Dokumen publik, deck.pdf, `facts.json`, `scout-summary.json` sudah di alamat 12 Sep; typecheck web/server OK | Claude |
| 13 Sep 18:20 | DEC-F, DEC-G, DEP-4…7, SCT-8, DOC-6, SUB-1, §8 | DEC-F (b) dikerjakan: urutan live di kontrak 12 Sep (`live-20260913-1805.log`), migrasi 11 proof lama, 33 `TxAdmitted`, verify + export (`facts.json`, `scout-summary.json`); launchd scout; `docs/demo-script.md` + checklist SUB-1; semua dokumen publik dipindah ke alamat 12 Sep, Sepolia = dikeluarkan by design | Claude |
| 13 Sep 18:10 | §0b, CON-13, SCT-8, GH-2, §8 | Verifikasi independen: ditemukan deploy kedua 12 Sep 21:54 (`0x6739…`, kosong, tidak tercatat; `.env`/`deployments.json` sudah menunjuk ke sana, belum di-commit) → DEC-F; cron scout tidak terpasang, siklus terakhir 12 Sep 21:00 → DEC-G; tes 49/49; `TxAdmitted` 34; origin/main 3 commit di belakang + 12 file belum di-commit | Claude |
| 13 Sep 17:30 | DOC-2…5, SET-5 | Koreksi: Evidence Exchange bukan "roadmap, belum ada kode"; inti (`fund`/`decisionOf`/`proveAndClaim`, urutan sumber) sudah live, yang belum: `proveBatchAndClaim`, adjudication receipt, re-pricing di tx yang sama. Diperbaiki di README, integration summary, AGENTS, deck (+PDF), dosier §8.3, panduan §3, CLAUDE.md, DECISIONS, list-document | Claude |
| 13 Sep | DOC-1…5, SUB-5, SET | Sinkronisasi pemahaman produk (ideation final 13 Sep): headline "verified background checks", biro kredit = analogi; koreksi `minAttestors`/`coveredThrough`/completeness di README, integration summary, deck, submission, dosier, panduan, `plain.ts`, `app.ts`; Evidence Exchange ditandai roadmap; kriteria DoraHacks dibaca ulang live (137 BUIDL, deadline 14 Sep 10:59 WIB). Indeks file: `../docs/list-document.md` | Claude |
| 12 Sep 13:10 | WEB-1…WEB-8, WEB-11 | Frontend dibangun: marketplace bahasa manusia, preset kehati-hatian, disclosure bukti, alur sewa wallet + pratinjau, latar hero sendiri, navbar yang membalik di band gelap. Audit browser bersih (kontras/target/overflow/konsol) di 1440 dan 375. Koreksi: kalimat `gapCount` yang salah arti, preset Careful yang mustahil dipenuhi, klaim "somebody funded the bounty" (kami sendiri yang danai) | Dien |
| 12 Sep 10:30 | SRV-2, SCT-8, GH-2 | Pembaca klaim pindah dari Claude ke Gemini (ladder `3.8-flash`→…→`3.1-flash-lite`, fallback saat 429/503/404); `@anthropic-ai/sdk` dibuang; 7/7 tes live; laporan live 50283 = 6 klaim pembayaran, 0 ada di chain yang diklaim; cron scout dipasang; force-push ke `k3cs/TinjauAI` atas izin Dien | Dien |
| 11 Sep 23:55 | DOC-1…5/7/8, SUB-5, SCT-8 | README, integration summary, dosier v3, deck, submission, panduan v3; klaim "active for years" untuk 22771 dikoreksi (97 hari sampai 4 tahun); scan angka v2: bersih | Claude |
| 11 Sep 23:40 | PKG, SCT, DEP-4…8, SRV-1/3, MCP-1 | core + scout + server + MCP; urutan live: bounty diklaim, 2 hire (100 bps), 50283 Gated, siklus kedua 0 gas; verify identik (plan lokal dan data chain saja); CC3 mainnet verify = true; mainnet AttestorStash: 7 attestor, bond minimal 0 | Claude |
| 11 Sep 22:55 | CON-14, DEP-1…3 | Review: 3 temuan diperbaiki (bounty free-ride, truncated, grounded butuh indeks lengkap), 41/41 tes; deploy + verifikasi 3 kontrak; `attestedTip(3)` on-chain = 25.955.150 (ChainInfo terbaca dari kontrak) | Claude |
| 11 Sep 22:43 | CON-1…CON-12 | Kontrak v3 ditulis ulang dari nol, 38/38 tes; precompile dicek live; CON-14 self-review | Claude |
| 11 Sep 22:50 | GH-2, VCL-1 | Dien: `gh-pages` dihapus saat force-push; Vercel ditunda | Claude |
| 11 Sep 22:40 | SET-1…6 | node_modules sisa Sui/Luber dihapus; workspace pnpm (core, scout, server, mcp-server; `apps/web` sengaja kosong); `.gitignore` (`.env` terabaikan, dicek `git check-ignore`); `.env.example`; git init + remote `k3cs/TinjauAI` (belum push); `AGENTS.md` + `claude.md`; toolchain: forge 1.7.1, Node 24.10.0, pnpm 10.18.3, TypeScript 5.9 | Claude |
| 11 Sep 22:25 | DEC-A…E | DEC-A/B/C/E disetujui; DEC-D direvisi: hosting serverless di Vercel (§5.12), scout lokal; frontend ditahan sampai aba-aba Dien | Claude |
| 11 Sep 22:10 | - | Repo v2 diarsipkan ke Trash; `.env` (kunci deployer) disalin ke `Tinjau/.env`; dokumen v2 ke `docs/legacy/`; tracker dibuat | Claude |
