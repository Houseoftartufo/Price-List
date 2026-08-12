# Price List 10x — Sprint Board

Last updated: 2026-08-12

Legend: `DONE` · `IN PROGRESS` · `NEXT` · `BLOCKED`

## Sprint 0 — Safety & Baseline

| Item | Status |
| --- | --- |
| Create isolated development branch | DONE |
| Keep `main` / production untouched | DONE |
| Document master plan and quality gates | DONE |
| Document canonical data contract | DONE |
| Record confirmed P0/P1 risks | DONE |
| Add typed toolchain without replacing current UI | DONE |
| Add automated quality workflow | DONE |
| Identify exact live Google Sheet source | DONE |
| Record source SKU/category baseline | DONE — 145 SKUs / 8 categories |
| Create visual regression baseline set | IN PROGRESS |

## Sprint 1 — Data & Pricing Core

| Item | Status |
| --- | --- |
| Canonical catalogue/product types | DONE |
| Central discount policy | DONE |
| Deterministic pricing engine | DONE |
| Unit/case/subtotal/saving mathematical consistency | DONE |
| Catalogue validation guards | DONE |
| Header-based CSV parser | DONE |
| Price-source adapter independent of column positions | DONE |
| Pricing unit tests | DONE |
| Validation tests | DONE |
| Price-source parser tests | DONE |
| Inspect exact live Sheet schema | DONE |
| Parse source category separator rows | DONE |
| Normalize `Qty/Box` for all source SKUs | DONE |
| Reconcile source base case price across all SKUs | DONE — 0 issues |
| Reconcile all five source discount columns | DONE — 0 issues |
| Build-time verified catalogue snapshot generator | DONE |
| Build-time verified translation snapshot generator | DONE |
| Derive product/category count instead of hardcoding | DONE |
| Add live freshness/stale/fallback catalogue service | IN PROGRESS |
| Reconcile legacy HTML SKUs/prices against source | IN PROGRESS |
| Connect new preview UI to verified engine | IN PROGRESS |
| Remove independent hardcoded `box-price` authority from replacement UI | IN PROGRESS |

## Sprint 2 — i18n Rebuild

| Item | Status |
| --- | --- |
| Audit source translation sheet | DONE |
| Verify duplicate source keys | DONE — 0 duplicates |
| Verify EN/IT/FR/NL coverage | DONE — 107/107 complete |
| Override wrong hardcoded catalogue count | DONE in generated snapshot |
| Build locale loader/state | IN PROGRESS |
| Migrate UI to semantic translation usage | IN PROGRESS |
| Remove legacy key collisions from replacement UI | IN PROGRESS |
| Persist locale and update document language | NEXT |

Known legacy issues being removed rather than preserved:

- Natural Line group-key inversion;
- duplicated `cat07.group4` semantics;
- Pure Cream / Carpaccio / Minced group collisions;
- hardcoded 9-category cover statement.

## Sprint 3 — Catalogue Information Architecture

| Item | Status |
| --- | --- |
| Separate new preview from legacy `index.html` | IN PROGRESS |
| Premium compact hero | IN PROGRESS |
| Search by SKU/name/format | IN PROGRESS |
| Persistent category navigation | IN PROGRESS |
| Line/truffle filters | IN PROGRESS |
| Desktop data table | IN PROGRESS |
| Mobile product-card layout | IN PROGRESS |
| Deep-link product/category state | NEXT |

## Sprint 4 — Dynamic Wholesale Pricing UX

| Item | Status |
| --- | --- |
| Quantity selector per product | IN PROGRESS |
| Active tier indicator | IN PROGRESS |
| Derived unit/case/subtotal/saving | IN PROGRESS |
| Tier ladder 1/2/3/5/10/15 | NEXT |

## Sprint 5 — Quote & Conversion

| Item | Status |
| --- | --- |
| Add to Quote | IN PROGRESS |
| Persistent quote basket | IN PROGRESS |
| Quote recalculation from verified catalogue | IN PROGRESS |
| WhatsApp request generation | IN PROGRESS |
| Copy order | IN PROGRESS |
| Email request | NEXT |
| Printable/exportable quote | NEXT |

## Sprint 6+ — Hardening order

1. Mobile + accessibility QA
2. Performance optimization
3. SEO/share/trust metadata
4. Analytics funnel
5. Visual regression + E2E
6. Release hardening and production approval

## Merge rule

No merge to `main` until:

- pricing reconciliation is complete;
- automated checks pass;
- preview is visually approved;
- mobile QA passes;
- i18n regression checks pass;
- explicit production approval is given.
