# Tinjau (Grounded Agent Reputation) — dokumen penilaian untuk BUIDL CTC 2026 Fall

Versi dokumen: 1.3 (nama produk: Tinjau) · Tanggal: 2026-08-29 · Status proyek: **kontrak + agent dibangun dan diuji lokal (14/14 test), belum dideploy ke CC3 Testnet (menunggu faucet)**. Repo: `hackathons/ctc/build/grounded-reputation/` (Foundry + TypeScript). Semua angka berasal dari pengukuran langsung terhadap Ethereum mainnet, Sepolia, dan Creditcoin CC3 Testnet pada 29 Agu 2026.

Dokumen ini ditulis agar penilai (manusia atau AI agent) dapat memeriksa setiap klaim secara independen. Setiap klaim substantif diberi label **[Fakta]** (ada sumber/perintah yang bisa dijalankan ulang) atau **[Inferensi]** (penalaran penulis). Bagian 9 berisi perintah verifikasi.

---

## 1. Kriteria penilaian yang dipakai dokumen ini

[Fakta] Halaman hackathon (dorahacks.io/hackathon/buidl-ctc-2026-fall/detail, dibaca 25 Agu 2026) hanya menulis satu kriteria eksplisit:

> "Depth of Attestcoin Protocol utilization will be evaluated as one of the core scoring criteria."

[Fakta] Syarat submission: deploy di Creditcoin CC3 Testnet; Attestcoin Protocol sebagai fitur inti; "Working Attestcoin Protocol integration code" + dokumentasi teknis; repo GitHub dengan README; deck/whitepaper; demo video; "Must be original work created during the hackathon".

[Fakta] Deskripsi track AI: "process cryptographically verified cross-chain data to autonomously … trigger on-chain transactions without centralized oracle operators".

[Inferensi] Karena bobot kriteria lain tidak diumumkan, dokumen ini menilai diri sendiri pada lima dimensi: (K1) kedalaman pemakaian Attestcoin, (K2) kesesuaian track AI, (K3) masalah nyata dan bukti, (K4) kebaruan terhadap prior art dan peserta lain, (K5) kejujuran batas dan risiko. Penilai boleh mengganti bobotnya.

---

## 2. Ringkasan satu paragraf

Registri reputasi agent AI ERC-8004 di Ethereum mainnet sudah hidup tetapi tidak bisa dipercaya mentah: mayoritas agent hanya diulas satu wallet, satu wallet menulis 37% ulasan, dan spesifikasinya sendiri menyerahkan penyaringan ke layanan off-chain yang harus dipercaya. **Grounded Agent Reputation** adalah kontrak di Creditcoin yang menyimpan **fakta** tentang ulasan-ulasan itu dan tentang agent yang diulas (ulasan ini nyata; pengulasnya sudah aktif sejak kapan dan seberapa rutin; ada ulasan yang bolong atau tidak; pengulasnya sendiri pemilik agent atau bukan; agent ini asli atau klon dari pemilik/URI/tx yang sama), di mana setiap fakta masuk hanya dengan **proof Attestcoin** bahwa transaksi/event terkait benar terjadi di Ethereum (termasuk yang berumur bertahun-tahun). Kontrak tidak memberi skor; konsumen memberi ambang dan kontrak menjawab angka yang bisa dihitung ulang siapa pun. Uang bergerak lewat eskrow dengan premi dinamis (pola fee Veritas, tanpa cadangan asuransi) dan bounty yang hanya dibayar untuk bukti yang mengubah keputusan. Sebuah agent otonom memilih bukti mana yang paling berharga per gas dan mengirimkannya.

---

## 3. Masalah

### 3.1 Apa yang terjadi di lapangan [Fakta]

| Pengamatan | Angka | Sumber |
|---|---|---|
| Registri ERC-8004 di Ethereum mainnet aktif | IdentityRegistry `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`: 19.141 tx; ReputationRegistry `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`: 2.959 tx; `NewFeedback` masuk tiap hari | eth.blockscout.com, 29 Agu 2026 |
| Konsentrasi pengulas | 600 feedback terakhir: 367 agent, hanya **106 pengulas unik**; **346 dari 367 agent punya tepat 1 pengulas**; satu EOA `0x668aDd92…` menulis **225 feedback untuk 195 agent** | decode 600 event `NewFeedback` (blok 24.593.923–25.849.052) |
| Senioritas pengulas (nonce RPC, 105 dari 106) | nonce ≤5: 44 pengulas; ≤50: 32; ≤500: 21; >500: 8. 43 wallet punya nonce ≤ jumlah feedback + 3 (hampir hanya menulis feedback) | `cast nonce` via ethereum-rpc.publicnode.com |
| Studi akademik independen | "A substantial fraction of reviewers (73.5%, 59.2%, and 90.6% across Ethereum, BSC, and Base) exhibit coordinated Sybil behavior"; bukti pembayaran "at most 0.6% (BASE) of observations"; setelah filter sybil, 15,8% agent Ethereum tak punya feedback valid | arXiv 2606.26028 (Xiong et al., 24 Jun 2026) |
| Klaim pembayaran tidak diperiksa siapa pun | Feedback dari execution.market memuat `proof_of_payment {network, payment_tx}`; sampel 12: **12/12 mengklaim `network: ethereum`, 0/12 tx-nya ada di Ethereum** (9 ditemukan di Celo/Polygon/Arbitrum, 3 tidak ditemukan di 5 chain) | feedbackURI diambil langsung; Blockscout 5 chain; proof API CC3 (`TxHashNotFound`) |
| Spesifikasi menyerahkan penyaringan ke pihak ketiga | "results without filtering by clientAddresses are subject to Sybil/spam attacks"; "more complex reputation aggregation will happen off-chain"; agregator memberi "signed on-chain snapshots" | eips.ethereum.org/EIPS/eip-8004 |
| Provenance agent (v4) | 128 registrasi terakhir dari 37 pemilik; **76/128 (59%) agent milik pemilik dengan ≥10 agent**; 44 agent berbagi `agentURI`; **16/105 pengulas memiliki agent dan menulis 316/538 feedback (59%)**; satu pengulas memiliki 1.300 agent | decode `Registered`; `cast call balanceOf` IdentityRegistry |
| **Aktivitas 60 hari terakhir (RPC, metode independen)** | ulasan: **121 (2/hari)**, 23 agent, 32 pengulas, 78% agent satu pengulas, satu klien (`0x1030…`) 57%; registrasi: **14.771 (246/hari)**, **83% dari pemilik ≥10 agent**, pemilik terbesar 10.829 agent, **8.136 agent didaftarkan dalam tx multi-`Registered`**; pembanding Base: registri reputasi 411.843 tx (≈139× Ethereum) | `eth_getLogs` RPC publik, blok 25.429.616–25.861.616; base.blockscout.com (docs/hackathon/validation/grounded-agent-reputation.md) |
| Validation Registry | Belum dideploy di mainnet ("still under active update and discussion with the TEE community") | github.com/erc-8004/erc-8004-contracts; arXiv 2606.26028 |

### 3.2 Siapa yang dirugikan [Inferensi]

- Pihak yang memilih agent dari registri (agent lain, marketplace, eskrow) dan tidak punya cara memverifikasi penyaringan yang dipakai layanan skor.
- Pihak yang ingin mengaudit sebuah skor reputasi tanpa mempercayai penerbit skornya.

### 3.3 Kenapa solusi yang ada tidak cukup

| Solusi yang ada | Apa yang diberikan | Batas [Fakta kecuali disebut] |
|---|---|---|
| RNWY (rnwy.com/sybil, /api, /mcp) | skor kepercayaan wallet 0–95 dari umur wallet, aktivitas commerce, deteksi cluster; 150k+ agent, 12 chain; API gratis + MCP | API terpusat; skor tidak dapat diverifikasi kontrak; [Inferensi] pengguna harus mempercayai penerbit |
| Sentinel8004 (Synthesis Hackathon, juara 1) | scanner deteksi keseragaman wallet, verdict ditulis balik ke registri Celo | satu maintainer, heuristik off-chain, tanpa proof (data dari `Research Spreadsheet - Web3 Hackathon Winners`) |
| AgentScore (Chainlink Convergence, juara 3) | reputasi diikat ke pembayaran x402 via CRE | satu chain; bergantung jaringan oracle CRE; tidak dideploy |
| Spec ERC-8004 sendiri | field opsional `proofOfPayment {chainId, txHash}` | tidak pernah diverifikasi on-chain (lihat 3.1 baris 5) |

---

## 4. Solusi

### 4.1 Prinsip desain

1. **Fakta, bukan skor.** Kontrak tidak memutuskan siapa yang dipercaya (itu keputusan editorial, yang oleh spec sengaja ditaruh off-chain). Kontrak menyimpan fakta yang dibuktikan dan konsumen memberi ambangnya sendiri.
2. **Omisi tidak boleh menguntungkan.** Setiap angka hanya bisa naik dengan bukti; ketiadaan bukti selalu dibaca konservatif (pengulas dianggap baru, kepemilikan dianggap tidak diketahui).
3. **Hanya proof yang masuk.** Setiap `record*` memanggil precompile BlockProver Attestcoin; log yang dipakai harus berasal dari alamat registri resmi.

### 4.2 Kontrak `GroundedFacts` (Creditcoin CC3 Testnet)

| Fungsi | Input (dibuktikan) | Fakta yang dihasilkan |
|---|---|---|
| `recordFeedback(proof)` | event `NewFeedback(agentId, clientAddress, feedbackIndex, value, valueDecimals, …)` dari ReputationRegistry Ethereum (chainKey 3) atau Sepolia (chainKey 1); juga `FeedbackRevoked`, `ResponseAppended` | feedback per pasangan (agent, pengulas, indeks); nilai negatif ikut; pencabutan membatalkan |
| `recordActivity(proof)` | tx apa pun di Ethereum dengan `from == pengulas` | `oldestHeight[pengulas]` (minimum) dan bitmap aktivitas per ±30 hari |
| `record(proof)` (satu pintu untuk semua) | `Registered(agentId, agentURI, owner)`, `Transfer` dari IdentityRegistry; `NewFeedback`/`FeedbackRevoked` dari ReputationRegistry; `from` tx apa pun | identitas agent; `transfersProven`; **provenance (v4)**: `cloneDensityLB` (pemilik sama; batas bawah), `registrantSiblings` (pengirim tx `Registered` sama; kokoh terhadap pola pabrik/akun ERC-6551), `uriSiblings` + `firstRegisteredHeight(uri)`, `sameTxSiblings`, `reviewerOwnsAgents(client)` |

Cakupan per pasangan: [Fakta] di kontrak registri, `feedbackIndex = ++_lastIndex[agentId][msg.sender]` (baris 115 `ReputationRegistryUpgradeable.sol`), jadi indeks per pasangan mulai 1 dan monoton. Celah **di bawah** indeks tertinggi yang dibuktikan terdeteksi dan dilaporkan (`gapCount`). Celah **di atasnya** (feedback terbaru yang tidak diajukan) **tidak bisa** dideteksi karena `_lastIndex` adalah state Ethereum; ini batas yang diakui, dimitigasi dengan insentif (4.4).

### 4.3 Yang dihitung on-chain (deterministik, tanpa konstanta editorial)

Konsumen memanggil `facts(agentId, minAge, minDepth)` dan menerima:

- `breadthRaw`: jumlah pengulas unik yang dibuktikan;
- `breadthGrounded`: pengulas unik yang `firstFeedbackHeight − oldestHeight ≥ minAge` dan jumlah bucket aktivitas ≥ `minDepth`;
- `gapCount`: pasangan dengan indeks bolong;
- `negatives`: feedback bernilai negatif yang dibuktikan dan tidak dicabut;
- `breadthIndependent`: pengulas unik yang tidak memiliki agent mana pun (`reviewerOwnsAgents == 0`);
- `cloneDensityLB`, `uriSiblings`, `sameTxSiblings`, `firstRegisteredHeight`: fakta provenance agent (semua batas bawah/atas yang dilabeli; omisi tidak pernah menguntungkan agent karena bounty membayar bukti yang merugikan sama besar).

Semua input adalah data publik Ethereum, sehingga siapa pun dapat menghitung ulang angka yang sama dari proof yang dipublikasikan (skrip verifier disertakan dalam rencana build).

### 4.4 Yang menggerakkan uang

- **`AgentHireEscrow`** (konsumen contoh): gate hanya bila `gapCount > 0`; selain itu **premi dinamis** `premiBps = base + (max − base)·risk`, `risk = 1 − min(1, breadthGrounded/k)·1/(1 + cloneDensityLB/c)`, dibayar penyewa **ke agent** (insentif agent mencari pengulas senior nyata dan menjaga provenance). Dipinjam dari pola fee dinamis Veritas (UHI9); **cadangan asuransi dan kanal oracle Veritas sengaja tidak dipakai** (moral hazard; operator terpusat).
- **`CoverageBounty`**: konsumen mendanai bounty per agent beserta ambangnya. Dibayar hanya bila bukti baru membuat `breadthGrounded` melewati ambang (naik atau turun), mengubah `gapCount` dari/ke 0, membuktikan indeks lebih tinggi untuk pasangan yang sudah ada, atau menaikkan `cloneDensityLB`/`reviewerOwnsAgents`/`sameTxSiblings` melewati ambang. Bukti yang merugikan agent dibayar sama dengan yang menguntungkan, sehingga rival agent punya insentif mengungkap ulasan negatif yang disembunyikan. Bukti inkremental yang tidak mengubah keputusan tidak dibayar.

### 4.5 Agent otonom `GroundedScout` (track AI)

Input: log dua registri di Ethereum (mainnet dan Sepolia), daftar bounty aktif, anggaran gas. Tiap siklus ia memutuskan: agent mana yang dicakup penuh; untuk tiap pengulas, tx mana yang paling tua dan tersebar waktu (bukti senioritas termurah per bucket); batch mana yang muat dalam batas Attestcoin (≤10 proof / 1.000 blok); apakah memuat riwayat lama (proof 415k gas) atau hanya delta. Keputusannya bisa salah (membuang gas untuk bukti yang tidak mengubah angka). Tidak ada LLM di jalur fakta; kontrak menghitung ulang dari bytes.

---

## 5. Kedalaman pemakaian Attestcoin (K1)

Setiap baris di bawah sudah **diuji pada 29 Agu 2026** kecuali ditandai.

| # | Pemakaian | Bukti [Fakta] |
|---|---|---|
| 1 | Verifikasi event registri reputasi **Ethereum mainnet** (chainKey 3) di precompile `0x…0FD2` | tx `0xa0614d34…e4305` (blok 25.823.901, `NewFeedback`): proof 13,9 KB, 100 continuity roots, `verify` = `true`, `eth_estimateGas` = **117.971** |
| 2 | Proof untuk tx berumur bertahun-tahun (dasar senioritas pengulas) | tx mainnet blok 22.280.818 (Apr 2026): 183 roots, `verify` true, 157.059 gas; tx blok 19.094.397 (Jan 2024, ≈2,5 tahun): 604 roots, `verify` true, **414.624 gas** (diuji pada event kontrak lain, mekanisme identik) |
| 3 | Dua chain sumber dalam satu kontrak | `attested-height/1` = 11.590.480 (Sepolia), `attested-height/3` = 25.859.540 (mainnet); `ChainInfo.is_height_attested(3, 25857306)` = `true` |
| 4 | Decoder resmi untuk menyaring alamat pemancar log | `EvmV1Decoder.LogEntry { address address_; bytes32[] topics; bytes data; }` (usc-contracts 0.2.0) → cek `address_ == 0x8004B…` |
| 5 | Counter protokol sumber sebagai alat kelengkapan | `feedbackIndex` per pasangan (kontrak registri baris 115) dipakai untuk mendeteksi bolongan tanpa lapisan tambahan |
| 6 | Batch proof | docs: `MAX_BATCH_SIZE` 10, `MAX_BATCH_RANGE` 1.000 blok; terukur di loop lain: 5 proof rentang 900 blok = 998.872 gas |
| 7 | `verify` (view) tanpa `queryId` global → dedup per kunci fakta | docs: `verify()` "only view, no events"; diuji dua `STATICCALL` identik keduanya `true` |
| 8 | Provenance agent dari registri identitas (v4) | `Registered`/`Transfer` dari `0x8004A169…`; `sameTxSiblings` memakai semua log satu tx dari decoder (belum diuji, §8.4) |
| 9 | Cadangan penuh di Sepolia (chainKey 1) | registri Sepolia `0x8004A818BFB912233c491871b3d84c89A494BD9e` (11.307 tx), `0x8004B663056A597Dffe9eCcC1965A193B7388713` (11.240 tx) |

[Inferensi] Yang membedakan dari pola "bayar di Sepolia → buka di Creditcoin" yang dipakai mayoritas peserta: (a) sumber mainnet, (b) riwayat berumur tahunan sebagai input fakta, (c) kelengkapan parsial dari counter protokol sumber, (d) dua registri × tiga jenis event.

[Fakta] Pencarian kode GitHub 29 Agu (`"attested-height/3"`, `"chainKey: 3" attestcoin`, `chainKey 3 creditcoin attestcoin`): tidak ada repo peserta yang memakai mainnet; 8 hit semuanya Sepolia. Pencarian ini tidak lengkap (tidak melihat submisi tanpa repo publik).

---

## 6. Kesesuaian track AI (K2)

[Fakta] Teks track: "process cryptographically verified cross-chain data to autonomously … trigger on-chain transactions without centralized oracle operators".

| Unsur | Pemenuhan |
|---|---|
| cryptographically verified cross-chain data | semua input `GroundedFacts` = proof Attestcoin atas event/tx Ethereum |
| autonomously trigger on-chain transactions | `GroundedScout` memilih dan mengirim `record*` dan klaim bounty tanpa manusia |
| without centralized oracle operators | tidak ada oracle, tidak ada agregator bertanda tangan, tidak ada registri DVN off-chain; satu-satunya asumsi kepercayaan = attestor set Creditcoin (lihat 8.2) |

[Fakta, dry-run 29 Agu] Agent `GroundedScout` memegang empat peran yang masing-masing adalah keputusan dengan alternatif yang ditolak dan tercatat di log:

| Peran | Keputusan | Bukti log |
|---|---|---|
| R1 Targeting | memindai registri 7 hari terakhir (66 ulasan/8 agent) dan bounty terbuka; memilih target sendiri | `[R1] targets: 50283 (25 feedbacks…) · 50286 (19…)` |
| R2 Bukti dua arah | mengumpulkan bukti yang menguntungkan (pengulas senior) **dan** merugikan (indeks tertinggi, negatif, pencabutan, pengulas-pemilik, klon); bounty membayar keduanya | 50283: 7 bukti merugikan, termasuk "reviewer 0x1030… owns 43 agent(s)" dan 42 agent saudara |
| R3 Timing | membuang bukti yang sudah dimasukkan scout lain (`txSeen`); membuktikan sekarang hanya bila bounty ≥ biaya | `8 proofs ≈ 4,8 jt gas ≈ 0,0024 tCTC` |
| R4 Konsumen | menyewa lewat eskrow bila fakta lolos ambangnya sendiri, atau mendanai bounty | mode live |

[Inferensi] Ini membedakannya dari keeper/optimizer: agent memilih *target* dan *arah* bukti dengan konsekuensi ekonomi (bounty, premi, sewa), bukan hanya mengoptimasi biaya untuk tugas yang diberikan.

---

## 7. Kebaruan terhadap peserta dan prior art (K4)

[Fakta] Dari 43 repo peserta CTC 2026 Fall yang ditemukan di GitHub (kueri `attestcoin`, `creditcoin hackathon`, `usc-sdk`, push ≥10 Agu 2026): ≥20 mengerjakan kredit/pendapatan/eskrow/kebijakan dari proof pembayaran; **0 repo** menyentuh ERC-8004 atau reputasi agent (kueri `8004 attestcoin` = 0 hasil).

[Fakta] Prior art terdekat: RNWY (sinyal umur wallet dan kontinuitas kepemilikan sudah dipakai; API terpusat), Sentinel8004 (deteksi sybil off-chain, tulis balik ke registri), AgentScore (reputasi + pembayaran via CRE), rekomendasi arXiv 2606.26028 #4 "require verifiable interactions" dan #6 "default Sybil defense".

[Inferensi] Yang tidak ditemukan di mana pun: fakta reputasi ERC-8004 yang **diverifikasi oleh kontrak** dari proof, dengan kelengkapan parsial dari counter protokol, provenance agent (klon/URI/tx) dari event registrasi, dan bounty yang hanya membayar perubahan keputusan. Prinsip provenance → kepadatan duplikat → harga diturunkan dari Veritas (UHI9, milik tim), diterapkan ke agent alih-alih konten. Sinyal-sinyalnya sendiri (umur wallet) tidak baru; cara memperoleh dan memverifikasinya yang baru.

---

## 8. Batas, risiko, dan apa yang TIDAK diklaim (K5)

### 8.1 Batas yang diakui [Fakta kecuali disebut]

- **Tidak ada konsumen kontrak di Creditcoin hari ini.** Creditcoin tidak punya registri ERC-8004 dan tidak ada agent yang menyewa agent di sana; `AgentHireEscrow` dibangun sendiri sebagai konsumen contoh. Pembaca reputasi nyata (agent off-chain) hari ini memakai API. Ini diterima sebagai risiko oleh tim; dokumen ini tidak mengklaim permintaan.
- **Siapa pun dengan node arsip Ethereum bisa menghitung fakta yang sama** tanpa Creditcoin. Yang khas Attestcoin hanya: **kontrak** dapat memverifikasinya dan mengunci uang atasnya tanpa mempercayai indexer.
- **Kelengkapan parsial.** Feedback terbaru yang tidak diajukan tidak terdeteksi; hanya bolongan di bawah indeks tertinggi yang terlihat.
- **Pembayaran tidak dimasukkan.** Pembayaran ERC-8004 nyata terjadi di Base/Celo/Polygon (di luar jangkauan Attestcoin: hanya chainKey 1 dan 3) dan x402 di Ethereum mainnet praktis tidak ada (facilitator Coinbase tidak mendukung mainnet).
- **Hanya registri Ethereum** (mainnet dan Sepolia); registri Base/BSC tidak tercakup, padahal Base ≈139× lebih ramai dan ulasan baru di Ethereum hanya ≈2/hari (60 hari terakhir). Demo memakai riwayat ≈175 hari, bukan aliran harian.
- **Smart-account pengulas** (ERC-4337) tidak punya tx `from` sendiri → dianggap tanpa aktivitas (konservatif).

### 8.2 Asumsi kepercayaan yang tersisa

[Fakta] Attestcoin memindahkan kepercayaan dari RPC/indexer ke himpunan attestor Creditcoin yang ber-bond (GraphQL `attestors`, `bondeds`; interval atestasi 10 blok; jeda ≈6–9 menit). Ia tidak menghapus asumsi kepercayaan, ia menggantinya dengan yang bisa diaudit.

### 8.3 Serangan yang diketahui dan statusnya

| Serangan | Biaya bagi penyerang | Status |
|---|---|---|
| Beli/ternak wallet tua (50 wallet × 1 tx/bulan × 12 bulan) | [Inferensi] ≈$100–300 gas mainnet | diterima sebagai risiko: biaya > 0 (hari ini 0); konsumen bisa menaikkan `minDepth` |
| Menyembunyikan ulasan negatif terbaru | gratis | dimitigasi bounty untuk indeks lebih tinggi (rival punya insentif); tidak dihilangkan |
| Griefing dengan ulasan negatif dari wallet tua | gas + wallet tua | dilaporkan apa adanya; sama dengan registri asal |
| Memecah bukti untuk menagih bounty berulang | — | ditutup: bounty hanya saat ambang konsumen terlewati |
| Replay proof | — | ditutup: kunci (agent, pengulas, indeks) sudah ada → tidak ada perubahan → tidak dibayar |
| Log `NewFeedback` palsu dari kontrak sendiri | — | ditutup: `log.address_` harus registri resmi per chainKey |
| Peternak klon memecah pemilik ke satu EOA per agent | gratis | sebagian ditutup: `sameTxSiblings`, `uriSiblings`; klon dengan EOA, tx, dan URI semua berbeda tidak terlihat (biaya naik: N tx + N URI) |
| Operator sah dengan banyak agent tampak seperti klon | — | fakta, bukan vonis; konsumen menetapkan ambang `c`; `breadthIndependent` tetap dihitung |

### 8.4 Yang sudah diukur setelah build (29 Agu, forge test dengan precompile di-mock dan `txBytes` mainnet asli)

| Item | Hasil [Fakta] |
|---|---|
| Gas kontrak (tanpa precompile) `recordFeedback` | 259.094 |
| Gas kontrak `record` tx `Registered` mainnet dengan 8 log (Registered + 2 Transfer + MetadataSet) | 439.104 |
| Gas kontrak aktivitas (tx Jan 2024 / tx Agu 2026) | 183.724 / 129.475 |
| Precompile `verify` (diukur terpisah di CC3, EV-8/EV-11) | 117.971 (100 root) … 414.624 (604 root) |
| Total per proof (perkiraan) | ≈0,4–0,85 jt gas; 4 proof per tx ≈ 2–3,5 jt (batas blok 75 jt) |
| Decode `int128 value` | lolos (test `test_recordFeedback_mainnet`) |
| Pola pabrik/TBA | agent 50609: `Registered` ke kontrak pabrik lalu `Transfer` ke akun ERC-6551 dalam satu tx; kontrak mengikuti pemilik akhir dan mencatat `registrant` = EOA pengirim (fakta baru, lihat 4.2) |
| Scout dry-run agent 34135 (15 pengulas) | 4 proof dipilih (~2,5 jt gas), 31 kandidat ditolak dengan alasan tertulis, 8 proof ditarik (19–684 root); verifier off-chain menghitung ulang: pengulas `0x11ac…` usia 8.888.865 blok, depth 3 → grounded |

Belum diukur: biaya cakupan penuh 14–27 pengulas di testnet nyata; `sameTxSiblings` pada tx registrasi massal (>100 log); biaya `Registered` massal untuk pemilik 1.300 agent.

---

## 9. Cara memverifikasi klaim (untuk penilai)

Semua perintah dapat dijalankan tanpa kunci API.

```bash
# Registri aktif di mainnet
curl -s https://eth.blockscout.com/api/v2/addresses/0x8004BAa17C55a88189AE136b182e5fdA19dE9b63/counters
curl -s "https://eth.blockscout.com/api/v2/addresses/0x8004BAa17C55a88189AE136b182e5fdA19dE9b63/logs" | head -c 2000

# Attestcoin mengenal mainnet (chainKey 3) dan Sepolia (chainKey 1)
curl -s https://proof-gen-api.cc3-testnet.creditcoin.network/api/v1/attested-height/3
curl -s https://proof-gen-api.cc3-testnet.creditcoin.network/api/v1/attested-height/1

# Proof untuk satu tx NewFeedback mainnet (HTTP 200, ~14 KB)
curl -s https://proof-gen-api.cc3-testnet.creditcoin.network/api/v1/proof-by-tx/3/0xa0614d3461b674e1ab1e6cb28a35552ac3bf9b24367435a0fbbacf7c982e4305 | head -c 600

# ChainInfo precompile di Creditcoin testnet
cast call --rpc-url https://rpc.cc3-testnet.creditcoin.network \
  0x0000000000000000000000000000000000000fd3 "is_height_attested(uint64,uint64)(bool)" 3 25823901

# Semantik feedbackIndex di kontrak registri (baris ~115)
curl -s https://raw.githubusercontent.com/erc-8004/erc-8004-contracts/master/contracts/ReputationRegistryUpgradeable.sol | grep -n "_lastIndex"

# Klaim proof_of_payment yang salah chain (contoh): tx tidak ada di Ethereum, ada di Celo
curl -s https://eth.blockscout.com/api/v2/transactions/0xa4abc35c6150db5537fc035a5e7e5d34a3dc9d4bb12ca960efd8909650841638
curl -s https://celo.blockscout.com/api/v2/transactions/0xa4abc35c6150db5537fc035a5e7e5d34a3dc9d4bb12ca960efd8909650841638 | head -c 300
```

Verifikasi `verify` on-chain: encode `verify(uint64,uint64,bytes,(bytes32,(bytes32,bool)[]),(bytes32,bytes32[]))` dari respons proof API dengan `cast calldata`, lalu `eth_call` dan `eth_estimateGas` ke `0x0000000000000000000000000000000000000FD2` (skrip lengkap ada di `idea-loop/loops/grounded-reputation-ctc/evidence/`).

---

## 10. Rencana build dan demo

Deadline: 6 Sep 2026 23:59 ET (7 Sep 10:59 WIB). Repo baru dibuat setelah 13 Agu sesuai aturan "original work".

| Prioritas | Komponen | Keterangan |
|---|---|---|
| 1 | `GroundedFacts` + verifier off-chain | **selesai** (`src/GroundedFacts.sol`, `agent/src/verify.ts`); 7 unit test |
| 2 | `GroundedScout` (TypeScript, ethers v6, prover API) | **selesai, dry-run terbukti**; mode live menunggu deploy |
| 3 | `AgentHireEscrow` (premi dinamis) | **selesai**, 4 test |
| 4 | `CoverageBounty` | **selesai**, 3 test |
| 5 | Frontend satu halaman (`web/`, DEC-004) | **selesai**: kuitansi fakta 22771 vs 50283, mode demo/live |
| 6 | Deploy CC3 Testnet + demo live + video | menunggu tCTC di deployer `0x3D3645529277091Fc12ee3eA9c8E2cA6F3390E49` (Dien mengisi wallet lain) |

Demo ≤3 menit, semuanya data mainnet nyata: (1) scout memuat feedback + senioritas pengulas agent **34135** (15 pengulas, 14 aktif di luar feedback) dan agent **50283** (32 feedback, 1 pengulas); `breadthGrounded(minAge=180 hari, minDepth=3)` berbeda nyata; (2) scout menunjukkan bukti yang ditolak (tidak mengubah angka) vs dipilih, menutup bolongan indeks, menagih bounty; (3) eskrow memberi premi rendah untuk 34135 dan premi tinggi untuk 50283 (pengulas tunggal `0x1030…` juga pemilik 23 agent), dan menunjukkan `cloneDensityLB` pemilik `0xad51…` (1.300 agent); (4) skrip verifier menghitung ulang angka dari proof. Hash tx Ethereum dan Creditcoin ditampilkan.

---

## 11. Penilaian mandiri (untuk dibandingkan dengan penilaian independen)

| Dimensi | Nilai diri (1–5) | Dasar |
|---|---|---|
| K1 kedalaman Attestcoin | 4 | 8 pemakaian terukur, termasuk mainnet dan proof 2,5 tahun; belum ada kode |
| K2 track AI | 4 | agent dengan keputusan alokasi nyata; tanpa oracle; LLM di luar jalur fakta |
| K3 masalah nyata | 4 | angka mainnet (pengulas dan klon) + studi arXiv; tetapi penderita dari sisi Creditcoin belum ada |
| K4 kebaruan | 3 | 0 peserta di ceruk ini; sinyal umur wallet/klon sudah dipakai RNWY; yang baru = verifikasi oleh kontrak + kelengkapan dari counter + provenance dari event registrasi |
| K5 kejujuran batas | 5 | semua batas ditulis; tidak ada klaim permintaan |

Penilai diminta menurunkan K1 bila kode akhir tidak mencakup butir 5.1–5.5, dan menurunkan K3 bila menilai "konsumen contoh yang dibangun sendiri" sebagai kegagalan masalah.

---

## 12. Sumber

- Halaman hackathon: dorahacks.io/hackathon/buidl-ctc-2026-fall/detail
- Docs Attestcoin/Creditcoin: docs.attestcoin.org, docs.creditcoin.org; proof API `proof-gen-api.cc3-testnet.creditcoin.network`; GraphQL `graphql-usc.cc3-testnet.creditcoin.network`
- ERC-8004: eips.ethereum.org/EIPS/eip-8004; github.com/erc-8004/erc-8004-contracts (branch `master`)
- Studi: arXiv 2606.26028, "Can Trustless Agents Be Trusted? An Empirical Study of the ERC-8004 Decentralized AI Agent Ecosystem" (Jun 2026)
- Prior art: rnwy.com/sybil; Sentinel8004, AgentScore, Escroue (dari `Research Spreadsheet - Web3 Hackathon Winners (1).csv`)
- Veritas UHI9 (pola fee dinamis, prinsip provenance → kepadatan duplikat): `~/Programming/VeritasProtocol/CLAUDE.md`
- Proses desain dan seluruh bukti mentah: `idea-loop/loops/grounded-reputation-ctc/` (idea sheet v1–v4, 58 sanggahan berstatus, evidence EV-1..EV-8)
