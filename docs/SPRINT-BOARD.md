# Price List 10x — Sprint Board

Last updated: 2026-08-12

Legend: `DONE` · `NEXT` · `BLOCKED`

## Current state

**READY FOR FINAL APPROVAL.**

Working branch: `codex/price-list-10x`

PR #1 remains draft and isolated from `main`.

## Safety & data

| Item | Status |
| --- | --- |
| Isolated development branch | DONE |
| Master plan + data contract | DONE |
| Automated quality gate | DONE |
| Google Sheet source identified | DONE |
| Verified catalogue baseline | DONE — 145 SKUs / 8 categories |
| Typed catalogue/product contract | DONE |
| Central discount policy | DONE |
| Deterministic pricing engine | DONE |
| Header-based source parser | DONE |
| Base case + all discount tiers reconciled | DONE — 0 issues |
| Build-time verified catalogue snapshot | DONE |
| Direct current-sheet sync | DONE |
| Runtime rejection of incomplete live catalogue | DONE |
| Safe verified fallback | DONE |

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
| Printable/exportable quote | NEXT — optional |

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
| Dedicated OG image / app icons | NEXT — optional brand asset |

## QA / release readiness

| Item | Status |
| --- | --- |
| Typecheck | DONE |
| Unit tests | DONE — 33 |
| Preview integrity QA | DONE |
| Chromium desktop E2E | DONE |
| Chromium mobile E2E | DONE — 320 / 360 / 390 / 430 px |
| QA screenshot artifact | DONE |
| Playwright report artifact | DONE |
| Verified preview build artifact | DONE |
| Release-candidate artifact | DONE |
| Release checklist | DONE — `docs/RELEASE.md` |
| Rollback runbook | DONE — `docs/RELEASE.md` |
| Automatic Vercel branch preview | BLOCKED — current project history only shows Git deployments from `main` |
| Final approval | NEXT |

## Final gate

The exact final head commit must pass the complete `Quality Gate`, final screenshots must be reviewed, and approval must be explicit before `main` is changed.
