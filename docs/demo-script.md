# Skrip video demo (≤3:00) — Grounded Agent Reputation

Format: rekaman layar satu take; kiri terminal, kanan browser (Blockscout Creditcoin + Ethereum). Narasi Bahasa Inggris singkat, teks di layar. Placeholder `<FACTS>`, `<ESCROW>`, `<TX_…>` diisi setelah Task 3–6.

| Waktu | Layar | Narasi (verbatim) | Yang harus terbaca |
|---|---|---|---|
| 0:00–0:15 | slide judul + 3 angka | "ERC-8004 reputation on Ethereum mainnet: 94% of agents have one reviewer, one wallet wrote 225 reviews, 83% of new registrations come from clone farms. The spec says: aggregate off-chain and trust the aggregator." | 3 angka + sumber (arXiv 2606.26028, RPC 60d) |
| 0:15–0:50 | terminal: `npx tsx src/scout.ts --agents=34135 …` → Blockscout Creditcoin tx `record` | "GroundedFacts on Creditcoin admits facts only through Attestcoin proofs. Here the scout proves a reviewer's transaction from January 2024 — 604 continuity roots, verified by the BlockProver precompile in one call." | hash tx Ethereum (Blockscout ETH) dan hash tx Creditcoin `<TX_RECORD_34135>` berdampingan; gasUsed |
| 0:50–1:20 | terminal: `cast call <FACTS> "facts(...)" 3 34135 …` lalu `… 3 50283 …` | "Agent 34135: three reviewers active for more than six months before they reviewed, no gaps. Agent 50283: 32 reviews, one reviewer — and that reviewer owns 43 agents; five sibling agents proven from the same owner." | dua tuple `facts()` berdampingan; `reviewerOwnsAgents = 43` |
| 1:20–1:50 | terminal: `quote` + `hire` × 2 → Blockscout event `Hired` | "No score. The consumer sets thresholds; the escrow turns facts into a premium: 2% for 34135, 20% for 50283, paid to the agent owner — an incentive to earn real reviewers, not a reserve waiting for a trigger." | `premiumBps` 200 vs 2000; `<TX_HIRE_34135>`, `<TX_HIRE_50283>` |
| 1:50–2:35 | terminal: scout live tanpa `--agents` (log `[R1]`, `[R2]`, `[R3]`) | "The agent chooses its own targets from the registry and open bounties, gathers evidence in both directions — senior reviewers that help, clone siblings and higher indices that hurt — skips what another scout already admitted, and only proves when the bounty covers gas." | baris `[R1] targets`, `+ hurts …`, `+ helps …`, `already admitted on-chain (txSeen)`, `[tx] mined` |
| 2:35–2:50 | terminal: `npx tsx src/verify.ts plans/agent-34135-*.json` | "Anyone can recompute every fact from the same proofs, off-chain, and get the same numbers." | JSON `breadthGrounded` sama dengan `facts()` |
| 2:50–3:00 | slide batas + repo | "Limits: Ethereum-side registry only; newest unsubmitted reviews are undetectable; no consumer contract on Creditcoin yet. Everything above is verifiable from the README." | URL repo, alamat kontrak |

Cadangan (bila Task 3–6 belum ada saat 3 Sep 06:00): adegan 0:15–1:50 diganti `forge test -vv` (14 test, fixture `txBytes` mainnet) + `eth_call verify` ke precompile via `scratchpad/callpc.sh` (true, 117.971 gas); adegan 1:50 memakai dry-run `plans/*.json`.

Checklist rekam (Dien): resolusi 1080p, font terminal ≥16 pt, zoom Blockscout 125%, mikrofon dites 10 detik, unggah YouTube unlisted, cek bisa dibuka dari jendela incognito.
