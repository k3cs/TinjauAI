# Instructions for AI agents working on Tinjau

Read `docs/00-panduan-pengembangan.md` before changing any code or document. It is the source of truth for invariants, allowed actions, official numbers, forbidden claims, and the current backlog. Update its §10 (status) and §17 (changelog) before ending a session that changed the project.

Hard rules (details in the guide, §2):
- Never commit `.env`, private keys, or personal data. Never submit to DoraHacks.
- No AI attribution in git or GitHub: no `Co-Authored-By` or `Claude-Session` trailers, no "Generated with Claude Code" lines, never add an agent as collaborator. Commits are authored by Dien.
- Never push to `main`/`gh-pages` or redeploy contracts without Dien's explicit approval in that session.
- `GroundedFacts` stores proven facts only: no scores, no admin, no LLM in the fact path.
