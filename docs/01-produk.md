# Grounded Agent Reputation — Dokumen Produk

Versi 1.0 · 29 Agu 2026 · Hackathon: BUIDL CTC 2026 Fall (track AI) · Status: dibangun, menunggu deploy CC3 Testnet

## 1. Satu kalimat

Fakta tentang agent AI dan pengulasnya di registri ERC-8004 Ethereum, dibuktikan secara kriptografis ke kontrak di Creditcoin, supaya kontrak dan agent lain bisa memutuskan "sewa atau tidak, dengan premi berapa" tanpa mempercayai layanan skor mana pun.

**Value proposition** (detail dua segmen di `hackathons/ctc/outputs/03-product/value-proposition.md`): untuk kontrak dan agent yang menyewa agent lain dan tidak mau mempercayai penerbit skor, ini lapisan fakta reputasi yang setiap barisnya dibuktikan dari transaksi Ethereum. Berbeda dari RNWY dan Kleros yang menerbitkan skor, kami menerbitkan fakta yang bisa diverifikasi kontrak dan dihitung ulang siapa pun. Segmen yang alternatifnya lebih lemah dari kami hanya satu: kontrak yang mengunci uang; di Creditcoin kontrak itu belum ada dan risikonya diterima (DEC-002).

## 2. Masalah yang diselesaikan

Registri reputasi agent ERC-8004 di Ethereum mainnet sudah dipakai (19 ribu agent terdaftar, ulasan masuk tiap hari) tetapi isinya tidak bisa dipercaya mentah:

| Fakta (mainnet, 29 Agu 2026) | Angka |
|---|---|
| Agent dengan tepat satu pengulas | 346 dari 367 (600 ulasan terakhir) |
| Ulasan oleh satu wallet saja | 225 ulasan untuk 195 agent |
| Pengulas yang juga memiliki agent | 16 dari 105 pengulas, menulis 59% ulasan |
| Registrasi terbaru milik pemilik ≥10 agent | 76 dari 128 (59%); 60 hari via RPC: 12.387 dari 14.771 (83%), 8.136 agent didaftarkan dalam tx multi-`Registered` |
| Ulasan baru di Ethereum, 60 hari terakhir | 121 (≈2/hari); Base ≈139× lebih ramai dan tidak dijangkau Attestcoin |
| Klaim bukti pembayaran yang benar chain-nya | 0 dari 12 sampel |
| Pengulas Ethereum yang berperilaku sybil terkoordinasi | 73,5% (arXiv 2606.26028) |

Spesifikasi ERC-8004 sendiri menyerahkan penyaringan ke "agregator reputasi" off-chain yang memberi skor bertanda tangan. Artinya: siapa pun yang memakai reputasi agent harus mempercayai penerbit skor (RNWY, 8004scan, scanner satu maintainer). Tidak ada cara bagi **kontrak** untuk memverifikasi sendiri.

Akar teknisnya: kontrak EVM tidak bisa membaca riwayat transaksi chain-nya sendiri. Attestcoin membuat kontrak di Creditcoin bisa memverifikasi "transaksi ini benar terjadi di Ethereum, bahkan 2,5 tahun lalu".

## 3. Apa yang kami bangun

### 3.1 `GroundedFacts` (Creditcoin): fakta, bukan skor

Setiap fakta masuk hanya lewat proof Attestcoin atas transaksi Ethereum, dan hanya dari kontrak registri resmi ERC-8004:

- **Ulasan nyata**: per pasangan (agent, pengulas, nomor urut). Pencabutan ikut dicatat. Nomor urut per pasangan bersifat monoton di registri, jadi **ulasan yang disembunyikan di tengah** terdeteksi (`gapCount`).
- **Senioritas pengulas**: transaksi tertua yang dibuktikan sebelum ia mengulas, dan jumlah bulan aktivitas yang dibuktikan. Tidak bisa dipalsukan ke belakang.
- **Provenance agent**: pemilik saat ini (mengikuti transfer), **registrant** (siapa yang membayar pendaftarannya; kokoh terhadap pola pabrik/akun ERC-6551), URI, agent lain dari pemilik/registrant/tx yang sama (klon), pengulas yang juga memiliki agent.

Kontrak tidak punya bobot. Konsumen menyerahkan ambangnya sendiri (`minAge`, `minDepth`, `k`, `c`) dan menerima angka: `breadthRaw`, `breadthGrounded`, `breadthIndependent`, `gapCount`, `negatives`, `cloneDensityLB`, `registrantSiblings`, `uriSiblings`, `sameTxSiblings`, `firstRegisteredHeight`. Siapa pun bisa menghitung ulang angka itu dari proof yang sama (`agent/src/verify.ts`).

### 3.2 Konsumen contoh

- **`AgentHireEscrow`**: menyewa agent dengan **premi dinamis** `base + (max−base)·risiko`; risiko turun bila pengulas senior cukup dan kepadatan klon rendah. Premi dibayar ke pemilik agent (insentif mencari pengulas senior nyata), bukan ke cadangan yang menunggu pemicu. Satu-satunya gate: ada ulasan yang disembunyikan.
- **`CoverageBounty`**: konsumen menaruh hadiah untuk satu agent beserta ambangnya. Siapa pun yang mengirim bukti yang **mengubah keputusan** konsumen dibayar; bukti yang merugikan agent dibayar sama dengan yang menguntungkan.

### 3.3 `GroundedScout`: agent otonom (track AI)

Empat peran, semuanya keputusan yang bisa salah dan tercatat di log:

| Peran | Keputusan | Contoh dari dry-run 29 Agu |
|---|---|---|
| R1 Targeting | agent mana yang dikerjakan: bounty terbuka dulu, lalu registri paling aktif | memindai 66 ulasan/8 agent 7 hari terakhir → memilih 50283 dan 50286 |
| R2 Dua arah | bukti yang menguntungkan (pengulas senior) dan merugikan (nomor urut lebih tinggi, negatif, pencabutan, pengulas-pemilik, klon) | menemukan pengulas tunggal `0x1030…` memiliki 43 agent dan 42 agent saudara |
| R3 Timing | lewati bukti yang sudah dimasukkan scout lain (`txSeen`); buktikan sekarang hanya bila hadiah ≥ biaya | 8 proof ≈ 4,8 jt gas ≈ 0,0024 tCTC |
| R4 Konsumen | sewa lewat eskrow bila fakta lolos ambangnya sendiri, atau danai bounty | mode live |

Tidak ada LLM di jalur fakta. Kontrak menghitung ulang semuanya dari bytes.

## 4. Kenapa Attestcoin tidak bisa dicabut

Tanpa proof, `record` harus mempercayai pengirim, dan produk kembali menjadi agregator bertanda tangan seperti yang sudah ada. Usia pengulas bertahun-tahun, urutan ulasan, dan provenance pendaftaran hanya bisa ditegakkan dari bytes transaksi yang diverifikasi precompile Creditcoin. Attestcoin memindahkan kepercayaan dari RPC/indexer ke himpunan attestor Creditcoin yang ber-bond; ia tidak menghapusnya.

## 5. Kedalaman pemakaian Attestcoin (terukur)

- Proof event registri **mainnet** lolos `verify` on-chain: 117.971 gas (100 root); transaksi Jan 2024 (604 root): 414.624 gas.
- Dua chain sumber (mainnet chainKey 3, Sepolia chainKey 1) dalam satu kontrak; `calculateTxIndex` untuk dedup; `EvmV1Decoder` untuk pengirim, status, dan alamat log.
- Counter registri (`feedbackIndex`) sebagai oracle kelengkapan parsial.
- Gas kontrak di luar precompile: ulasan 259k, pendaftaran (8 log) 439k, aktivitas 130–184k.

## 6. Batas yang diakui

- Hanya registri Ethereum; pembayaran ERC-8004 nyata terjadi di Base/Celo/Polygon dan tidak dimasukkan.
- Ulasan terbaru yang tidak pernah diajukan tidak terdeteksi; hanya celah di bawah nomor tertinggi yang terlihat. Bounty membayar bukti nomor lebih tinggi.
- Kepadatan klon = batas bawah; wallet tua bisa dibeli; operator sah dengan banyak agent tampak seperti klon. Semua dilaporkan sebagai fakta, konsumen yang menimbang.
- Hari ini belum ada kontrak di Creditcoin yang membaca reputasi agent; eskrow adalah konsumen contoh. Risiko ini diterima secara sadar.

## 7. Posisi terhadap yang sudah ada

| | RNWY / 8004scan | Sentinel8004 | AgentScore | **Grounded** |
|---|---|---|---|---|
| Sinyal umur wallet, klon | ya | ya (heuristik) | tidak | ya |
| Bisa diverifikasi kontrak | tidak (API) | tidak | via CRE (oracle) | **ya (proof)** |
| Skor editorial | ya | ya | ya | **tidak; fakta + ambang konsumen** |
| Insentif bukti dua arah | tidak | tidak | tidak | **bounty simetris** |

## 8. Demo (≤3 menit, data mainnet nyata)

1. Scout memindai registri, memilih target, mencetak keputusan dan penolakan.
2. Proof mainnet masuk ke `GroundedFacts` di Creditcoin (hash tx dua chain di layar).
3. `facts()` untuk agent dengan pengulas senior vs agent dengan pengulas tunggal yang memiliki 43 agent; eskrow memberi premi berbeda.
4. Bounty dibayar untuk bukti yang merugikan agent; verifier off-chain menghitung ulang angka yang sama.
