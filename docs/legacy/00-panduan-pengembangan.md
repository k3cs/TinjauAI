# Tinjau: Panduan Pengembangan (living document)

Versi 1.0 · dibuat 11 Sep 2026 · pemilik keputusan: Dien · penjaga dokumen: agent yang terakhir mengubah proyek

Dokumen ini adalah **sumber kebenaran pertama** untuk siapa pun (manusia atau AI agent) yang mengerjakan Tinjau. Baca bagian 0–3 sebelum menyentuh kode atau dokumen apa pun. Kalau dokumen lain bertentangan dengan dokumen ini, dokumen ini yang benar, kecuali ada keputusan Dien yang lebih baru (lihat §12).

---

## 0. Cara memakai dokumen ini

### 0.1 Urutan baca untuk agent baru

1. §1 (ringkasan satu layar) dan §2 (aturan yang tidak boleh dilanggar).
2. §3 (framing dan klaim terlarang), karena kesalahan paling mahal di proyek ini adalah klaim yang salah di dokumen publik.
3. §10 (status dan backlog) untuk tahu apa yang boleh dikerjakan sekarang.
4. Bagian lain sesuai tugas.

### 0.2 Kewajiban memperbarui

Setiap sesi yang mengubah proyek **wajib** memperbarui dokumen ini sebelum selesai:

- Ubah status di §10 (backlog) dan tambahkan baris di §17 (changelog).
- Kalau ada angka baru (gas, jumlah proof, alamat), masukkan ke §4 beserta sumbernya.
- Kalau ada keputusan Dien, catat di §12 dengan tanggal dan kutipan singkat.
- Kalau ada ide yang dibuang, catat di §11 beserta alasannya, supaya agent berikutnya tidak mengusulkannya ulang.
- Jangan menghapus riwayat. Coret dengan menulis "(dicabut DD Mon: alasan)".

### 0.3 Label status klaim

Setiap klaim substantif di dokumen proyek diberi label:

- **[Fakta]** ada sumber yang bisa dibuka: hash tx, `path/file:baris`, URL, output perintah.
- **[Inferensi]** penalaran atau rekomendasi, dengan dasarnya.

Fakta dan inferensi tidak digabung dalam satu kalimat. Aturan penulisan lain untuk dokumen berbahasa Indonesia: kurung `()` untuk sisipan, bukan em dash.

---

## 1. Ringkasan satu layar

| Hal | Isi |
|---|---|
| Nama | **Tinjau** (nama internal lama: Grounded Agent Reputation) |
| Satu kalimat | Biro kredit untuk agent AI: fakta tentang agent ERC-8004 dan pengulasnya, dibuktikan dari Ethereum ke kontrak di Creditcoin. Tanpa skor, tanpa oracle. |
| Hackathon | BUIDL CTC 2026 Fall (Creditcoin & Credit Labs), DoraHacks, track **AI** (sekunder DeFi) |
| Deadline | **13 Sep 2026 23:59 ET = 14 Sep 2026 10:59 WIB** (diperpanjang dari 7 Sep). Pengumuman pemenang 20 Sep 2026 |
| Hadiah | Grand $10.000, 2nd $3.000, 3rd $2.000; top 3 masuk jalur cepat CEIP (program investasi Creditcoin) |
| Repo | https://github.com/k3cs/TinjauAI (akun gh `dienmsk`), branch `main`; UI di branch `gh-pages` |
| UI live | https://k3cs.github.io/TinjauAI/ |
| Kontrak | v2 di Creditcoin CC3 Testnet (chainId 102031), terverifikasi Blockscout (§4.1) |
| Status 11 Sep | Kontrak, scout, verifier, UI, deck, README selesai. **Frontend sedang difinalkan** (keputusan Dien). Video direkam setelah frontend final. Submit oleh Dien |
| Tim | Solo: Dien (builder, pemilik keputusan). AI agent membantu build dan dokumen |

---

## 2. Aturan yang tidak boleh dilanggar

Aturan ini berlaku untuk semua agent, di semua sesi. Alasannya ditulis supaya tidak dilanggar dengan "niat baik".

### 2.1 Invariant produk

1. **Fakta, bukan skor.** `GroundedFacts` tidak boleh menghitung skor, bobot, atau vonis. Konsumen memberi ambang (`minAge`, `minDepth`, `k`, `c`), kontrak mengembalikan angka. Alasan: spesifikasi ERC-8004 sengaja menaruh penilaian editorial di luar chain; nilai Tinjau justru karena tidak menilai.
2. **Hanya proof yang masuk.** Setiap data yang mengubah state `GroundedFacts` harus lewat verifikasi precompile BlockProver `0x…0FD2`. Tidak boleh ada fungsi admin, setter, atau jalur "trusted relayer". Alasan: tanpa itu produk kembali menjadi agregator bertanda tangan yang sudah ada (RNWY, 8004scan).
3. **Omisi tidak boleh menguntungkan.** Ketiadaan bukti selalu dibaca konservatif (pengulas dianggap baru, kepemilikan tidak diketahui). Angka hanya naik karena bukti.
4. **Log hanya dari registri resmi.** Log diterima hanya kalau `address_` = alamat registri ERC-8004 resmi untuk chainKey itu (§4.2). Alasan: siapa pun bisa memancarkan event `NewFeedback` palsu dari kontraknya sendiri.
5. **Tidak ada LLM di jalur fakta.** LLM boleh memilih, menafsirkan, menjelaskan, atau mengusulkan kueri. LLM tidak boleh menetapkan fakta. Precompile dan kontrak yang memutuskan. Alasan: satu-satunya jaminan Tinjau adalah "bisa dihitung ulang siapa pun dari bytes".
6. **Bisa dihitung ulang.** Setiap angka di `facts()` harus bisa direproduksi oleh `agent/src/verify.ts` dari proof yang sama. Fitur baru di kontrak wajib diikuti di `verify.ts`.
7. **Tidak ada admin, tidak ada upgrade** di `GroundedFacts`.

### 2.2 Aturan tindakan

| Tindakan | Aturan | Alasan |
|---|---|---|
| Submit DoraHacks | **Hanya Dien.** Agent tidak pernah submit | Aturan tim (DEC-005) |
| Push ke `main` / `gh-pages` (repo publik) | Hanya setelah Dien setuju di sesi itu | Repo publik = juri bisa melihat saat itu juga |
| Redeploy kontrak | **Dilarang sebelum deadline** kecuali Dien memutuskan eksplisit | Semua hash, alamat, video, UI, deck, dan dosier merujuk v2. Redeploy = semua bukti harus dibuat ulang |
| Atribusi AI di git/GitHub | **Tidak pernah.** Tanpa trailer `Co-Authored-By: Claude…` atau `Claude-Session`, tanpa baris "Generated with Claude Code" di PR, dan agent tidak ditambahkan sebagai collaborator. Commit atas nama Dien | Keputusan Dien 11 Sep 2026; riwayat repo sudah pernah dibersihkan (branch `backup/pre-scrub`) |
| Commit `.env` / kunci privat | **Tidak pernah** | `.env` berisi kunci deployer Dien. `.gitignore` sudah memuat `.env`; periksa `git status` sebelum commit |
| Menaruh data pribadi di repo | Tidak pernah (email, negara, kewarganegaraan) | Repo publik. Data tim diisi langsung di form DoraHacks |
| Transaksi on-chain dengan kunci Dien | Hanya bila tugas memang memintanya; catat hash di §4 | Saldo testnet terbatas; setiap tx menjadi bukti publik |
| Mengubah angka di dokumen publik | Hanya dengan sumber on-chain atau output perintah | Lihat §3.3 (kesalahan yang pernah terjadi) |
| Menambah kode yang ditulis sebelum 13 Agu 2026 | Dilarang | Aturan hackathon: "Must be original work created during the hackathon" |

### 2.3 Aturan kode

- Solidity 0.8.28, Foundry, `via_ir`. Jangan ubah versi compiler tanpa alasan tertulis.
- `lib/usc/` adalah vendor dari `@gluwa/usc-contracts` 0.2.0 (`EvmV1Decoder`, `INativeQueryVerifier`). Jangan edit; kalau perlu versi baru, vendor ulang dan catat.
- Pola CEI (ubah state sebelum transfer) di `AgentHireEscrow` dan `CoverageBounty` wajib dipertahankan.
- Setiap perubahan kontrak: `forge test -vv` hijau, tambahkan test untuk jalur baru, dan perbarui `verify.ts` bila menyentuh fakta.
- Precompile tidak bisa diemulasi Foundry. Test lokal memakai mock + fixture `txBytes` mainnet asli (`test/fixtures/`). Kebenaran akhir hanya di testnet.

---

## 3. Framing, bahasa, dan klaim

### 3.1 Framing resmi (sejak 11 Sep 2026)

**Tinjau adalah biro kredit untuk agent AI.**

- [Fakta] Creditcoin lahir sebagai riwayat kredit untuk peminjam yang tidak terlihat bank. Credal (API kredit Gluwa): 5 jt+ transaksi pinjaman, 337 rb pengguna, adopter pertama Aella (Nigeria) (creditcoin.org, dibaca 11 Sep 2026).
- [Fakta] Lebih dari 19.000 agent terdaftar di registri ERC-8004 Ethereum mainnet (`docs/01-produk.md` §2; IdentityRegistry 19.141 tx per 29 Agu).
- Posisi: Tinjau = **biro** (mencatat fakta terbukti). Tinjau **bukan** pemberi pinjaman dan **bukan** penerbit skor. Pihak yang menanggung risiko menetapkan harga.
- `AgentHireEscrow` = langkah penetapan harga. Preminya = **biaya kredit** agent, dibayar ke pemilik agent.

### 3.2 Aturan bahasa di dokumen publik (README, deck, submission, video)

- Kalimat pertama menyebut **"AI agent"** dan, bila muat, **"reviewer"**. Jangan membuka dengan kata "reputation" saja. Alasan: ada sekitar 22 proyek "credit passport" di galeri; juri bisa salah mengelompokkan Tinjau.
- Pakai "facts", "proven", "thresholds". Hindari "score", "rating", "trust score" untuk menggambarkan keluaran Tinjau.
- Setiap angka yang diucapkan atau ditulis harus fakta on-chain atau pengukuran yang sumbernya tercatat di §4.
- Batas proyek (§13) selalu disebut, bukan disembunyikan.

### 3.3 Klaim terlarang (pernah salah atau tidak terbukti)

| Jangan tulis | Kenapa | Tulis ini |
|---|---|---|
| "Tidak ada peserta yang memakai Ethereum mainnet" | [Fakta] Salah. Minimal 7 dari 87 BUIDL memakai mainnet (nomen, Singleton, index41, crosscredit, CarryProof, WEN, Collateral Eligibility Ledger) | "0 dari 87 BUIDL menyentuh ERC-8004 atau reputasi agent" |
| "Reviewer 50283 owns 43 agents" | [Fakta] 43 berasal dari pemindaian off-chain scout. On-chain terbukti `reviewerOwnsAgents(0x1030…)` = **6** | "a reviewer that owns 6 agents (proven on-chain)" |
| "Premium 2% / 20%" untuk demo | [Fakta] Angka lama. On-chain: 22771 = 100 bps; 50283 = quote 1.683 bps dan `hire` revert `Gated(1)` | Angka di §4.3 |
| "Tinjau removes trust" | Attestcoin memindahkan kepercayaan dari RPC/indexer ke attestor Creditcoin yang ber-bond; tidak menghapusnya | "moves trust to Creditcoin's bonded attestor set" |
| "Works on Base" / "multi-chain" | [Fakta] Attestcoin hari ini hanya membaca Ethereum (mainnet dan Sepolia). Jalur Base via Ethereum baru diverifikasi di Python dan spike gas (§10.3), belum di produk | "Ethereum-side registries only" |
| "Real users / demand on Creditcoin" | [Fakta] Belum ada konsumen kontrak di Creditcoin (DEC-002). Registri ERC-8004 tidak ada di CC3 mainnet (`eth_getCode` = `0x`) | "the escrow is an example consumer" |
| "Writability" sebagai fitur | [Fakta] Writability Attestcoin masih audit pihak ketiga, belum bisa dipakai | Hanya di slide roadmap |
| "AI scores agents" | Scout memutuskan dengan aturan tetap, tanpa LLM | "autonomous scout with four logged decisions" |

---

## 4. Fakta kunci (angka resmi)

Semua angka publik diambil dari tabel ini. Kalau berubah, ubah di sini dulu.

### 4.1 Alamat

| Chain | Kontrak | Alamat |
|---|---|---|
| Creditcoin CC3 Testnet (102031) | `GroundedFacts` v2 | `0x47212CE74EA4D6e300922AeB389A7b0a9D81Aabc` |
| Creditcoin CC3 Testnet | `AgentHireEscrow` v2 | `0x153201A94E83AB5aA1C64f095375F2916EDA9F98` |
| Creditcoin CC3 Testnet | `CoverageBounty` v2 | `0xBaAEAb3f635D39F6a9019745270Daf1812E0aE70` |
| Creditcoin CC3 Testnet | Deployer (wallet Dien) | `0x3D3645529277091Fc12ee3eA9c8E2cA6F3390E49` |
| Creditcoin CC3 Testnet | v1 (kode sebelum code review, jangan dipakai) | `0x7DDE4Ad3…`, `0x20497F17…`, `0x1f29E842…` |
| Precompile | BlockProver | `0x0000000000000000000000000000000000000FD2` |
| Precompile | ChainInfo | `0x0000000000000000000000000000000000000fd3` |
| Precompile | AttestorStash (tidak dipakai Tinjau) | `0x0000000000000000000000000000000000000fd4` |

### 4.2 Lingkungan dan registri

| Hal | Nilai |
|---|---|
| RPC CC3 Testnet | `https://rpc.cc3-testnet.creditcoin.network` (alias foundry `cc3`) |
| Explorer | `https://creditcoin-testnet.blockscout.com` |
| Prover API | `https://proof-gen-api.cc3-testnet.creditcoin.network/api/v1` (`attested-height/{chainKey}`, `proof-by-tx/{chainKey}/{tx}`, `proof-batch-by-tx/{chainKey}`) |
| chainKey di **testnet** CC3 | Sepolia = **1**, Ethereum mainnet = **3** |
| chainKey di **mainnet** CC3 | Ethereum mainnet = **1** (jangan tertukar) |
| ERC-8004 mainnet | Identity `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`, Reputation `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` |
| ERC-8004 Sepolia | Identity `0x8004A818BFB912233c491871b3d84c89A494BD9e`, Reputation `0x8004B663056A597Dffe9eCcC1965A193B7388713` |
| Faucet tCTC | Discord Creditcoin, kanal `token-faucet`: `/faucet address:<EVM address>` |
| Toolchain | Foundry 1.7.1 (solc 0.8.28, via_ir), Node 24, ethers v6, tsx |

### 4.3 Hasil on-chain (v2, 29–30 Agu 2026)

Sumber lengkap: `ATTESTCOIN_INTEGRATION.md` (tabel 15 tx).

- [Fakta] 15 tx testnet; 18 proof (17 mainnet termasuk tx Jan 2024 dan tx pendaftaran massal 52 KB, 1 Sepolia) dalam 7 tx `record`.
- [Fakta] Ambang demo: `minAge` 500.000 blok, `minDepth` 2, `k` 3, `c` 5.
- [Fakta] `facts(3, 22771)` = (3, 3, 3, 0, 0, 0, 0, 0, 0, 24.365.879, truncated=false) → risiko 0, premi **100 bps**, `hire` berhasil (tx `0x7f902dbb…0276`).
- [Fakta] `facts(3, 50283)` = (1, 1, 0, 1, 0, 5, 5, 0, 0, 25.792.031, false); `reviewerOwnsAgents(0x1030…)` = **6** → risiko 8.334 bps, quote **1.683 bps**, `hire` revert **`Gated(1)`**.
- [Fakta] `facts(3, 21548)` = (3, 3, 3, 0, …) → disewa scout sendiri (R4) setelah menagih bounty #0 (0,05 tCTC, tx `0xf4b3ae8f…e07c`).
- [Fakta] `verify.ts` pada plan 22771 = breadthRaw 3, breadthGrounded 3, gapCount 0, identik dengan `facts()`.
- [Fakta] Gas: `verify` precompile 117.971 (100 root, Agu 2026), 157.059 (183 root, Apr 2026), 414.624 (604 root, Jan 2024). Per proof total ≈0,30–0,56 jt. Tx pendaftaran massal 2.821.552 gas.
- [Fakta] Tes: 17/17 lulus (`forge test -vv`).

### 4.4 Data masalah (Ethereum mainnet, diukur 29 Agu 2026)

- 600 ulasan terakhir: 346 dari 367 agent punya tepat 1 pengulas; satu EOA menulis 225 ulasan untuk 195 agent.
- 16 dari 105 pengulas memiliki agent dan menulis 59% ulasan.
- 60 hari: 14.771 registrasi, 83% dari pemilik ≥10 agent; 8.136 agent didaftarkan dalam tx multi-`Registered`; 121 ulasan baru (≈2/hari).
- Base ≈139× lebih ramai dari Ethereum untuk registri reputasi.
- Klaim `proof_of_payment` yang benar chain-nya: 0 dari 12 sampel.
- arXiv 2606.26028: 73,5% pengulas Ethereum menunjukkan perilaku sybil terkoordinasi.

Sumber: `docs/evaluation-dossier.md` §3.1 (dengan perintah verifikasi di §9).

### 4.5 Posisi kompetitif (galeri DoraHacks, dibaca 11 Sep 2026)

- [Fakta] 87 BUIDL. 0 menyentuh ERC-8004 atau reputasi agent. Sekitar 22 adalah credit passport. 17 di track AI.
- [Inferensi] Dengan rubrik penilaian ide (kedalaman Attestcoin berbobot ganda), Tinjau 25/30, posisi 5. Top 4: Collateral Eligibility Ledger (28), Singleton (27), index41 (27), PRECEDENCE (26). Titik lemah Tinjau: manfaat nyata bagi Creditcoin (K4 = 3) dan K1 yang hanya memakai `0x0FD2` di kontrak. Rinciannya di workspace `docs/outputs/02-ideation/2026-09-11-penilaian-ide-87-buidl.md` (di luar repo).

---

## 5. Arsitektur dan peta repo

### 5.1 Alur

```
Ethereum mainnet / Sepolia                 Prover API (CC3)          Creditcoin CC3 Testnet
ERC-8004 Identity + Reputation --logs-->  GroundedScout (TS) --proof--> GroundedFacts.record()
  NewFeedback, FeedbackRevoked                                           verify 0x0FD2 -> EvmV1Decoder -> fakta
  Registered, Transfer                                                        |
  tx apa pun (aktivitas pengulas)                                             +--> AgentHireEscrow (premi / Gated)
                                                                              +--> CoverageBounty (bayar bukti yang mengubah keputusan)
verify.ts (siapa pun): hitung ulang fakta dari proof yang sama, off-chain
web/ (UI): baca facts()/quote() via RPC (mode live) atau public/demo/facts.json (mode demo)
```

### 5.2 Peta file

| Path (relatif ke root repo) | Isi | Catatan |
|---|---|---|
| `src/GroundedFacts.sol` | registri fakta; `record(Proof[])`, `facts()`, `reviewerSeniority`, `reviewerOwnsAgents`, `clientsOf` | tanpa admin; cap 256 pengulas per kueri (`truncated`) |
| `src/AgentHireEscrow.sol` | `quote`, `hire`, `release`, `refund` | gate hanya bila `gapCount > 0` |
| `src/CoverageBounty.sol` | `fund`, `proveAndClaim`, `withdraw` | `NoChange` bila bukti tidak mengubah keputusan |
| `test/` | 17 test + `Fixtures.sol` + `test/fixtures/` (txBytes mainnet asli) | precompile di-mock |
| `lib/usc/` | vendor `@gluwa/usc-contracts` 0.2.0 | jangan diedit |
| `agent/src/scout.ts` | GroundedScout: R1–R4 | dry-run tanpa `PRIVATE_KEY`; live dengan `--facts` dll. |
| `agent/src/verify.ts` | hitung ulang fakta dari plan/proof | wajib ikut berubah bila fakta berubah |
| `agent/src/record-one.ts` | kirim satu proof: `record-one.ts <chainKey> <txHash>` | |
| `agent/src/export-demo.ts` | tulis `web/public/demo/facts.json` | |
| `agent/plans/` | plan JSON dan log live | **gitignored**, hanya ada di mesin lokal |
| `web/` | Vite + React 19 + TS + Tailwind 3; `src/App.tsx` satu halaman | env: `VITE_CC3_RPC`, `VITE_FACTS`, `VITE_ESCROW` |
| `script/`, `scripts/live-sequence.sh` | deploy → verify → record → bounty → scout → hire | memakai `forge create --broadcast` |
| `README.md` | halaman depan untuk juri | framing biro kredit |
| `ATTESTCOIN_INTEGRATION.md` | Attestcoin Integration Summary (ditempel ke form DoraHacks) + tabel 15 tx | sumber angka on-chain |
| `docs/00-panduan-pengembangan.md` | dokumen ini | |
| `docs/01-produk.md`, `02-teknis.md`, `03-task-tracker.md` | produk, spesifikasi teknis, tracker | tracker = status tugas rinci |
| `docs/evaluation-dossier.md` | dosier untuk juri (v1.5) dengan perintah verifikasi | |
| `docs/deck.md` → `docs/deck.pdf` | deck Marp | build ulang setiap `deck.md` berubah (§9.6) |
| `docs/demo-script.md` | naskah video ≤3 menit | direkam setelah frontend final |
| `docs/submission.md` | teks form DoraHacks | tanpa data pribadi |

### 5.3 Dokumen workspace (di luar repo, folder `CTC Hackathon/docs/`)

Folder ini berisi riset dan proses, bukan bagian dari submission. Letaknya pindah dari `hackathons/ctc/` ke `docs/` pada 11 Sep; rujukan lama ke `hackathons/ctc/...` di dokumen lama berarti path yang sama di bawah `docs/`.

| Path workspace | Isi |
|---|---|
| `docs/HACKATHON.md`, `DECISIONS.md`, `TEAM.md`, `REFERENCES.md`, `SERVICES.md`, `LEARNINGS.md`, `PIPELINE.md` | profil hackathon dan log keputusan (pipeline web3-hackathon) |
| `docs/outputs/01-research/brief.md` | brief hackathon (catatan: klaim "Sepolia satu-satunya source chain" di sana salah) |
| `docs/outputs/02-ideation/2026-09-11-*.md` | riset 11 Sep: pesaing, penilaian 87 BUIDL, konsumen nyata, jalur Base via Ethereum |
| `docs/outputs/03-product/`, `04-planning/`, `06-quality/`, `07-submission/` | value proposition, scope-cut, ADR, rencana implementasi, code review, verifikasi, paket demo |
| `docs/idea-loop/` atau `idea-loop/` | proses desain ide (idea sheet v1–v4, 58 sanggahan) |

---

## 6. Perilaku kontrak (ringkas)

Spesifikasi lengkap: `docs/02-teknis.md` §3. Yang wajib dipahami sebelum mengubah kontrak:

- `record(Proof[])`: per proof, `UnknownChain` bila chainKey tidak dikenal; `ProofRejected` bila `verify` false; dedup dengan kunci `(chainKey, height, txIndex)` dari `calculateTxIndex` (duplikat di-skip, bukan revert); `from` tx menjadi bukti aktivitas; log diproses hanya bila status receipt = 1 dan emitter = registri resmi.
- Event yang diproses: `NewFeedback`, `FeedbackRevoked` (Reputation), `Registered`, `Transfer` (Identity; mint diabaikan).
- Senioritas: `oldestHeight[addr]` = minimum; `bucketCount[addr]` = jumlah bucket 216.000 blok berbeda.
- Kelengkapan: `feedbackIndex` per pasangan (agent, pengulas) monoton di registri, jadi celah di bawah indeks tertinggi yang dibuktikan = `gapCount`. Celah di atasnya tidak terlihat.
- `facts(chainKey, agentId, minAge, minDepth)` → 10 angka + `truncated`: `breadthRaw`, `breadthGrounded`, `breadthIndependent`, `gapCount`, `negatives`, `cloneDensityLB`, `registrantSiblings`, `uriSiblings`, `sameTxSiblings`, `firstRegisteredHeight`.
- Premi: `risk = 10000 − coverage·cloneFactor/10000`, `coverage = min(10000, breadthGrounded·10000/k)`, `cloneFactor = c·10000/(c + cloneDensityLB)`, `premiBps = base + (max − base)·risk`.
- Bounty: `decision = keccak(bg ≥ k, gap == 0, cloneLB ≥ c, negatives > 0)`; dibayar hanya bila tuple berubah.

---

## 7. GroundedScout (agent)

| Peran | Keputusan |
|---|---|
| R1 Targeting | bounty terbuka dulu, lalu agent paling aktif 7 hari terakhir |
| R2 Dua arah | bukti yang menguntungkan (pengulas senior) dan merugikan (indeks lebih tinggi, negatif, pencabutan, pengulas-pemilik, klon); 40% gas dicadangkan untuk "helps" |
| R3 Timing | lewati bukti yang sudah masuk (`txSeen`); buktikan sekarang hanya bila bounty ≥ biaya |
| R4 Konsumen | sewa lewat eskrow bila fakta lolos ambangnya sendiri; kalau tidak, danai bounty |

- Estimasi gas: precompile ≈ 110k + 600·roots; roots ≈ 90 + umur/13.000 blok; decode ulasan 260k, pendaftaran 440k, aktivitas 130k.
- Batch ≤4 proof per tx `record`.
- Keterbatasan data: `txlist` Blockscout hanya 40 tx pertama per pengulas (senioritas bisa diremehkan, konservatif); rate limit Blockscout/prover.

---

## 8. Frontend

- [Fakta] `web/` sudah live di GitHub Pages (mode live ke kontrak v2): kuitansi fakta 22771 vs 50283, meter premi, tabel pengulas, log scout, blok verifikasi. Kontras AA sudah diaudit.
- [Fakta] Keputusan Dien 11 Sep: frontend **belum dianggap selesai**; video direkam setelah frontend final.
- **Scope penyelesaian frontend belum tertulis.** Agent yang ditugasi frontend wajib menanyakan ke Dien daftar perubahan yang dimaksud, lalu mencatatnya di §10.1 sebelum mengerjakan.
- Aturan frontend:
  - Semua angka di UI berasal dari `facts()`/`quote()` (live) atau `public/demo/facts.json` (hasil `export-demo.ts`). Tidak ada angka ketikan tangan.
  - Framing biro kredit (§3.1) dan klaim terlarang (§3.3) berlaku juga di teks UI.
  - Pertahankan kontras ≥4,5:1 dan dukungan reduced-motion.
  - Setelah frontend berubah: build, cek di browser (lebar desktop dan ~400 px), perbarui `docs/screenshot-live.jpg` bila tampilan berubah, lalu publish `gh-pages` (dengan persetujuan Dien).

---

## 9. Cara kerja (perintah)

Semua perintah dari root repo kecuali disebut.

### 9.1 Setup dan test

```bash
forge test -vv                       # 17 test, harus hijau
cd agent && npm i
cd ../web && npm i
```

### 9.2 Scout dan verifier (dry-run, tanpa kunci)

```bash
cd agent
npx tsx src/scout.ts --agents=22771 --minAge=500000 --minDepth=2 --k=3 --c=5
npx tsx src/verify.ts plans/agent-22771-*.json
```

### 9.3 Membaca kontrak

```bash
SIG='facts(uint64,uint256,uint64,uint32)((uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,bool))'
cast call --rpc-url https://rpc.cc3-testnet.creditcoin.network 0x47212CE74EA4D6e300922AeB389A7b0a9D81Aabc "$SIG" 3 22771 500000 2
```

### 9.4 Transaksi live (butuh `.env` dengan `PRIVATE_KEY`, dan persetujuan tugas)

```bash
cd agent
npx tsx src/record-one.ts 3 <txHash>                 # satu proof mainnet
PRIVATE_KEY=… npx tsx src/scout.ts --facts=0x47212CE7… --bounty=0xBaAEAb3f… --escrow=0x153201A9… --maxTargets=2 --hireWei=10000000000000000
```

### 9.5 Deploy (hanya bila Dien memutuskan redeploy)

- Pakai `forge create --broadcast`, **bukan** `forge script`. Simulasi forge menolak header blok Creditcoin (`prevrandao`).
- Urutan lengkap ada di `scripts/live-sequence.sh` (deploy → verify Blockscout → record → bounty → scout → hire/release).
- Setelah redeploy, perbarui semua tempat yang memuat alamat: `README.md`, `ATTESTCOIN_INTEGRATION.md`, `docs/submission.md`, `docs/evaluation-dossier.md`, `docs/deck.md` + `deck.pdf`, `docs/demo-script.md`, `web/.env.local`, `docs/01-produk.md`, §4 dokumen ini, dan `CLAUDE.md` workspace.

### 9.6 Deck

```bash
npx -y @marp-team/marp-cli@latest docs/deck.md --pdf --allow-local-files -o docs/deck.pdf
```

Setelah build, render 1–2 halaman yang berubah ke gambar dan periksa tidak ada teks yang terpotong.

### 9.7 Sebelum commit

- `git status`: pastikan `.env`, `web/.env.local`, dan `agent/plans/` tidak ikut.
- `forge test -vv` hijau bila kontrak atau test berubah.
- Cari angka lama: `grep -rn "43 agents\|premium 2%\|premium 20%" README.md docs/`.
- Pesan commit gaya repo: `docs: …`, `fix: …`, `feat: …`, `chore: …`.

---

## 10. Status dan backlog

### 10.1 Harus selesai sebelum deadline (14 Sep 10:59 WIB)

| # | Tugas | Pemilik | Status | Catatan |
|---|---|---|---|---|
| S1 | Reframe biro kredit di README, deck, submission, dosier, produk | agent | ✅ 11 Sep | belum di-commit/push saat dokumen ini dibuat |
| S2 | Koreksi angka demo (43 → 6, premi 2%/20% → 1%/16,8%/`Gated`) | agent | ✅ 11 Sep | deck, demo-script |
| S3 | Dosier v1.5 (cabut klaim mainnet, data 87 BUIDL, perbaiki tabel) | agent | ✅ 11 Sep | |
| S4 | **Finalisasi frontend** | Dien + agent | 🔄 | scope belum tertulis; tanya Dien dulu (§8) |
| S5 | Commit + push perubahan dokumen | agent, setelah izin Dien | ⏳ | |
| S6 | Rekam video ≤3 menit sesuai `docs/demo-script.md` | Dien | ⏳ setelah S4 | cek ulang semua angka di layar terhadap §4.3 |
| S7 | Isi `<VIDEO_URL>` di `docs/submission.md` dan `docs/deck.md`, build ulang deck | agent | ⏳ setelah S6 | |
| S8 | Isi form DoraHacks (data tim, teks dari `docs/submission.md`, Integration Summary dari `ATTESTCOIN_INTEGRATION.md`) dan submit | **Dien** | ⏳ | target ≥12 jam sebelum deadline |

### 10.2 Opsional sebelum deadline (tanpa redeploy)

Urut dari dampak per jam kerja [Inferensi]. Jangan kerjakan sebelum S4–S8 aman, kecuali Dien meminta.

| # | Tugas | Dampak ke rubrik | Biaya | Status |
|---|---|---|---|---|
| O1 | Bukti siap mainnet: ambil proof event ERC-8004 dari proof builder **CC3 mainnet** (Ethereum = chainKey 1 di sana) dan `verify` via `eth_call` ke `0x0FD2` mainnet; tulis hasilnya di dosier | K1, K4: sumber data tidak berubah saat pindah mainnet | 1–2 jam, tanpa deploy | ⬜ belum dicoba |
| O2 | `IAgentFacts`: satu file interface + contoh 10 baris cara kontrak lain membaca `facts()` | K4: menjawab "siapa yang pakai" | kecil, tanpa redeploy | ⬜ |
| O3 | Scout jalan tanpa diawasi sampai deadline; laporkan N proof, N agent, N pengulas, gas | K1, K4: angka nyata | cron + log; ≈0,0024 tCTC per 8 proof | ⬜ |
| O4 | LLM pembaca klaim di scout: baca `feedbackURI`, ekstrak `proof_of_payment {network, txHash}`, coba buktikan via Attestcoin; gagal = "klaim tidak terbukti" di log/laporan (bukan fakta on-chain) | K3 (track AI) | sedang; risiko terbaca tempelan; wajib tunjukkan satu kasus LLM salah → precompile menolak | ⬜ |
| O5 | Baca AttestorStash `0x0FD4` di `verify.ts`/UI (jumlah attestor ber-bond saat fakta masuk) | K1 (sebagian; kontrak tetap hanya `0x0FD2`) | kecil | ⬜ |

### 10.3 Pasca-hackathon (jangan dibangun sebelum 14 Sep)

| # | Arah | Status bukti | Keputusan |
|---|---|---|---|
| P1 | **Membaca Base lewat komitmen Base di Ethereum** (Attestcoin membuktikan tx `DisputeGameFactory.create` di Ethereum → rootClaim → header Base → EIP-2935 → receipt) | [Fakta] berjalan end-to-end di Python pada data nyata mainnet dan Sepolia; spike Foundry ≈1,23 jt gas per fakta (`docs/outputs/02-ideation/2026-09-11-base-via-ethereum-verifikasi.md`) | terbuka; dua syarat: finalitas anchor (±5 hari untuk TEE-only) dan izin panitia |
| P2 | MCP server `tinjau_facts(agentId)` + x402 per panggilan + `SKILL.md` untuk agent | pola pemenang (Sentinel8004, Mandate, Cortex) | kandidat utama distribusi |
| P3 | Writability: tulis `facts()` ke inbox di chain agent | [Fakta] Writability belum rilis | roadmap deck saja |
| P4 | "Credal untuk agent" (uang muka job, dilunasi dari eskrow) | butuh stablecoin dan konsumen | ditunda |
| P5 | Registri ERC-8004 di Creditcoin | [Fakta] tidak ada di CC3 mainnet | roadmap; nilainya bergantung P2 |
| P6 | Fakta baru `sharedFunder` (klaster sybil dari pendana pertama) | butuh ubah kontrak | kandidat v3 |

---

## 11. Ide yang ditolak atau ditarik (jangan diusulkan ulang tanpa sudut baru)

| Ide | Status | Alasan |
|---|---|---|
| Skor reputasi on-chain / bobot di kontrak | ditolak (desain inti) | melanggar invariant 2.1.1; itu yang dikerjakan RNWY/8004scan |
| Marketplace ERC-8183 di Creditcoin dengan gerbang Tinjau (bentuk asli) | ditarik 11 Sep | [Fakta] agent di Creditcoin mendekati nol; eskrow SpaceRouter di CC3 mainnet hanya 15 deposit dari 7 wallet, 0,17 SPACE dibayarkan seumur hidup; 98,6% pembayaran agent memakai USDC, sementara stablecoin di Creditcoin dipegang puluhan wallet |
| Menempatkan ChainInfo/AttestorStash di dalam kontrak sebelum deadline | ditolak untuk sekarang | butuh redeploy + reproof semua bukti; risiko tinggi |
| Kalimat "multi-chain / Base" di materi publik | dilarang | Attestcoin hanya Ethereum; P1 belum di produk |
| Dua scout paralel sejati | dipotong | satu kunci; varian berurutan sudah membuktikan R3 |
| Cadangan asuransi / kanal oracle (dari Veritas) | ditolak | moral hazard dan operator terpusat |

---

## 12. Keputusan

Log lengkap: workspace `docs/DECISIONS.md`.

| ID | Keputusan | Status |
|---|---|---|
| DEC-001 | Ide final Tinjau (fakta ERC-8004 mainnet via Attestcoin; eskrow + bounty; scout) untuk track AI | disetujui Dien 29 Agu |
| DEC-002 | Terima risiko "belum ada konsumen kontrak di Creditcoin" | disetujui 29 Agu |
| DEC-003 | Arsitektur 3 kontrak + scout TS + verifier; deploy CC3 Testnet | disetujui 29 Agu |
| DEC-004 | Frontend satu halaman masuk scope | disetujui 29 Agu |
| DEC-005 | Paket submission (Checkpoint 3); video, data tim, submit oleh Dien | diusulkan, belum disetujui |
| (11 Sep) | Framing "biro kredit untuk agent AI" diterapkan ke README dan deck | diminta Dien 11 Sep |
| (11 Sep) | Video direkam setelah frontend final | keputusan Dien 11 Sep |

---

## 13. Batas dan risiko yang diakui

- Hanya registri sisi Ethereum (chainKey 1 dan 3). Base ≈139× lebih ramai dan belum terjangkau.
- Ulasan terbaru yang belum pernah diajukan tidak terlihat; hanya celah di bawah indeks tertinggi yang terbukti. Bounty membayar bukti indeks lebih tinggi.
- `cloneDensityLB` adalah batas bawah; wallet tua bisa dibeli (≈$100–300 gas mainnet untuk 50 wallet × 12 bulan, [Inferensi]); operator sah dengan banyak agent terlihat seperti klon.
- Smart-account pengulas (ERC-4337) tidak punya tx `from` sendiri, dianggap tanpa aktivitas.
- `facts()` berhenti di 256 pengulas (`truncated`).
- Tidak ada reentrancy guard eksplisit; bergantung pada CEI (ditandai untuk review).
- Belum ada konsumen di Creditcoin; eskrow adalah contoh.
- Attestcoin memindahkan kepercayaan ke attestor Creditcoin; tidak menghapusnya.

---

## 14. Checklist sebelum submit (untuk Dien, disiapkan agent)

- [ ] Frontend final dan ter-publish; screenshot README diperbarui bila perlu.
- [ ] Semua perubahan di-commit dan di-push; repo publik menampilkan README baru.
- [ ] Video ≤3 menit, YouTube unlisted, dibuka di jendela incognito.
- [ ] `<VIDEO_URL>` terisi di `docs/submission.md` dan `docs/deck.md`; `deck.pdf` dibuild ulang dan di-push.
- [ ] Form: nama, sektor, deskripsi (≤300 kata), Integration Summary, repo, deck PDF URL, video URL, data tim.
- [ ] Tidak ada klaim dari §3.3 di materi mana pun: `grep -rn "43 agents\|no participant\|multi-chain" README.md docs/`.
- [ ] Submit sebelum 13 Sep 22:59 WIB (target 12 jam cadangan).

---

## 15. Glosarium

| Istilah | Arti |
|---|---|
| Attestcoin (dulu USC) | protokol Creditcoin untuk membaca data chain lain secara terverifikasi; di kode masih bernama `usc-*` |
| BlockProver `0x0FD2` | precompile yang memverifikasi transaksi ada di blok chain sumber (inklusi + kontinuitas). Membuktikan inklusi, **bukan** keberhasilan; status receipt dicek terpisah |
| ChainInfo `0x0FD3` | precompile tinggi blok teratestasi |
| AttestorStash `0x0FD4` | precompile jumlah dan bond attestor |
| chainKey | nomor sumber di Attestcoin (bukan chainId EVM) |
| proof | txBytes + Merkle proof + continuity proof dari prover API |
| ERC-8004 | standar registri identitas, reputasi, dan validasi agent AI |
| pengulas (client/reviewer) | wallet yang menulis `NewFeedback` untuk agent |
| `breadthGrounded` | jumlah pengulas unik yang cukup senior (lolos `minAge` dan `minDepth`) |
| `gapCount` | jumlah pasangan (agent, pengulas) dengan indeks ulasan bolong |
| `cloneDensityLB` | batas bawah jumlah agent lain milik pemilik yang sama |
| Gated | `hire` ditolak karena ada ulasan yang terbukti hilang |
| scout | GroundedScout, agent otonom yang memilih dan mengirim bukti |
| CEIP | Creditcoin Ecosystem Investment Program; top 3 hackathon masuk jalur cepat |

---

## 16. Hierarki sumber kebenaran

1. Keadaan on-chain (Blockscout CC3, `cast call`).
2. Kode di repo (`src/`, `agent/src/`, `web/src/`).
3. Dokumen ini.
4. `ATTESTCOIN_INTEGRATION.md` (angka on-chain) dan `docs/03-task-tracker.md` (status tugas rinci).
5. `docs/evaluation-dossier.md`, `docs/01-produk.md`, `docs/02-teknis.md`.
6. README, deck, submission, demo-script (turunan; jangan jadi sumber angka).
7. Riset workspace (`CTC Hackathon/docs/outputs/`).

Kalau dua sumber bertentangan, yang lebih atas menang, dan yang lebih bawah harus diperbaiki di sesi yang sama.

---

## 17. Changelog

| Tanggal | Perubahan | Oleh |
|---|---|---|
| 2026-09-11 | Dokumen dibuat. Isi: framing biro kredit, klaim terlarang, angka resmi v2, backlog S1–S8 / O1–O5 / P1–P6, ide yang ditarik (ERC-8183 di Creditcoin), catatan pindah folder workspace `hackathons/ctc/` → `docs/` | Claude (sesi reframe + penilaian 87 BUIDL) |
