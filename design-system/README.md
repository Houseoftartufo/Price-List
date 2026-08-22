# House of Tartufo Design System

This folder is the canonical visual source of truth for future House of Tartufo digital products.

It was extracted from the current Price List visual language and turns that look into a reusable system instead of a one-off page.

## Files

- `HOT-DESIGN-SYSTEM.md` — human-readable design DNA, layout rules, component behavior, responsive rules and do/don't guidance.
- `HOT-CODEX-BUILD-CONTRACT.md` — compact build contract to give Codex/ChatGPT at the start of every House of Tartufo project.
- `hot-tokens.css` — reusable CSS design tokens.
- `hot-primitives.css` — reusable visual primitives: glass surfaces, cards, buttons, pills, fields, section labels, editorial headings and containers.
- `hot-tokens.json` — framework-neutral token source for React, Tailwind, native apps, design tools or generators.

## Golden rule

New House of Tartufo platforms may have different information architecture and product logic, but they must feel like members of the same product family.

Do not clone the Price List page structure. Reuse its visual DNA:

- warm cream / travertine background
- deep truffle-brown primary ink
- restrained bronze accents
- Manrope for interface text
- Cormorant Garamond for editorial display typography
- thin warm borders
- soft, wide shadows
- translucent warm glass surfaces
- pill actions and filters
- generous editorial whitespace
- calm, premium motion
- strong mobile ergonomics

## Recommended use in a new repository

1. Copy `hot-tokens.css` and `hot-primitives.css` into the project.
2. Load tokens before primitives.
3. Give the coding agent `HOT-CODEX-BUILD-CONTRACT.md` as a mandatory design constraint.
4. Build the product-specific screens using the primitives rather than inventing new visual rules.
5. Run a final consistency pass against `HOT-DESIGN-SYSTEM.md`.

## Product-family rule

A new House of Tartufo interface should be recognizable without showing the logo. If the colors, typography, spacing, controls and surfaces could belong to a generic SaaS template, the implementation is not finished.
