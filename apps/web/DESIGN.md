# Tinjau — visual world

Pinned by Dien: the visual language of `prompt-ui-tech-forward.md` governs the whole surface, not just
the hero. That file describes another product (a banking card), so its **copy, brand and video asset
are not used**; its stack, palette, type, component vocabulary and motion signature are.

## Stack

React 19 + Vite, `motion` (framer-motion), `lucide-react`. **Plain CSS, no Tailwind, no CSS framework.**
This overrides the earlier WEB-1 note in `docs/task-tracker.md`, which said Tailwind + TanStack Query.
Chain reads go through `ethers` v6 and `@tinjau/core`; no query library.

## Palette — monochrome, no exceptions

```
--ink            #000000      text, stamps, primary fills
--paper          #FFFFFF      page
--fill-soft      #F4F4F6      pill and tag containers
--ink-70    rgba(0,0,0,0.70)  secondary text on paper
--ink-62    rgba(0,0,0,0.62)  smallest body text (13px floor, 5.9:1 on paper)
--ink-55    rgba(0,0,0,0.55)  large text only (18px+), never body
--rule-12   rgba(0,0,0,0.12)  hairlines, tag borders
--rule-35   rgba(0,0,0,0.35)  secondary button border
```

The pinned file uses 55% black for 13px text. That measures **4.48:1 and fails WCAG AA**, so 13px and
below use `--ink-62` instead. This is the one deliberate deviation from the file, and it is a fix.

**Status is carried by shape and inversion, never by hue.** An agent that passes is a hairline outline
with the verdict in ink. An agent that is blocked is a **solid ink block with paper-white text and a
drawn lock icon** — the highest contrast the palette can produce, legible at a glance and from across
a room in the demo video. No green, no red, no amber.

## Type — Inter only

Google Fonts, weights 300, 400, 500, 600. Preload the 300 and 400 faces; nothing self-hosted.

```
display   clamp(2rem, 8vw, 4.5rem) mobile / clamp(2.5rem, 5.5vw, 4.5rem) 768px+
          weight 300, letter-spacing -0.03em, line-height 1, balanced
section   1.75rem / weight 400 / -0.02em
body      1rem / weight 400 / line-height 1.6 / measure 65-75ch
small     0.8125rem (13px) / weight 400 / --ink-62
label     0.6875rem (11px) / weight 500 / tracking 0.04em (pills only)
figures   font-variant-numeric: tabular-nums everywhere a number can change
```

No eyebrow or kicker line above any heading. Monospace appears **only** for hashes, addresses and
command lines, and only below the first layer.

## Components

- **Pill button, primary:** ink fill, paper text, 13px, fully rounded, 32px inner circle on desktop
  and 28px on mobile, holding a lucide icon at strokeWidth 3.
- **Pill button, secondary:** transparent, 1px `--rule-35` border, ink text.
- **Tag pill:** `--fill-soft` container or paper with a 1px `--rule-12` border, 11px label.
- **Listing row, not a card.** Agents are rows on a ruled grid with real content in them: name, verdict,
  fee, one plain reason, action. Equal-size icon+heading+text cards are forbidden as page scaffold.
- **Disclosure ("How do we know?"):** an inline, in-place expansion under the sentence it explains.
  Not a modal. Inside, still sentences first; the hash and the explorer links come last.
- **Footer gradient:** `linear-gradient(to top, #fff 0%, rgba(255,255,255,0.8) 50%, transparent 100%)`.

## Motion — one signature, borrowed exactly

Easing `cubic-bezier(0.16, 1, 0.3, 1)` for everything. Entrances come from an already-legible state:
opacity 0 plus `y: 16-20px`, never scale-up from nothing except the hero backdrop.

```
navbar      y -16 → 0, 0.8s
backdrop    opacity 0 → 1, scale 1.05 → 1, 1.8s
hero block  y 20 → 0, 1.0s, delay 0.5s
hero line   y 16 → 0, 0.8s, delay 0.6s
heading     y 20 → 0, 0.8s, delay 0.8s
actions     y 16 → 0, 0.8s, delay 1.0s
```

The hero is the one authored moment. Below it, motion is restricted to state changes the reader caused:
a disclosure opening, a verdict flipping when thresholds change, a transaction confirming. No section
gets its own scroll entrance. `prefers-reduced-motion: reduce` renders every final state immediately.

## Hero backdrop — ours, not the file's

The file hardcodes a CloudFront video belonging to another project. Replaced with an authored backdrop:
proofs travelling from Ethereum to Creditcoin, drawn on a canvas in ink on paper, paused under reduced
motion and when off-screen. Small, ours, and about what the product actually does.

## Browser surfaces

Themed, not left to defaults: selection (`--ink` on `--fill-soft`), caret, focus ring (2px ink offset
2px, visible on every interactive element), scrollbar, underline offset on links, tabular numerals in
every changing figure.

## Responsive

Mobile-first, single breakpoint at 768px. Mobile: 16px navbar padding, hidden brand text and tags,
stacked footer, backdrop at 80%. Desktop: 24px/32px navbar padding, everything visible, row footer,
full-bleed backdrop. Verified at 375 / 768 / 1024 / 1440.
