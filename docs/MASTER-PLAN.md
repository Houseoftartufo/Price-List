# House of Tartufo — Price List 10x Master Plan

Status: ACTIVE  
Branch: `codex/price-list-10x`  
Production branch: `main` — DO NOT MODIFY until final QA/approval  
Primary objective: turn the current premium presentation-style catalogue into a production-grade B2B sales tool without losing the House of Tartufo visual identity.

## North Star

The product must feel like a luxury digital wholesale catalogue while behaving like a fast professional procurement tool.

A buyer must be able to:

1. understand the offer immediately;
2. find any SKU/product/format in seconds;
3. see trustworthy unit/case/tier pricing;
4. understand MOQ and discount logic without calculations;
5. build a quote/order request;
6. send it through WhatsApp/email without copying data manually;
7. use the catalogue reliably on desktop and mobile;
8. trust that prices and translations are current and verified.

## Non-negotiable constraints

- `main` and the current live deployment remain untouched until approval.
- Existing House of Tartufo brand identity is preserved and refined, not replaced with a generic SaaS design.
- Pricing correctness has priority over visual changes.
- One source of truth for catalogue data.
- All commercial calculations are deterministic and testable.
- No silent data failures.
- Every major change is previewed and QA-tested before merge.

## Current baseline

Current repository architecture:

- one `index.html` of approximately 172 KB;
- HTML, CSS, JavaScript, translations and embedded image assets in the same file;
- static product fallback data in HTML;
- live unit/best-price override from public Google Sheets CSV;
- presentation/slides navigation;
- EN / IT / FR / NL language selector;
- fixed discount tiers;
- WhatsApp and website CTA.

### Confirmed critical risks

**P0 — pricing integrity**

The live sync updates `€/unit` and `Best` values but existing `€/box` values are independently hardcoded. A price update can therefore create inconsistent prices on the same product row.

**P0 — brittle sheet parsing**

Google Sheet values are read by numeric CSV column positions. Inserting or reordering spreadsheet columns can silently map the wrong field.

**P0 — silent failure**

Fetch/parsing errors are swallowed. The user cannot know whether prices are current or fallback values.

**P0 — i18n semantic collisions**

Several translation keys are reused or mapped to different product groups. Changing language can render incorrect category/group names.

**P1 — catalogue count inconsistency**

The cover states 9 product categories while the active product navigation/data structure exposes 8 categories.

**P1 — B2B retrieval friction**

The product is designed primarily as an 11-slide presentation. Search, filtering and direct SKU retrieval are missing.

**P1 — mobile/accessibility**

Nested fixed navigation, hidden body overflow, non-semantic clickable divs, low-contrast decorative text and continuous motion reduce usability and accessibility.

## Target quality gates

| Domain | Target |
| --- | --- |
| Brand / Visual | Premium House of Tartufo identity preserved; consistent design system |
| Pricing integrity | 100% deterministic, one source of truth, validated before render |
| Data quality | Schema validation + freshness metadata + fallback state |
| UX | Any known SKU/product retrievable in <10 seconds |
| Search | Search by SKU, product, category, truffle type and format |
| Pricing UX | Quantity tier automatically calculates unit/case/total/saving |
| Quote flow | Build and send a multi-product quote request without manual transcription |
| Mobile | Fully usable at 320px+ without clipped data or inaccessible controls |
| Accessibility | WCAG 2.2 AA target for primary flows |
| Performance | LCP <2.5s, CLS <0.1, INP <200ms target on production data |
| SEO/share | Complete metadata, OG preview, canonical, structured data |
| Analytics | Catalogue → search → SKU → quote → outbound conversion measurable |
| QA | Unit + schema + E2E + accessibility + visual regression guards |
| Maintainability | Modular codebase, no catalogue logic embedded in one HTML file |

# Delivery plan

## Sprint 0 — Safety, baseline and source-of-truth map

Goal: create an irreversible-safe working environment before changing behaviour.

Deliverables:

- dedicated development branch;
- production freeze rule documented;
- architecture audit and risk register;
- SKU/data field inventory;
- current Google Sheet dependency map;
- desktop/mobile baseline screenshots;
- expected commercial formulas documented;
- initial regression checklist.

Definition of Done:

- `main` unchanged;
- all current catalogue data fields documented;
- P0 defects have reproducible cases;
- future releases have explicit QA gates.

## Sprint 1 — Catalogue data contract + pricing engine

Goal: make commercial data correct before redesigning the UI.

Deliverables:

- typed `Product` schema;
- typed `Catalogue` schema;
- field-name based CSV adapter instead of numeric indexes;
- deterministic price calculation functions;
- case price derived from unit price × units per case;
- volume tier calculation from one central policy;
- freshness/version metadata;
- validation errors surfaced explicitly;
- fallback to last verified catalogue snapshot;
- tests for all commercial calculations.

Definition of Done:

- one canonical unit price per SKU;
- case price cannot diverge mathematically;
- every discount tier can be reproduced by tests;
- malformed data cannot silently reach the UI.

## Sprint 2 — Internationalisation rebuild

Goal: make all supported languages semantically correct and scalable.

Deliverables:

- translation files separated from UI code;
- unique semantic translation keys;
- no duplicate/colliding product-group keys;
- EN / FR / NL / IT coverage validation;
- locale persistence;
- correct `<html lang>` updates;
- translated UI labels, commercial notes and pricing terminology;
- missing-key test.

Definition of Done:

- 100% required translation coverage;
- zero semantic key collisions;
- no language change can alter product meaning.

## Sprint 3 — Catalogue information architecture

Goal: evolve from slideshow navigation into a buyer-oriented catalogue workspace.

Deliverables:

- premium hero retained;
- clear entry actions: Browse / Search / Request Quote;
- persistent category navigation;
- full catalogue view;
- search by SKU/name/format;
- filters by category, line, truffle type, format and relevant attributes;
- deep links to category/SKU;
- desktop table model;
- mobile product-card model.

Definition of Done:

- a buyer can find a known SKU in <10 seconds;
- direct links open the intended catalogue state;
- all products are accessible without stepping through slides.

## Sprint 4 — Dynamic wholesale pricing UX

Goal: turn discount rules into immediate commercial information.

Deliverables:

- quantity/case selector;
- active tier indicator;
- unit price after discount;
- case price after discount;
- order subtotal;
- absolute saving and saving percentage;
- discount ladder 1/2/3/5/10/15 boxes;
- consistent monetary formatting.

Definition of Done:

- buyer never has to manually calculate a tier price;
- all displayed values come from the tested pricing engine.

## Sprint 5 — Quote basket and conversion engine

Goal: convert catalogue browsing into actionable B2B enquiries.

Deliverables:

- Add to Quote per SKU;
- persistent quote basket;
- quantity editing;
- quote totals;
- remove/clear controls;
- prefilled WhatsApp request containing SKU, product, quantity and pricing context;
- prefilled email request;
- Copy Order action;
- optional printable/exportable quote view.

Definition of Done:

- multi-SKU request can be sent without copying data manually;
- outbound request preserves commercial context.

## Sprint 6 — Mobile and accessibility hardening

Goal: professional usability on all devices and input methods.

Deliverables:

- semantic buttons/links;
- keyboard navigation and focus states;
- ARIA only where needed;
- inactive content removed from accessibility flow;
- `prefers-reduced-motion` behaviour;
- AA contrast corrections;
- 44px+ primary touch targets;
- no horizontal clipping at 320/360/390/430 widths;
- mobile-first catalogue cards;
- removal of problematic nested scroll patterns.

Definition of Done:

- primary buyer journey is keyboard and touch usable;
- WCAG AA issues in main flows resolved.

## Sprint 7 — Performance engineering

Goal: luxury feel without artificial delay or unnecessary rendering cost.

Deliverables:

- remove fixed 2.1s loader delay;
- extract/cache logo assets;
- motion budget;
- lazy-init decorative canvas effects;
- pause animation when hidden/off-screen;
- font loading optimisation;
- cache strategy for catalogue data;
- production asset minification.

Definition of Done:

- performance targets met in realistic production conditions;
- reduced-motion devices receive a lightweight experience.

## Sprint 8 — SEO, sharing and trust

Goal: make catalogue links professional when indexed or shared.

Deliverables:

- title and description strategy;
- canonical URL;
- OpenGraph metadata/image;
- social card metadata;
- favicon/application icons;
- Organization structured data;
- visible catalogue `Last verified` timestamp;
- clear ex-VAT / shipping / Incoterm notes.

Definition of Done:

- catalogue link produces a professional social/WhatsApp preview;
- buyer can see data freshness and commercial terms.

## Sprint 9 — Analytics and commercial intelligence

Goal: measure buyer intent instead of operating blind.

Events:

- catalogue_open;
- category_view;
- search;
- filter_apply;
- sku_view;
- quantity_change;
- tier_reached;
- add_to_quote;
- quote_open;
- whatsapp_click;
- email_click;
- quote_submit/export.

Definition of Done:

- the full buyer funnel is measurable without storing unnecessary personal data.

## Sprint 10 — QA, CI/CD and release hardening

Goal: make regressions difficult to ship.

Deliverables:

- schema tests;
- pricing unit tests;
- translation coverage tests;
- Playwright E2E buyer flows;
- accessibility checks;
- visual regression baselines;
- Lighthouse CI targets;
- GitHub Actions quality gate;
- Vercel PR preview workflow;
- release checklist;
- rollback procedure.

Definition of Done:

- a pricing, i18n or buyer-flow regression fails CI before production;
- release can be rolled back safely.

# Product architecture target

Recommended stack: Vite + TypeScript + modular CSS with a small serverless catalogue adapter.

```text
Price-List/
├── api/
│   └── catalog.ts
├── src/
│   ├── catalog/
│   │   ├── schema.ts
│   │   ├── pricing.ts
│   │   ├── adapter.ts
│   │   └── catalogue-client.ts
│   ├── i18n/
│   ├── components/
│   ├── analytics/
│   ├── styles/
│   └── main.ts
├── public/
├── tests/
├── docs/
├── index.html
├── package.json
└── vercel.json
```

This is intentionally not a heavy application architecture. The objective is high reliability, high performance and low maintenance cost.

# Source of truth policy

The UI must never own commercial truth.

Canonical flow:

```text
Commercial source
      ↓
Catalogue adapter
      ↓
Schema validation
      ↓
Normalised catalogue model
      ↓
Pricing engine
      ↓
UI / Quote / Analytics
```

The UI may display a verified snapshot when the live source is unavailable, but it must clearly expose freshness state.

# Release strategy

1. Build only on `codex/price-list-10x` or short-lived child branches.
2. Keep live catalogue unchanged during Sprints 0–5.
3. Deploy preview for device and commercial QA.
4. Run automated + manual QA.
5. Compare against current production catalogue.
6. Obtain explicit approval.
7. Merge through PR only when quality gates pass.
8. Keep immediate rollback path to the existing production version.

# Success criteria

The project is considered 10x-ready only when:

- pricing has a single validated source of truth;
- no known i18n collision remains;
- search/filter/direct SKU navigation is production-ready;
- wholesale tiers calculate automatically;
- quote basket works end to end;
- mobile and accessibility QA pass;
- production performance targets are met;
- analytics cover the buyer funnel;
- CI blocks catalogue-data regressions;
- the visual result still unmistakably feels like House of Tartufo.
