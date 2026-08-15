# Price List 10x — Sprint Board

Last updated: 2026-08-15

Legend: `DONE` · `NEXT` · `BLOCKED`

## Current state

**PRODUCTION LIVE — iterative hardening in progress.**

Production branch: `main`.

Current isolated feature branch: `feat/product-detail-quote-cta`.

## Safety & data

| Item | Status |
| --- | --- |
| Isolated development branch | DONE |
| Master plan + data contract | DONE |
| Automated quality gate | DONE |
| Google Sheet source identified | DONE |
| Official Excel master baseline | DONE — 55 variants |
| Typed catalogue/product contract | DONE |
| Central discount policy | DONE |
| Deterministic pricing engine | DONE |
| Header-based source parser | DONE |
| Base case + all discount tiers reconciled | DONE |
| Build-time verified catalogue snapshot | DONE |
| Direct current-sheet sync | DONE |
| Runtime rejection of incomplete live catalogue | DONE |
| Safe verified fallback | DONE |
| Shopify Admin API enrichment | DONE |

## Internationalisation

| Item | Status |
| --- | --- |
| EN / IT / FR / NL coverage | DONE |
| Locale persistence | DONE |
| Document language updates | DONE |
| Commercial microcopy translated | DONE |
| i18n unit tests | DONE |
| Buyer UI avoids mixed-language technical fallback text | DONE |

## Catalogue UX

| Item | Status |
| --- | --- |
| Protected replacement preview | DONE |
| Premium compact hero | DONE |
| Full catalogue workspace | DONE |
| SKU/name/format search | DONE |
| Category navigation | DONE |
| Line + truffle filters | DONE |
| Desktop table | DONE |
| Mobile product cards | DONE |
| Deep-link state | DONE |
| Product detail cards | DONE |

## Wholesale pricing

| Item | Status |
| --- | --- |
| Quantity selector | DONE |
| Dynamic unit/case/subtotal/saving | DONE |
| Active tier + next-tier guidance | DONE |
| Ladder 1 / 2 / 3 / 5 / 10 / 15 boxes | DONE |
| EUR formatting | DONE |

## Quote & conversion

| Item | Status |
| --- | --- |
| Add/update quote | DONE |
| Persistent basket | DONE |
| Quantity editing | DONE |
| Totals + saving | DONE |
| Remove / clear | DONE |
| WhatsApp request | DONE |
| Email request | DONE |
| Copy order | DONE |
| Add/update quote directly from product detail card | NEXT — PR #3 |
| Printable/exportable quote | NEXT — optional |

## Official brand identity — logo rollout sprint

**Reference master:** the corrected House of Tartufo logo supplied by the owner on 2026-08-15 — the full `HOT` monogram with the truffle silhouette integrated in the `O`, paired with the stacked `HOUSE OF TARTUFO` wordmark, shown in the uploaded reference artwork.

**Supersedes:** the previously supplied beige double-outline `H` reference. That earlier asset is not the official logo and must not be used.

**Non-negotiable rule:** the corrected supplied artwork is the official logo master. Do not redraw, reinterpret, change geometry, alter the truffle silhouette, replace the wordmark, recolor it, change typography, or generate an AI approximation.

| Item | Status |
| --- | --- |
| Preserve corrected supplied logo artwork as official master asset | NEXT |
| Add web-optimized asset while preserving the master appearance exactly | NEXT |
| Replace provisional/generated brand mark in the Price List header | NEXT |
| Replace provisional/generated brand mark in the footer | NEXT |
| Use official logo consistently in branded catalogue surfaces where the full mark fits | NEXT |
| Keep adequate clear space and prevent stretching/cropping | NEXT |
| Verify logo rendering on desktop + mobile and light/dark surrounding surfaces | NEXT |
| Add visual regression coverage so the official logo cannot silently be replaced | NEXT |
| Review OG/app-icon derivatives separately before using cropped symbol-only versions | NEXT — requires explicit derivative approval |

## Mobile & accessibility

| Item | Status |
| --- | --- |
| Semantic controls | DONE |
| Reduced-motion support | DONE |
| Touch targets at least 44 px | DONE |
| Mobile language switcher | DONE |
| Quote safe-area handling | DONE |
| No horizontal clipping | DONE — tested at 320 / 360 / 390 / 430 px |
| Mobile buyer journey | DONE |

## Performance / trust / analytics

| Item | Status |
| --- | --- |
| Production minification | DONE |
| JS/CSS bundle budget | DONE |
| Catalogue cache/fallback strategy | DONE |
| Preview noindex | DONE |
| Release candidate canonical + Open Graph URL | DONE |
| Visible verified timestamp | DONE |
| ex-works / VAT / shipping note | DONE |
| Buyer funnel events | DONE |
| `dataLayer` forwarding when present | DONE |
| Lighthouse CI | NEXT — optional hardening |
| Dedicated OG image / app icons | NEXT — coordinate with official logo sprint |

## QA / release readiness

| Item | Status |
| --- | --- |
| Typecheck | DONE |
| Unit tests | DONE |
| Preview integrity QA | DONE |
| Chromium desktop E2E | DONE |
| Chromium mobile E2E | DONE — 320 / 360 / 390 / 430 px |
| QA screenshot artifact | DONE |
| Playwright report artifact | DONE |
| Verified preview build artifact | DONE |
| Release-candidate artifact | DONE |
| Release checklist | DONE — `docs/RELEASE.md` |
| Rollback runbook | DONE — `docs/RELEASE.md` |
| Production Vercel deployment | DONE |
| Post-deploy runtime-error check | DONE |

## Final gate

Every feature head commit must pass the complete `Quality Gate` before merge to `main`. Visual changes must be checked on desktop and mobile, and official brand assets must remain identical to the approved reference master.