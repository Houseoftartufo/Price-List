# Catalogue Data Contract

Status: Sprint 1 / P0 — VERIFIED AGAINST LIVE SOURCE  
Purpose: define the only model allowed to reach pricing, UI and quote flows.

## Verified commercial source

Google Sheet: `HOT_PriceList_DataSheet_2026`  
Spreadsheet ID: `1qqOv6i2UrZZwtbW8awMzawBNs8f9UblGoL25QZf3u94`

Tabs used by the catalogue:

- `PRODUCTS` — commercial product and pricing source;
- `TRANSLATIONS` — EN / IT / FR / NL catalogue copy;
- `HOW TO USE` — operational documentation only.

Verified source state on 2026-08-12:

- 145 product SKUs;
- 8 product categories;
- 107 translation keys;
- 100% translation coverage for EN / IT / FR / NL;
- zero duplicate translation keys;
- zero mathematical mismatches across base case price and all five discount check columns.

## Principles

- Product code/SKU is the stable primary key.
- Prices are numeric values in EUR, never preformatted strings inside the application.
- `baseUnitPrice` is the only authoritative monetary product input.
- `unitsPerCase` is authoritative packaging data.
- Case prices are derived from unit price × units per case.
- Tier prices are derived from the central discount policy.
- Existing source `€/box` and tier-price columns are treated as reconciliation/check columns, not independent authorities.
- Missing or malformed commercial fields fail validation.
- Source fields are mapped by normalized header names/aliases, never by fixed column number.
- Category identity is derived from the source section separator preceding each product row.
- Product groups are application taxonomy/enrichment and are not required source-sheet columns.
- Every catalogue payload carries version/freshness metadata.
- No invalid live payload may replace a previously verified catalogue.

## Exact verified PRODUCTS source schema

The current `PRODUCTS` sheet header is:

```text
Code
Product Name
Shelf Life
Weight/Vol
Qty/Box
€/unit (base)
€/box (base)
−5%/unit
−10%/unit
−15%/unit
−20%/unit
−25%/unit (Best)
```

Category separator rows are currently:

```text
── SAUCES & CONDIMENTS
── OILS
── BUTTERS
── PURE CREAMS & CARPACCIO
── BRINE & WHOLE TRUFFLES
── SALTS & HONEY
── PASTA, RICE & MEALS
── NATURAL LINE
```

A product row cannot be accepted until a recognized section separator has established its category.

## Canonical Product

```ts
export interface Product {
  sku: string;
  categoryId: string;
  groupId: string;
  name: string;
  sizeLabel: string;
  baseUnitPrice: number;
  unitsPerCase: number;
  currency: 'EUR';

  truffleType?: 'white' | 'black' | 'summer' | 'bianchetto' | 'mixed' | 'none';
  line?: 'standard' | 'natural';
  shelfLifeMonths?: number;
  percentageLabel?: string;
  flavour?: string;
  active?: boolean;
}
```

`groupId` is initially allowed to equal `categoryId` during migration. It will be enriched in the catalogue taxonomy sprint without changing SKU identity or pricing.

## Canonical Catalogue

```ts
export interface Catalogue {
  schemaVersion: 1;
  catalogueVersion: string;
  currency: 'EUR';
  updatedAt: string;
  verifiedAt: string;
  source: 'google-sheet' | 'snapshot';
  freshness: 'fresh' | 'stale' | 'fallback';
  products: Product[];
  discountPolicy: DiscountTier[];
  sourceMeta?: {
    spreadsheetId: string;
    sheet: string;
    sourceRowCount: number;
    categoryCount: number;
  };
}
```

## Discount Policy

```ts
export interface DiscountTier {
  minCases: number;
  discountRate: number;
}

export const DISCOUNT_POLICY: DiscountTier[] = [
  { minCases: 1, discountRate: 0 },
  { minCases: 2, discountRate: 0.05 },
  { minCases: 3, discountRate: 0.10 },
  { minCases: 5, discountRate: 0.15 },
  { minCases: 10, discountRate: 0.20 },
  { minCases: 15, discountRate: 0.25 },
];
```

The active tier is the highest tier whose `minCases <= requestedCases`.

## Pricing formulas

Given:

- `P` = base unit price;
- `U` = units per case;
- `Q` = requested cases;
- `D` = active discount rate.

```text
baseUnitPrice       = roundToCents(P)
discountedUnitPrice = roundToCents(baseUnitPrice × (1 − D))
baseCasePrice       = roundToCents(baseUnitPrice × U)
discountedCasePrice = roundToCents(discountedUnitPrice × U)
subtotal            = roundToCents(discountedCasePrice × Q)
baseSubtotal        = roundToCents(baseCasePrice × Q)
saving              = roundToCents(baseSubtotal − subtotal)
```

### Rounding policy

The buyer-facing unit price is rounded to cents first. Case price and subtotal are then derived from that rounded unit price.

This is intentional: every number visible in the UI must remain mathematically reproducible from the other visible numbers. A buyer must never see a displayed unit price whose multiplication produces a contradictory displayed case total.

The Google Sheet's existing base-case and discount columns remain useful as source-integrity checks. A build fails if those source check values cease to match their deterministic formula.

## Packaging verification

`Qty/Box` was verified across the complete source and is not assumed to be 12.

Known examples include 1, 4, 6, 12 and 24 units per case. The UI and pricing engine must therefore always consume `unitsPerCase` per SKU rather than applying a global box quantity.

## Validation rules

A product is invalid when any of the following is true:

- SKU is empty or non-product content is presented as a SKU;
- duplicate SKU exists;
- product appears before a recognized source category section;
- base unit price is non-numeric, zero or negative;
- units per case is not a positive integer;
- required name or size field is missing;
- currency is not EUR for this catalogue version.

Catalogue-level validation additionally rejects:

- missing required metadata;
- duplicate discount tiers;
- non-monotonic discount tiers;
- discount rates below 0 or >= 1;
- empty product collection.

Source reconciliation additionally rejects:

- source `€/box (base)` that differs from `baseUnitPrice × Qty/Box`;
- any source discount-unit value that differs from the central discount policy after cent rounding.

## Freshness states

### `fresh`

The live commercial source was fetched, parsed, reconciled and validated successfully during the current session.

### `stale`

A previously verified client-side catalogue is being used because the live source could not be refreshed. The UI must show this state and the verification timestamp.

### `fallback`

The live source and acceptable cached source are unavailable, so the application serves the last build-time verified snapshot.

The UI must never hide `stale` or `fallback` state.

## Error policy

Forbidden:

```ts
catch (error) {}
```

Required behaviour:

1. preserve the last known verified catalogue;
2. emit a structured diagnostic error;
3. expose catalogue freshness state to the UI;
4. prevent invalid new values from replacing verified data;
5. continue only with clearly identified verified stale/fallback data.

## Internationalisation separation

Commercial product identity and translation strings are separate concerns.

Stable data example:

```text
categoryId: sauces-condiments
sku: 1
```

Presentation translation example:

```text
nav.slide2
product.1.name
```

No translation key may represent two different UI/commercial concepts in the new UI. The source translation sheet is validated for duplicate keys and complete EN/IT/FR/NL coverage during the snapshot build.

Product names remain the commercial source names during the initial migration; localized product-name enrichment may be introduced later without changing SKU identity.

## Quote line contract

```ts
export interface QuoteLine {
  sku: string;
  cases: number;
}
```

Price values are always recalculated from the currently verified catalogue and pricing policy. The quote basket must not persist calculated prices as authoritative values.

## Migration rule from current HTML

The legacy `index.html` remains an untouched visual baseline on the development branch while the new preview is built separately.

Legacy HTML prices are comparison data only. They are not allowed to become an independent authority in the new catalogue.

Before production replacement:

- every legacy-visible SKU must be reconciled against the verified 145-SKU source;
- legacy case-price discrepancies must be documented and eliminated in the new UI;
- the new preview must use only the canonical catalogue pipeline.
