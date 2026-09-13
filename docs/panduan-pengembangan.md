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
| Nama | **Tinjau** (cek latar belakang terverifikasi untuk agent AI; "biro kredit" hanya sebagai analogi Creditcoin) |
| Satu kalimat | Fakta tentang agent ERC-8004 dan pengulasnya, dibuktikan dari Ethereum ke Creditcoin lewat Attestcoin; dilaporkan sebagai bukti teradmit + celah yang diketahui, bukan skor, bukan sejarah lengkap |
| Hackathon | BUIDL CTC 2026 Fall, track AI; deadline **14 Sep 2026 10:59 WIB**; pengumuman 20 Sep |
| Folder | `CTC Hackathon/Tinjau/` (monorepo pnpm); repo v2 diarsipkan di `~/.Trash/grounded-reputation-v2-2026-09-11` |
| Remote | `https://github.com/k3cs/TinjauAI` (akan ditimpa lewat force-push, GH-2, izin Dien) |
| Kontrak v3 | CC3 Testnet, deploy **12 Sep 21:54 WIB** (menggantikan 11 Sep; DEC-F), terverifikasi (§4.1) |
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

Tinjau adalah **cek latar belakang terverifikasi untuk agent AI sebelum uang dilepas** (keputusan Dien 13 Sep; kategori: forensic due diligence untuk ERC-8004). "Biro kredit" tetap boleh dipakai sebagai analogi warisan Creditcoin (mencatat, bukan meminjamkan atau menilai), bukan sebagai headline. Premi `AgentHireEscrow` = **biaya kredit** agent, dibayar ke pemilik agent. Kalimat pertama materi publik menyebut "AI agent" (dan "reviewer" bila muat), bukan "reputation" saja.

Tiga kalimat yang harus konsisten di semua materi:

1. **Sumber fakta = Ethereum, bukan penyumbang.** Siapa pun boleh mengirim proof (scout Tinjau sendiri jalan tiap 3 jam lewat cron); precompile yang memutuskan benar-tidaknya. Scout curang hanya bisa **menahan** bukti, dan itu tampak sebagai `gapCount`. Sumbangan memengaruhi kelengkapan, bukan kebenaran.
2. **Keluaran = bukti teradmit + celah yang diketahui**, dipisah dari keputusan (bayar, tahan, premi). Bukan skor, bukan "sejarah lengkap".
3. **Evidence Exchange sebagian sudah live, sebagian belum.** Live: `fund` (evidence request + policy + expiry), `decisionOf` (vektor 4 predikat), `proveAndClaim` (bayar hanya bila predikat berubah, dua arah; tx 6 lalu hire tx 7), dan resolusi konflik urutan sumber (diuji, belum didemokan on-chain). Belum: `proveBatchAndClaim`, adjudication receipt (keputusan sebelum/sesudah + predikat yang berubah), re-pricing hire di tx yang sama. Sebut persis begitu (koreksi 13 Sep sore: label "roadmap, belum ada kode" sebelumnya terlalu keras).

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
| "AI credit bureau" sebagai headline | "verified background checks for AI agents" (biro kredit = analogi di badan teks) |
| `minAttestors` = "weakest bonded attestor set behind each fact" / "signers behind a proof" | "attestors registered for the source chain at admission (lowest across the agent's facts)" |
| `coveredThrough` = "all blocks checked" / "complete to tip" | "newest proven relevant height; distance to tip = age of newest fact" |
| "complete history", "full history", "riwayat lengkap" | "admitted evidence" + "known gaps" |
| Evidence Exchange "fully built" atau "roadmap only" | "decision-delta payout and source-order resolution are live; `proveBatchAndClaim`, adjudication receipt and same-tx re-pricing are not built" |
| "unik di antara seluruh 135/137 BUIDL" | "0 dari 87 BUIDL snapshot 11 Sep" (daftar live belum bisa diaudit ulang) |

---

## 4. Angka resmi v3 (sumber: tracker §8, `ATTESTCOIN_INTEGRATION.md`)

### 4.1 Alamat (CC3 Testnet, chainId 102031)

| Kontrak | Alamat | Deploy |
|---|---|---|
| GroundedFacts | `0x67394eC13E911ab0D3A26132BECa404F26e17a98` | blok 5.475.585, 3.192.770 gas (12 Sep 21:54 WIB) |
| AgentHireEscrow | `0xF801a8a01E018f3Bf9a648F4C095a53979282EEA` | blok 5.475.586, 920.666 gas |
| CoverageBounty | `0xa27f14CD50BF334E7Fb09601cEf203745aADF569` | blok 5.475.587, 862.895 gas |
| Deployer (wallet Dien) | `0x3D3645529277091Fc12ee3eA9c8E2cA6F3390E49` | ±9.999,9 tCTC |

### 4.2 Lingkungan

| Hal | Nilai |
|---|---|
| chainKey di CC3 **testnet** | Sepolia = 1, Ethereum mainnet = 3. **Kontrak 12 Sep hanya menerima 3**; chainKey 1 revert `UnknownChain` (registri Sepolia gratis dicetak, `scripts/deploy.sh`) |
| chainKey di CC3 **mainnet** | Ethereum mainnet = 1 |
| Prover testnet / mainnet | `proof-gen-api.cc3-testnet.creditcoin.network/api/v1` / `proofbuilder.cc3-mainnet-usc.creditcoin.network/api/v1` |
| RPC CC3 testnet / mainnet | `rpc.cc3-testnet.creditcoin.network` / `mainnet3.creditcoin.network` (chainId 102030) |
| Precompile | BlockProver `0x…0FD2`, ChainInfo `0x…0fd3` (selector snake_case), AttestorStash `0x…0fd4` (camelCase, tidak ada di docs) |
| Discovery Ethereum | Blockscout **REST v2** (`/api/v2/...`); `/api` v1 kena rate limit 429 pada 11 Sep |
| Toolchain | forge 1.7.1, Node 24.10, pnpm 10.18.3, TypeScript 5.9, Gemini REST (tanpa SDK), MCP SDK 1.30 |

### 4.3 Hasil live 13 Sep 2026 (kontrak 12 Sep; log `services/scout/plans/live-20260913-1805.log`)

- 33 tx sumber teradmit per 13 Sep 2026 18:20 WIB (semua Ethereum mainnet sejak blok 14.306.215 / 2 Mar 2022; 1 tx Sepolia dari kontrak lama sengaja tidak dimigrasi). **Angka ini naik terus**: scout (SCT-8) jalan tiap 3 jam lewat launchd `com.tinjau.scout` sampai deadline, jadi tulis sebagai "minimal N per <tanggal>", jangan sebagai angka tetap. Cek ulang sebelum rekam video dan submit: `pnpm -s scout verify 22771 50283 21548 50286`.
- 22771: grounded 3, gaps 0, clones 0, attestors 4 → premi 100 bps, disewa scout.
- 21548: sama; bounty #0 (0,05 tCTC, fund `0xea3b3712…b27f`) diklaim scout lewat `proveAndClaim` `0x8a32b470…d68d`, lalu disewa 100 bps (`0x02933cb3…48d0`). 22771 disewa `0x3a8d2c53…b8c4`; release job 1 `0x27fbf060…b95b`.
- 50283: raw 1, grounded 0, gaps 1, clones 9 → quote 2.000 bps, `hire` revert `Gated(1)`. (Klon 9 setelah semua bukti siklus 12 Sep dimigrasi; premi tetap di batas maksimum.) 50286: sama, clones 9, gated.
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
| `apps/web` | Frontend marketplace (React 19 + Vite + `motion`, **CSS biasa, tanpa Tailwind**). Panduan sendiri: `apps/web/PRODUCT.md` + `apps/web/DESIGN.md` | `pnpm dev` (port 5173) |
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

- Server: `GET /health`, `/facts/:ck/:id`, `/quote/:ck/:id`, `/agents/:ck/:id/reviewers`, `/scout/log`, `/claims/:ck/:id`,
  `/card/:agentId` (dokumen registrasi ERC-8004 agent, diambil apa adanya; hanya cadangan untuk host yang menolak permintaan browser, tidak pernah ditafsirkan di server).
- Pembaca klaim: **Gemini** lewat REST Google AI Studio (`generativelanguage.googleapis.com/v1beta`, tanpa SDK), structured output `responseSchema`, `temperature 0`. Butuh `GEMINI_API_KEY`.
- **Ladder model** (`DEFAULT_MODELS` di `apps/server/src/claims.ts`, bisa ditimpa lewat `TINJAU_CLAIMS_MODELS`): `gemini-3.8-flash` → `3.7-flash` → `3.6-flash` → `3.5-flash` → `3.5-flash-lite` → `3.1-flash-lite`. Error 429 (kuota habis), 503, 500, dan 404 → turun ke model berikutnya; jawaban yang tidak bisa di-parse tidak diulang ke model lain (teksnya sama). Model yang menjawab dicatat per ulasan (`review.model`, `report.modelsUsed`).
- [Fakta] Keluarga `gemini-2.5-*` mengembalikan 404 "no longer available to new users" (dicek 12 Sep 2026), jadi sengaja tidak ada di ladder.
- Verdict: `proven`, `not-on-claimed-chain`, `unsupported-chain`, `hash-not-in-document`, `malformed-hash`, `not-yet-attested`, `prover-error`.
- **Sudah diuji live** (12 Sep 2026): 7/7 tes lulus (`GEMINI_API_KEY=… LIVE=1 npx vitest run` di `apps/server`), termasuk uji fallback model. Laporan agent 50283: 6 klaim pembayaran, 6-6nya tidak ada di chain yang diklaim.

## 8b. Frontend: aturan yang tidak boleh dilanggar (direvisi 14 Sep, WEB-21)

Sumber lengkap: `apps/web/PRODUCT.md` (untuk siapa) dan `apps/web/DESIGN.md` (dunia visual, ditulis dari hasil build). Dunia visual mengikuti `Veritas-UHI9/DESIGN.md` (pin Dien 13 Sep 19:00) dengan aksen Tinjau sendiri. Ringkas:

| Aturan | Alasan |
|---|---|
| **Tanpa jargon di lapisan pertama.** Tidak ada `breadthGrounded`, `gapCount`, `cloneDensityLB`, `bps`, `chainKey`, `precompile`, atau hash telanjang di layar utama; istilah teknis hanya di balik disclosure ("How do we know?", "What runs inside the contract", baris compare yang dibuka) | Pembaca utama adalah orang yang belum tahu apa-apa (keputusan Dien 12 Sep) |
| **Semua kalimat tentang agent dibangkitkan di `src/lib/plain.ts`** dari jawaban kontrak; `src/lib/verdict.ts` satu-satunya jalur dari `Quote` ke verdict, dipakai `/agents`, `/compare`, dan kartu hero | Halaman tidak boleh bisa berbeda pendapat dengan chain, dan dua halaman tidak boleh berbeda satu sama lain |
| **Tidak pernah menampilkan skor atau "Recommended".** Vonis = jawaban kontrak: "Passes your settings" / "Passes, with weak spots" / "Held" | Invariant produk: Tinjau menyimpan fakta, konsumen yang menilai |
| **Status = warna + ikon + label, tidak pernah warna saja** (`VerdictPill`: ShieldCheck / TriangleAlert / Lock). Hijau/amber/merah hanya untuk status; aksen teal hanya untuk interaksi dan identitas; nilai di baris compare tetap tinta polos | Aturan Veritas; aman buta warna; warna per-baris terbaca sebagai skor |
| **Uang ditulis sebagai uang**: setiap fee % disertai contoh "on a 0.1 tCTC job, 0.001 tCTC goes to the owner now" (`feeExampleShort`) | Persen tidak berarti sebelum jadi uang (PRODUCT.md) |
| **Angka basi tidak pernah tampil seolah live.** Kalau RPC gagal, halaman mengatakannya di tempat angkanya | Kejujuran adalah produknya |
| **Terang default + toggle gelap** (keputusan Dien 13 Sep 21:00, "jangan hitam saja"); token di `src/styles/tokens.css` (netral bernuansa teal tipis, `--primary` teal, `--state-clear/weak/held`); teks sekunder `--muted`, teks terkecil `--faint` (13px ≥ 4,5:1 di kedua tema). Gelap adalah tema kedua yang dikomposisi, bukan pembalikan | Diukur `scripts/screenshot.mjs` (kontras oklch→sRGB nyata) |
| **Tanpa eyebrow/kicker di atas heading; tanpa grid kartu ikon+judul+teks sebagai kerangka halaman; baris pada grid bergaris untuk daftar agent** | Craft floor impeccable + register Veritas |
| **Satu momen motion yang dikarang, sisanya disebabkan pembaca** (daftar di `apps/web/DESIGN.md` §Motion). `prefers-reduced-motion` = state akhir langsung. Tidak ada elemen berdenyut: pill dengan titik pulse dilarang (keputusan Dien 13 Sep 21:00, "terlihat AI generik") | Kontrak arah + permintaan Dien |
| **Tanpa kunci privat di frontend.** Sewa dan bounty ditandatangani wallet pengunjung, selalu `staticCall` dulu | Keamanan; penolakan kontrak muncul sebagai kalimat |
| **Rute hash** `#/`, `#/marketplace` (`#/agents` tetap jalan), `#/bounties` (tab bounty di marketplace), `#/how`, `#/faq`, `#/developers`, `#/compare?ids=a,b,c` (2–4 kolom, `?a=&b=` tetap jalan) — `src/lib/router.ts`, tanpa dependensi router | Build statis di host mana pun |
| **Compare tidak masuk navbar.** Ia dimulai dari marketplace: tekan Compare di 2–4 kartu, lalu tray di bawah jendela menahan pilihannya | Tautan navbar mendarat di tabel kosong dan tidak mengajarkan apa pun (keputusan Dien 14 Sep) |
| **Menunggu punya bentuk.** Selama chain dibaca, halaman menggambar skeleton dengan geometri aslinya (`Skeleton` di `ui.tsx`), bukan layar kosong dan bukan spinner sendirian. Skeleton bersinar, tidak berdenyut | Pembacaan chain makan detik; halaman kosong terbaca sebagai rusak, dan tata letak tidak boleh melompat saat data datang |
| **"Tidak ada" hanya boleh diucapkan setelah chain menjawab.** Daftar kosong + chain tak menjawab dilaporkan sebagai tak terjangkau, tidak pernah sebagai kosong | Klaim tentang isi bureau adalah klaim faktual |
| **State kosong dan gagal digambar**, dengan langkah berikutnya di dalam kalimatnya (`illustrations/StateMarks.tsx`) | Keputusan Dien 14 Sep 00:10 (penjelasan berbasis ilustrasi) |
| **Rute yang tidak menampilkan angka chain tidak boleh membaca chain** (`useBureau(care, key, enabled)`) | Halaman teks tidak boleh membayar tiga pemindaian log |
| **Kata agent sendiri boleh lewat proxy, fakta tidak pernah.** `GET /card/:agentId` hanya mengambil dokumen registrasi apa adanya; penguraiannya tetap di browser, bacaan langsung tetap yang menang, dan sebab kegagalan disebut apa adanya (halaman web / host mati / tanpa `tokenURI`) | Fakta datang dari kontrak; kartu agent adalah klaim pemiliknya dan sudah dilabeli begitu |
| **Snapshot scout di-import dari `src/data/facts.json`**, bukan dari `public/` | Error Vite dan file ganda di build |

Verifikasi wajib sebelum menyatakan frontend selesai:

```bash
cd apps/web && pnpm dev                                   # port 5173
cd apps/server && pnpm dev                                # port 8787, untuk /card/:agentId
node scripts/screenshot.mjs http://localhost:5173/        # 6 rute × 1440/375, terang + gelap
node scripts/wallet-browser-test.mjs                      # hanya bila menyentuh jalur wallet
```

`screenshot.mjs` harus keluar `contrast []`, `targets []`, `overflow false` di setiap rute dan viewport.
`wallet-browser-test.mjs` menjalankan connect, hire, fund dan seluruh jalur claim di browser sungguhan dengan
provider EIP-1193 yang disuntikkan; transaksinya nyata di CC3 testnet dan dibayar wallet proyek (±0,02 tCTC per
jalannya). Harus lulus 4/4.

## 9. Hosting

Semua serverless di Vercel (DEC-D): web statis, server dan MCP sebagai Functions. Scout tidak di-host (memegang kunci, menunggu atestasi); dijadwalkan launchd di mesin Dien (`~/Library/LaunchAgents/com.tinjau.scout.plist`, `StartInterval` 10800). Status: **ditunda Dien**; CLI `vercel` belum terpasang.

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
| 13 Sep | **DEC-F (b)**: kontrak resmi = deploy 12 Sep (`0x6739…`, `0xF801…`, `0xa27f…`); 33 tx dimigrasi dari kontrak 11 Sep; kontrak 11 Sep pensiun. **DEC-G**: scout dijadwalkan launchd `com.tinjau.scout` tiap 3 jam (crontab menggantung di macOS) |
| 13 Sep | Tetap Tinjau v3 (ideation final: 6 kandidat pivot dibunuh). Headline pindah ke "verified background checks for AI agents"; biro kredit jadi analogi. Koreksi semantik `minAttestors`/`coveredThrough`/completeness wajib di semua materi. Evidence Exchange = roadmap. Daftar dokumen yang harus disinkron: `../docs/list-document.md` |

## 12. Batas dan risiko

Sama dengan `docs/evaluation-dossier.md` §8. Tambahan operasional: Blockscout v1 rate-limit (pakai v2 + cache), drpc gratis tidak stabil untuk query arsip (tidak dipakai), `cast` mencetak error `mixHash` saat membaca header CC3 (abaikan; tx tetap masuk).

## 13. Hierarki sumber kebenaran

On-chain → kode → dokumen ini → tracker → `ATTESTCOIN_INTEGRATION.md` → dosier → README/deck/submission → `docs/legacy/` (v2, hanya referensi desain). Daftar file yang wajib ikut berubah saat pemahaman produk berubah: `../docs/list-document.md`.

## 14. Changelog

| Tanggal | Perubahan | Oleh |
|---|---|---|
| 2026-09-14 | v3.6: §8b diperbarui untuk WEB-21 (skeleton, kapan boleh bilang "tidak ada", state bergambar, rute prosa tanpa baca chain, batas proxy kartu agent) dan dirapikan dari drift WEB-15/16/19 (tema terang default, daftar rute, aturan motion); §8 menambah `GET /card/:agentId`; blok verifikasi menambah `wallet-browser-test.mjs` | Claude |
| 2026-09-13 | v3.5: §8b ditulis ulang untuk WEB-14 (dunia visual Veritas + aksen Tinjau, status = warna+ikon+label, uang sebagai uang, rute hash, audit kontras nyata) | Claude |
| 2026-09-13 | v3.4: DEC-F (b) kontrak 12 Sep + migrasi 33 tx, DEC-G launchd, angka §4 diperbarui, Sepolia dikeluarkan by design | Claude |
| 2026-09-13 | v3.3: framing "cek latar belakang", tiga kalimat konsisten (§3.1), 6 baris klaim terlarang baru (§3.2), keputusan 13 Sep (§11), rujukan `list-document.md` (§13) | Claude |
| 2026-09-12 | v3.2: bagian 8b (aturan frontend) ditambahkan setelah `apps/web` dibangun; `apps/web` masuk peta monorepo | Dien |
| 2026-09-11 | v3.0 dibuat untuk monorepo `Tinjau/` setelah build ulang, deploy, dan urutan live | Claude |
