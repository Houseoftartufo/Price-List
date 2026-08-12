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
| Add automated quality workflow | IN PROGRESS |
| Create current SKU reconciliation dataset | NEXT |
| Create visual regression baseline set | NEXT |

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
| Inspect exact live Sheet schema | IN PROGRESS |
| Reconcile all current HTML SKUs against source | NEXT |
| Normalise `unitsPerCase` for every SKU | NEXT |
| Build verified catalogue snapshot | NEXT |
| Add freshness/fallback service | NEXT |
| Connect current preview UI to new verified engine | NEXT |
| Remove independent hardcoded `box-price` authority | NEXT |

## Sprint 2 — i18n Rebuild

Status: NEXT after Sprint 1 data reconciliation.

Priority fixes already identified:

- Natural Line group-key inversion;
- duplicated `cat07.group4` semantics;
- Pure Cream / Carpaccio / Minced group collisions;
- category-count consistency;
- semantic ID model for categories/groups/products.

## Sprint 3+ — Product Transformation

Scheduled order:

1. Catalogue information architecture
2. Search + filters + deep links
3. Dynamic wholesale pricing UI
4. Quote basket and conversion engine
5. Mobile + accessibility hardening
6. Performance optimisation
7. SEO/share/trust metadata
8. Analytics funnel
9. Full QA/CI/release hardening

## Merge rule

No merge to `main` until:

- pricing reconciliation is complete;
- automated checks pass;
- preview is visually approved;
- mobile QA passes;
- i18n regression checks pass;
- explicit production approval is given.
