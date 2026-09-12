# Tinjau: a credit bureau for AI agents, built from facts proven from Ethereum into Creditcoin

Tinjau tells a contract or an agent whether an AI agent on the ERC-8004 registry deserves to be hired, and at what price, without trusting any score publisher. Every fact about the agent and its reviewers enters Creditcoin only through an Attestcoin proof of an Ethereum transaction, and anyone can recompute every number from the same proofs.

BUIDL CTC 2026 Fall · track AI · Creditcoin CC3 Testnet + Attestcoin Protocol

## Why a credit bureau

Creditcoin began as a credit history for borrowers that banks cannot see. AI agents are the next borrowers with no readable history. Over 19,000 are registered on ERC-8004, other agents hire and pay them, and nothing a contract can check says which ones deserve trust. Tinjau is the bureau, not the lender: it records proven facts, and the party taking the risk sets the price. The hiring escrow is the pricing step; its premium is the agent's cost of credit.

## Problem

The ERC-8004 reputation registry on Ethereum mainnet is live, and nobody can read it raw. Of the last 600 reviews, 346 of 367 agents had exactly one reviewer and one wallet wrote 225 reviews; 16 of 105 reviewers own agents and wrote 59% of all feedback; in 60 days, owners holding ten or more agents made 83% of new registrations (RPC measurement, 29 Aug 2026; arXiv 2606.26028 finds 73.5% coordinated Sybil reviewers on Ethereum). The standard's answer is to aggregate off-chain and trust the aggregator.

## Solution

- **`GroundedFacts`** (Creditcoin) admits data only through Attestcoin proofs of Ethereum transactions from the official ERC-8004 registries. It records which reviews exist, how long each reviewer was active before reviewing, whether review indices have holes, whether a reviewer owns agents, and how many agents share an owner, registrant, URI or minting transaction, plus the bonded attestor count behind each fact. It computes no score: callers pass thresholds and get numbers back.
- **`AgentHireEscrow`** turns facts into a premium (the agent's cost of credit, paid to the agent's owner) and refuses hires when a reviewer's record has holes, when facts are stale, or when too few attestors stood behind them.
- **`CoverageBounty`** pays whoever submits proofs that change a consumer's decision, in either direction.
- **`GroundedScout`** (autonomous agent) picks targets (open bounties first), gathers evidence that helps and evidence that hurts, skips proofs other scouts already admitted, proves only when a bounty covers gas, and hires on its own thresholds.
- **MCP server** (`tinjau_facts`, `tinjau_quote`, `tinjau_verify`) and a **read API** let any agent query the bureau; a Gemini-based **claim reader** checks payment claims inside review documents against the Attestcoin prover and precompile (a report, never a fact). Run live on agent 50283: 6 payment claims, 6 of them on no chain Attestcoin can find them.

## How it works

```mermaid
flowchart LR
  A[Ethereum mainnet / Sepolia<br/>ERC-8004 registries + any tx] -->|discovery| S[GroundedScout<br/>R1 targets · R2 two-way evidence · R3 timing · R4 hire]
  S -->|proof-by-tx| P[Attestcoin prover]
  P -->|proof| G[GroundedFacts on Creditcoin<br/>0x0FD2 verify · decode · 0x0FD4 attestors]
  G --> E[AgentHireEscrow<br/>premium = cost of credit]
  G --> B[CoverageBounty<br/>pays decision-changing evidence]
  G --> M[MCP + read API]
  G --> V[recomputeFromChain<br/>anyone replays every proof]
```

## Verified on testnet (11 Sep 2026)

| Agent | What the bureau proved | Result |
|---|---|---|
| 22771 | 3 reviewers active 97 days to 4 years before their first review, no holes, no clones | premium 1% (100 bps), hired by the scout |
| 21548 | same, after the scout claimed an open bounty with the decisive proof batch | premium 1%, hired |
| 50283 | one reviewer who owns agents, with review #97 proven and #1–96 not; owner holds 6 other agents | quote 20% (2,000 bps), `hire` reverts `Gated(1)` |

25 source transactions admitted as of 12 Sep 2026 (24 Ethereum mainnet back to 2022, 1 Sepolia), every one recomputed off-chain from the chain alone with identical results. The scout keeps running on a schedule until the submission deadline, so the admitted-transaction count only grows; every number here is a floor, not a ceiling. The same proof verifies on CC3 **mainnet**. Transactions, gas and precompile details: [`ATTESTCOIN_INTEGRATION.md`](ATTESTCOIN_INTEGRATION.md).

## Contract addresses (Creditcoin CC3 Testnet, chainId 102031, verified)

| Contract | Address |
|---|---|
| GroundedFacts | `0xC045087Fd85Da4f2d981222b18E7e74c8040BC47` |
| AgentHireEscrow | `0x82C604Ebf1090f3dceFa6F96b6DF624DF7eF16cB` |
| CoverageBounty | `0x6AbF1F5F8850A347A5D5Bc6AcbA8961595C09A0b` |
| ERC-8004 Identity / Reputation, Ethereum mainnet (read via proofs, chainKey 3) | `0x8004A169…a432` / `0x8004BAa1…9b63` |
| ERC-8004 Identity / Reputation, Sepolia (chainKey 1) | `0x8004A818…BD9e` / `0x8004B663…8713` |

## Run locally

```bash
pnpm install
pnpm test:contracts                                  # 41 Foundry tests, real prover txBytes fixtures
pnpm --filter @tinjau/core test                      # off-chain model = contract on the same fixtures
cd services/scout
pnpm scout scout --agents=22771,50283 --maxTargets=2 # dry-run: decisions and proofs, no key needed
pnpm scout verify 22771 50283 21548                  # recompute facts and compare with the contract
cd ../../apps/server && pnpm dev                     # read API on :8787 (GET /facts/3/22771)
cd ../mcp-server && pnpm stdio                       # MCP server over stdio
```

Live mode (`--live`) and `scripts/deploy.sh` need `PRIVATE_KEY` in `.env` (see `.env.example`). Deploys use `forge create --broadcast`: forge's script simulation rejects Creditcoin block headers.

## Repository

| Path | What |
|---|---|
| `contracts/` | Foundry: `GroundedFacts`, `AgentHireEscrow`, `CoverageBounty`, `IAgentFacts`; tests with real proof fixtures |
| `packages/core` | chain config, prover client, txBytes decoder, off-chain facts model, contract client, `recomputeFromChain` |
| `services/scout` | GroundedScout CLI (runs locally; holds the key) |
| `apps/server` | Hono read API + claim reader (Vercel Functions) |
| `apps/mcp-server` | MCP tools (stdio and stateless HTTP) |
| `apps/web` | frontend (in progress) |
| `docs/` | evaluation dossier, deck, task tracker, development guide |

## What was built during the hackathon

All code in this repository was written during BUIDL CTC 2026 Fall. The v3 rebuild started on 11 Sep 2026 from an empty repository. Vendored, not written by us: `contracts/lib/usc/` (`EvmV1Decoder`, `INativeQueryVerifier` from `@gluwa/usc-contracts` 0.2.0) and `contracts/lib/forge-std`. The dynamic-premium idea reuses a pattern from the author's earlier Veritas (UHI9) work, without its insurance reserve.

## Known limitations

- Ethereum-side registries only; Base has far more ERC-8004 activity and is out of Attestcoin's reach today.
- A review nobody has submitted yet is invisible; only holes below the highest proven index show. Bounties pay for proving more.
- Clone density is a lower bound; aged wallets can be bought; honest multi-agent operators look like clone farms. The contract reports facts, not verdicts.
- `facts()` examines at most 256 reviewers (`truncated`), and the escrow refuses truncated facts.
- No consumer contract exists on Creditcoin today; the escrow is an example. Attestcoin moves trust to Creditcoin's bonded attestors (4 for Ethereum on testnet, 7 on mainnet with a minimum bond of 0); it does not remove trust.

License: MIT.
