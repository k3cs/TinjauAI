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

**CON-13 · Batch proof (continuity bersama)** · P2 · agent · 3 jam · ⬜ · dep: CON-3
- Detail: jalur `verify` batch (≤10 proof, rentang ≤1.000 blok) untuk riwayat rapat. Hanya bila CON-1…CON-12 selesai sebelum G1.

**CON-14 · Review keamanan** · P0 · agent · 1 jam · ✅ (review manual 11 Sep; skill `engineering:code-review` hanya berisi kerangka, review dikerjakan langsung; 3 temuan diperbaiki, lihat `docs/quality/code-review.md`) · dep: CON-8, CON-9
- Detail: jalankan skill `engineering:code-review` pada kontrak; periksa reentrancy, cast overflow, gas loop, akses; perbaiki temuan kritis; simpan laporan di `docs/quality/code-review.md`.
- Kriteria selesai: 0 temuan kritis terbuka; `forge test` hijau.


**Catatan implementasi CON-1…CON-12 (11 Sep 2026 malam)** [Fakta, `contracts/`]
- `forge test`: **38/38 lulus** (25 `GroundedFactsTest`, 13 `ConsumersTest`). Fixture asli: 4 proof dari prover API (`scripts/fetch-fixture.sh`): `NewFeedback` mainnet (agent 50286, indeks 24), aktivitas mainnet tertua pengulas `0x1030…` (blok 23.779.699), tx pendaftaran massal 52 KB (10 `Registered`, agent 41885…), `NewFeedback` Sepolia (agent 9865).
- Precompile dicek live di CC3 testnet sebelum dipakai: `verify` proof mainnet segar = `true`, `calculateTxIndex` = 300 (sama dengan API); AttestorStash `0x0fd4` `getAttestorsCount` = 7 (chainKey 1) / 4 (chainKey 3), bond 100 CTC; ChainInfo `0x0fd3` `get_latest_attestation_height_and_hash` jalan (selector snake_case). ABI ChainInfo dari `@gluwa/usc-sdk` 0.18.0; AttestorStash tidak ada di docs/SDK (selector dari repo Singleton, lalu diverifikasi sendiri).
- **CON-10 berubah desain** [Inferensi]: penjaga "jarak minimum dari tip" tidak dipakai karena prover hanya memberi proof untuk blok yang sudah teratestasi (margin tambahan hanya menambah jeda demo). Gantinya: `attestedTip(chainKey)` membaca ChainInfo, `facts()` mengembalikan `coveredThrough`, dan `AgentHireEscrow` bisa menolak fakta basi (`maxStaleness`, error `Stale`). Konsumen memutuskan, kontrak fakta tidak menilai.
- **CON-11**: jumlah attestor ber-bond dibaca dari `0x0fd4` saat setiap proof masuk; `facts().minAttestors` = set attestor terlemah di balik fakta agent itu; eskrow bisa menolak (`minAttestors`, error `ThinQuorum`).
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

**SCT-8 · Scout tanpa pengawasan sampai deadline** · P1 · agent · 1 jam setup · 🔄 (`scripts/scout-cron.sh` siap; belum dipasang ke cron, butuh izin Dien karena mengubah konfigurasi mesin) · dep: DEP-7
- Detail: jadwal berkala **lokal** (launchd/cron di mesin Dien, bukan Vercel; alasan di §5.12) dengan batas anggaran; laporan N proof, N agent, N pengulas, gas total; dipakai di dosier dan video.

### 5.6 SRV: `apps/server` (P1, DEC-B)

**SRV-1 · Kerangka Hono** · P1 · agent · 30 menit · ✅ (diuji lokal) · dep: PKG-5
- Detail: `GET /health`, `GET /facts/:chainKey/:agentId?minAge&minDepth`, `GET /quote/...`, `GET /scout/log`; semua angka dibaca dari chain via `packages/core`, tanpa database.

**SRV-2 · LLM pembaca klaim** · P1 (DEC-C) · agent · 3 jam · 🔄 (kode selesai: Anthropic SDK `claude-opus-5`, structured output Zod; uji LLM live ⏳ butuh `ANTHROPIC_API_KEY` dari Dien) · dep: SRV-1, PKG-3
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

**⏳ Menunggu aba-aba Dien (keputusan 11 Sep).** Agent tidak memulai task WEB-* apa pun (termasuk kerangka WEB-1) sebelum Dien memberi aba-aba eksplisit. Yang boleh dikerjakan sebelumnya: `packages/core` (dipakai web nanti) dan SCT-7 (data demo).

Acuan tampilan v2: `docs/legacy/screenshot-live.jpg`. Framing wajib: **biro kredit untuk agent AI** (`docs/legacy/00-panduan-pengembangan.md` §3).

**WEB-1 · Kerangka** · P0 · agent · 45 menit · ⬜ · dep: SET-2, PKG-1
- Detail: Vite + React + TypeScript + Tailwind + TanStack Query; token desain dan font; mode demo (`public/demo/facts.json`) dan live (`VITE_FACTS`, `VITE_ESCROW`, `VITE_CC3_RPC`).

**WEB-2 · Header dan framing** · P0 · agent · 30 menit · ⬜ · dep: WEB-1
- Detail: kalimat pembuka menyebut AI agent, reviewer, dan credit bureau; tanpa kata "score" untuk keluaran Tinjau.

**WEB-3 · Ambang konsumen + dua agent** · P0 · agent · 1 jam · ⬜ · dep: WEB-1, PKG-5
- Detail: input `minAge`, `minDepth`, `k`, `c`; dua agentId (default 22771 vs 50283); angka dari `facts()` (live) atau demo.

**WEB-4 · Kuitansi fakta** · P0 · agent · 2 jam · ⬜ · dep: WEB-3
- Detail: tiap fakta bisa diklik → rantai bukti: tx Ethereum (Etherscan/Blockscout) **berdampingan** dengan tx `record` di Creditcoin (Blockscout CC3), jumlah root, gas.

**WEB-5 · Meter premi = biaya kredit** · P0 · agent · 45 menit · ⬜ · dep: WEB-3
- Detail: `quote()` → premi (bps dan %) dan status `Gated` dengan alasannya.

**WEB-6 · Narasi "kenapa" dengan sitasi** · P1 · agent · 1,5 jam · ⬜ · dep: WEB-4, WEB-5
- Detail: satu kalimat per keputusan ("gated karena ulasan #N dari pengulas X hilang", "premi 1% karena 3 pengulas senior"), setiap kalimat mengutip hash tx. Dibangkitkan deterministik dari fakta, bukan LLM.

**WEB-7 · Tabel pengulas, log scout, blok "Verify it yourself"** · P0 · agent · 1,5 jam · ⬜ · dep: WEB-3, SCT-7
- Detail: pengulas (senioritas, bucket, memiliki agent?), log keputusan scout (dipilih vs ditolak dengan alasan), perintah `cast call` dan hitung-ulang yang bisa dijalankan juri.

**WEB-8 · Kualitas** · P0 · agent · 1 jam · ⬜ · dep: WEB-2…WEB-7
- Detail: kontras ≥4,5:1 terang dan gelap, reduced-motion, fokus keyboard, lebar ~400 px; Playwright smoke test (halaman memuat, angka live terisi); cek visual di Chrome.

**WEB-9 · Freeze + publish Vercel** · P0 · agent (deploy produksi: izin Dien) · 30 menit · ⬜ · dep: WEB-8, DEP-6, VCL-2
- Detail: build dengan alamat v3; deploy produksi ke Vercel (VCL-2); screenshot baru `docs/screenshot-live.jpg`. Setelah freeze, perubahan UI hanya perbaikan bug.

**WEB-10 · Tampilan laporan klaim dan attestor** · P1 · agent · 1 jam · ⬜ · dep: SRV-3 dan/atau CON-11

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

**DOC-6 · Naskah video** · P0 · agent · 45 menit · ⬜ · dep: WEB-9
- Detail: `docs/demo-script.md` dengan hash v3 dan angka yang diucapkan = fakta on-chain; urutan adegan dari `docs/legacy/demo-script.md`.

**DOC-7 · Produk dan teknis v3** · P1 · agent · 1 jam · ✅ (digabung ke panduan §5–§9 dan dosier §4) · dep: DOC-1
- Detail: `docs/produk.md`, `docs/teknis.md` turunan legacy dengan arsitektur monorepo.

**DOC-8 · Perbarui `CLAUDE.md` workspace** · P0 · agent · 10 menit · ✅ · dep: DOC-1
- Detail: baris status Tinjau menunjuk ke `Tinjau/` dan tracker ini; path lama `docs/build/grounded-reputation/` dicabut.

### 5.10 GH: Repo GitHub

**GH-1 · Commit bertahap** · P0 · agent · berjalan · 🔄 (commit bertahap, semua atas nama Scientivan tanpa trailer) · dep: SET-4
- Detail: commit kecil per task (`feat:`, `fix:`, `docs:`, `chore:`), tanpa atribusi AI, tanpa `.env`. Periksa `git log --format='%an %(trailers)'` sebelum push.

**GH-2 · Force-push ke `k3cs/TinjauAI`** · P0 · agent · 15 menit · ⏳ izin Dien · dep: WEB-9, DOC-2
- Detail: minta izin eksplisit Dien di sesi itu; `git push --force origin main` (tanpa branch `gh-pages`; hosting di Vercel). Branch `gh-pages` lama (UI v2 di k3cs.github.io/TinjauAI) masih menampilkan angka v2: **keputusan Dien 11 Sep: hapus saat GH-2** (`git push origin --delete gh-pages`). Riwayat v2 di GitHub hilang (salinan lokal ada di Trash). Setelah push: buka repo di browser, pastikan README, deck, dan tidak ada `.env`.
- Kriteria selesai: repo publik menampilkan v3; commit hanya atas nama Dien.

### 5.11 SUB: Submission

**SUB-1 · Checklist pra-rekam** · P0 · agent · 20 menit · ⬜ · dep: WEB-9, DOC-6
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
| `GroundedFacts` | `0xC045087Fd85Da4f2d981222b18E7e74c8040BC47` (tx `0x6e42e11d…0dda`, blok 5.470.068, 3.020.137 gas) | DEP-2 |
| `AgentHireEscrow` | `0x82C604Ebf1090f3dceFa6F96b6DF624DF7eF16cB` (tx `0x64a8f850…eace`, blok 5.470.069, 920.666 gas) | DEP-2 |
| `CoverageBounty` | `0x6AbF1F5F8850A347A5D5Bc6AcbA8961595C09A0b` (tx `0x2035fa49…abb8`, blok 5.470.070, 862.895 gas) | DEP-2 |
| Jumlah tes | 41/41 (`forge test`) | CON-14 |
| Jumlah tx sumber teradmit | 23 (22 mainnet chainKey 3, 1 Sepolia chainKey 1); `recomputeFromChain` = 23 | DEP-4 |
| `facts(3, 22771)` / premi | raw 3, grounded 3, independent 3, gaps 0, clones 0, attestors 4 → premi **100 bps**, disewa scout (tx `0x3c70c911…c8fe`) | DEP-5 |
| `facts(3, 50283)` / quote / `Gated` | raw 1, grounded 0, gaps 1, clones 5, registrantSib 5 → quote **2.000 bps**, `hire` revert `Gated(1)` (`0x393108e5…01`) | DEP-5 |
| Bounty diklaim / hire scout | bounty #0 0,05 tCTC (fund `0x8a4dc077…dc3f`) diklaim scout via `proveAndClaim` `0xfd342f65…cc79`; hire 21548 `0xe6ba85dd…077d` (100 bps) | DEP-7 |
| Gas `verify` precompile | 62.292 (7 root) … 631.434 (984 root); tx tertua blok 14.306.215 (2 Mar 2022) = 506.986 gas; gas ≈ 55k + ~580·roots, jumlah root tidak monoton terhadap umur | DEP-4 |
| URL video | ⬜ | SUB-3 |

Referensi v2 (**tidak boleh dipakai di materi publik v3**): lihat `docs/legacy/ATTESTCOIN_INTEGRATION.md`.

## 9. Log

| Waktu (WIB) | Task | Perubahan | Oleh |
|---|---|---|---|
| 11 Sep 23:55 | DOC-1…5/7/8, SUB-5, SCT-8 | README, integration summary, dosier v3, deck, submission, panduan v3; klaim "active for years" untuk 22771 dikoreksi (97 hari sampai 4 tahun); scan angka v2: bersih | Claude |
| 11 Sep 23:40 | PKG, SCT, DEP-4…8, SRV-1/3, MCP-1 | core + scout + server + MCP; urutan live: bounty diklaim, 2 hire (100 bps), 50283 Gated, siklus kedua 0 gas; verify identik (plan lokal dan data chain saja); CC3 mainnet verify = true; mainnet AttestorStash: 7 attestor, bond minimal 0 | Claude |
| 11 Sep 22:55 | CON-14, DEP-1…3 | Review: 3 temuan diperbaiki (bounty free-ride, truncated, grounded butuh indeks lengkap), 41/41 tes; deploy + verifikasi 3 kontrak; `attestedTip(3)` on-chain = 25.955.150 (ChainInfo terbaca dari kontrak) | Claude |
| 11 Sep 22:43 | CON-1…CON-12 | Kontrak v3 ditulis ulang dari nol, 38/38 tes; precompile dicek live; CON-14 self-review | Claude |
| 11 Sep 22:50 | GH-2, VCL-1 | Dien: `gh-pages` dihapus saat force-push; Vercel ditunda | Claude |
| 11 Sep 22:40 | SET-1…6 | node_modules sisa Sui/Luber dihapus; workspace pnpm (core, scout, server, mcp-server; `apps/web` sengaja kosong); `.gitignore` (`.env` terabaikan, dicek `git check-ignore`); `.env.example`; git init + remote `k3cs/TinjauAI` (belum push); `AGENTS.md` + `claude.md`; toolchain: forge 1.7.1, Node 24.10.0, pnpm 10.18.3, TypeScript 5.9 | Claude |
| 11 Sep 22:25 | DEC-A…E | DEC-A/B/C/E disetujui; DEC-D direvisi: hosting serverless di Vercel (§5.12), scout lokal; frontend ditahan sampai aba-aba Dien | Claude |
| 11 Sep 22:10 | - | Repo v2 diarsipkan ke Trash; `.env` (kunci deployer) disalin ke `Tinjau/.env`; dokumen v2 ke `docs/legacy/`; tracker dibuat | Claude |
