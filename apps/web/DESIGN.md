# Tinjau — visual world

Written from the built surface on 13 September 2026 (WEB-14, then the colour and motion revision at
21:00). Lineage: the rules of `Veritas-UHI9/DESIGN.md` (pinned by Dien), with Tinjau's own accent and
its own colour strategy. Where this file and the code disagree, the code is right and this file is
stale; regenerate it.

## Strategy

**Restrained, on one ground.** One background for the whole product (Dien, 13 Sep: no section may sit
on a different colour from the rest). Sections are separated by hairlines and rhythm, never by a
coloured band. The colour lives in the accent, the state ramp, and faintly teal-tinted neutrals that
keep the page from reading as grey.

Light is the default because the page is read in daylight by someone deciding whether to pay. Dark is
a composed second theme behind the toggle: a tinted ink ground, never pure black, never a mechanical
inversion.

## Tokens (`src/styles/tokens.css`)

Light (`:root`, `[data-theme="light"]`):

| Role | Value |
|---|---|
| `--bg` | `oklch(0.985 0.006 210)` |
| `--surface` / `--surface-2` | `oklch(0.965 0.01 210)` / `oklch(0.94 0.014 210)` |
| `--border` / `--border-strong` | `oklch(0.89 0.014 210)` / `oklch(0.8 0.02 210)` |
| `--ink` / `--muted` / `--faint` | `oklch(0.2 0.02 230)` / `oklch(0.44 0.02 225)` / `oklch(0.53 0.02 225)` |
| `--primary` / `--primary-hover` / `--primary-ink` / `--ring` | `oklch(0.47 0.12 208)` / `oklch(0.42 0.12 208)` / `oklch(0.4 0.12 208)` / `oklch(0.55 0.12 208)` |
| `--state-clear` / `--state-weak` / `--state-held` | `oklch(0.5 0.15 152)` / `oklch(0.55 0.12 70)` / `oklch(0.54 0.2 25)` |

Dark (`[data-theme="dark"]`) keeps the same roles on a tinted ink ladder: `--bg oklch(0.17 0.018 225)`
through `--border-strong oklch(0.37 0.024 225)`, `--ink oklch(0.975 0.005 210)`, accent
`oklch(0.515 0.12 208)` with `--primary-ink oklch(0.8 0.11 208)`.

Radius 14 (cards) / 10 (controls) / 999 (pills). Easing `--ease cubic-bezier(0.16, 1, 0.3, 1)` for
entrances, `--ease-quart` for colour. Shell `min(72rem, 100% − 2·gutter)`; gutter 1.25rem, 2rem ≥768.

## Rules

- **Two voices.** Teal means *interaction and identity*. Green, amber and red mean *verdict state*, and
  only that. They never swap jobs.
- **Never alone.** A state is always colour **and** icon **and** label (`VerdictPill`: ShieldCheck /
  TriangleAlert / Lock). Values in the compare ledger stay plain ink; only the gating row carries a
  lock glyph. Colour-coding a number would read as a score, which the product forbids.
- **One ground.** No section, hero included, gets its own background colour. Separation is a hairline,
  a change of rhythm, or a bordered panel on `--surface`; never a coloured field.
- **Derived tint.** Every soft fill is `color-mix` of its own role colour (13% pill fill, 32% pill
  border, 9/35% held box, 10/40% error), never a grey wash.
- **Changing figures are mono.** IBM Plex Mono, tabular, for every number the chain can change.
- **Money as money.** Every percentage is followed by `feeExampleShort()`: "on a 0.1 tCTC job, 0.0010
  tCTC goes to the owner now, the rest is held".
- **A drawing where a paragraph repeats itself.** Three authored SVGs carry mechanisms the copy used to
  explain twice: `ProofPath` (transaction → proof → in-contract verification → fact), `ReviewGaps`
  (numbered reviews, one proven, the rest missing, Held), `FeeLadder` (ceiling to floor as verified
  reviewers arrive). They use the palette tokens, carry a `<title>`, and never animate.
- **Listings, two to a row.** A marketplace card is thumbnail, name, verdict, two clamped lines of the
  agent's own description, one statistics line, category chips, the fee, and an action row. Cards grow
  downward when opened; the grid is `align-items: start` so neighbours do not stretch.
- **One callout, and only where a visitor could misread the page.** A teal-tinted panel (9% fill, 32%
  border, icon in an 18% disc) says the marketplace is one use of the bureau, not the product. It is
  the only tinted block on any page; using it twice would make it furniture.
- **Two compartments, never mixed.** A marketplace listing shows the agent's own words (name,
  description, tags, skills, links, read from its ERC-8004 registration) under a label that says so,
  and the contract's answer (verdict, fee, money example) in its own panel. Nothing from the card ever
  feeds a number; nothing proven is ever phrased as a claim.
- **The agent list is the contract's.** It is read from `AgentProven` and `ReviewProven`, ordered
  most-proven first, and loaded in two waves so the first screenful is fast and the rest of the bureau
  still arrives. Nothing about which agents appear is written by hand.
- **Live figures are never animated.** Counters are for authored facts (346, 225, 83). A number read
  from the chain is printed as the chain said it, immediately.
- **No eyebrows, no kickers, no pulsing status pills, no icon-heading-text card grids as page scaffold.**
  Lists are rows on a ruled grid.

## Type

Fraunces (display), Hanken Grotesk (body and UI), IBM Plex Mono (figures, hashes, commands).

| Level | Value |
|---|---|
| hero | `clamp(2.4rem, 6vw, 4.25rem)`, weight 600, tracking −0.03em, opsz 144 |
| section | `clamp(1.75rem, 3.2vw, 2.5rem)`, line-height 1.12 |
| title | 1.125rem–1.375rem |
| body | 1rem / 1.55; lede 0.9375rem; small 0.8125rem; label 0.6875rem uppercase, 0.06em |

Uppercase labels exist only as table column heads and footer heads. They are not a licence for kickers.

## Motion

One authored moment, then only what the reader causes.

| Moment | Behaviour |
|---|---|
| Hero | five-beat stagger, 0.7s, delays 0.05–0.24s |
| Route change | `routeIn` 0.4s rise on every navigation |
| Headline | `titleIn` 0.9s clip-path wipe up from its own baseline |
| Nav | underline sweeps from the left, 40% on hover, full when active |
| Buttons | trailing icon slides 3px on hover; theme icon rotates 20° |
| Stats, findings, FAQ items | enter as a group in reading order, 50–90ms apart |
| Rows | `rowIn` 0.55s with a 70ms per-row delay when the marketplace loads |
| Verdict pill | `pillIn` 0.35s scale-and-fade when a verdict arrives |
| Disclosures, panels | `expandIn` 0.32s with a clip-path wipe |
| Compare values | `fadeKey` 0.28s, re-keyed on care level or agent change |
| Verdict card | 0.2s crossfade (`AnimatePresence`) on every reader-caused change |
| FAQ answer | `grid-template-rows` 0fr→1fr over 0.32s, no height math |
| Scout log, manifest | one `Reveal` each, IntersectionObserver, never gating visibility |
| Theme | 0.28s colour crossfade during the toggle only |
| Skeletons | `skelSheen` 1.7s linear sweep, never a pulse; dropped entirely under reduced motion |

`prefers-reduced-motion: reduce` drops every entrance animation and every hover transform, and keeps
colour and state transitions.

## Waiting, empty and failed

Every chain read takes seconds, so the page has to be honest about the wait without being blank.

- **Skeletons carry the real shape.** A loading marketplace draws six listing skeletons with the
  listing's own geometry, and a loading comparison holds open exactly as many columns as the link
  asked for. Nothing moves when the data lands. They sheen rather than pulse: a blinking dot reads as
  decoration, and this is a measurement in progress.
- **An empty state is never shown before the chain has answered.** "No agent matches that" and "no
  bounty is open" are claims about the bureau, so they wait until the bureau has actually spoken. An
  empty list plus an unreachable chain is reported as unreachable, never as empty.
- **Every empty and failed state is drawn** (`illustrations/StateMarks.tsx`), from the same parts the
  interface is made of, and carries the next move inside its sentence rather than under it.
- **No figure is ever animated on its way in from the chain.** Counters are for authored facts only.

## Structure

Hash routes, static build: `#/` (landing), `#/marketplace` (`#/agents` still resolves), `#/how`,
`#/compare?ids=a,b,c` (two to four columns, `?a=&b=` still resolves), `#/faq`, `#/developers`.
`#/bounties` is the marketplace on its bounties tab: the two halves of the marketplace are tabs, and
each keeps its own address so either can be linked to and the back button works between them.
Comparison has no navbar entry, because it is not a place you go: you press **Compare** on two to
four listings and a tray holds them at the foot of the window until you use or clear them. The tray
renders into the body, since the route wrapper's entrance animation would otherwise capture its
fixed positioning.
The landing page and the marketplace ship in the first download; the comparison, how-it-works, FAQ
and developer pages are fetched on their own visit. Only the three routes that show chain figures
read the chain at all. Breakpoints 640 / 768 / 1024. Three and four comparison columns keep a
readable minimum width and scroll inside their own frame; the page itself never scrolls sideways. Hit targets ≥ 24px. Contrast is measured, not
eyeballed: `node ../../scripts/screenshot.mjs` composites every colour to sRGB and must report
`contrast []`, `targets []`, `overflow false` on all six routes at 1440 and 375, in both themes.
