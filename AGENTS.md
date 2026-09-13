# Instructions for AI agents working on Tinjau (v3 rebuild)

Tinjau is a verified background check for AI agents (a credit bureau in Creditcoin's sense): facts about ERC-8004 agents and their reviewers, proven from Ethereum into Creditcoin through the Attestcoin Protocol, reported as admitted evidence plus known gaps, never a score or a complete history. Scouts only carry proofs; the precompile decides what is true. Hackathon: BUIDL CTC 2026 Fall, deadline 14 Sep 2026 10:59 WIB.

Read first, in order:
1. `docs/task-tracker.md`: every task, its priority, dependencies, and status. Pick the top P0 whose dependencies are done. Update its status and the log (§9) when you finish.
2. `docs/panduan-pengembangan.md` (living guide: invariants, allowed actions, official v3 numbers, forbidden claims, commands).
3. `docs/legacy/`: v2 design references (specs, numbers, scripts described in prose). Do not copy v2 code; it was deleted on purpose. v2 addresses and numbers must not appear in v3 public materials.

Hard rules:
- No AI attribution in git or GitHub: no `Co-Authored-By` or `Claude-Session` trailers, no "Generated with Claude Code" lines, never add an agent as collaborator. Commits are authored by Dien.
- Never commit `.env`, private keys, or personal data. Never submit to DoraHacks.
- Never push (including the planned force-push to `k3cs/TinjauAI`), deploy to Vercel production, or deploy contracts without Dien's explicit approval in that session.
- Frontend (`apps/web`, tasks WEB-*) waits for Dien's explicit go-ahead.
- Wording rules: `minAttestors` = attestors registered at admission (never "signers behind a fact"); `coveredThrough` = newest proven relevant height (never "all blocks checked"); "admitted evidence" and "known gaps", never "complete history". Evidence Exchange: `fund`/`decisionOf`/`proveAndClaim` (pay only for a decision change, either direction) and source-order conflict resolution are live; `proveBatchAndClaim`, adjudication receipt and same-tx hire re-pricing are not built. Say exactly that, never "roadmap only" and never "fully built". When any of this changes, update every file in `../docs/list-document.md`.
- Product invariants: `GroundedFacts` stores proven facts only. No scores or weights, no admin or upgrade path, no LLM in the fact path, every number recomputable off-chain from the same proofs, logs accepted only from the official ERC-8004 registries.

Layout: `contracts/` (Foundry), `packages/core` (shared TS), `services/scout` (agent, runs locally), `apps/server` and `apps/mcp-server` (Vercel Functions), `apps/web` (static, Vercel), `scripts/`, `docs/`.
