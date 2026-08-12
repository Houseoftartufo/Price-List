# Catalogue Data Contract

Status: Sprint 1 / P0  
Purpose: define the only model allowed to reach pricing, UI and quote flows.

## Principles

- Product code/SKU is the stable primary key.
- Prices are numeric values in EUR, never preformatted strings.
- `casePrice` is derived from `baseUnitPrice * unitsPerCase`; it is not an independent source field.
- Tier prices are derived from the central discount policy; they are not copied into product rows.
- Missing or malformed commercial fields must fail validation.
- Unknown source columns must be ignored safely.
- Source fields are mapped by header name/alias, never by fixed column number.
- Every catalogue payload carries version/freshness metadata.

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
}
```

## Discount Policy

Current commercial policy:

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
baseCasePrice       = P × U
discountedUnitPrice = P × (1 − D)
discountedCasePrice = discountedUnitPrice × U
subtotal            = discountedCasePrice × Q
baseSubtotal        = baseCasePrice × Q
saving               = baseSubtotal − subtotal
```

### Rounding policy

Commercial display values are rounded to 2 decimal places using standard decimal rounding at the presentation boundary.

Internal calculations must use numeric values and should avoid repeatedly rounding intermediate values.

## Required source headers

The adapter must resolve fields by normalised headers and aliases.

Minimum required source concepts:

| Canonical field | Accepted header examples |
| --- | --- |
| `sku` | `Code`, `SKU`, `Product Code` |
| `name` | `Product`, `Product Name`, `Name` |
| `baseUnitPrice` | `Unit Price`, `Price / Unit`, `€/unit`, `Standard Price` |
| `unitsPerCase` | `Units / Box`, `Units per Case`, `Case Qty`, `Box Qty` |
| `sizeLabel` | `Size`, `Format`, `Weight` |
| `categoryId` | `Category`, `Category ID` |
| `groupId` | `Group`, `Product Group`, `Group ID` |

Optional aliases may be expanded only in the adapter. The rest of the application must never know spreadsheet column positions.

## Validation rules

A product is invalid when any of the following is true:

- SKU is empty;
- duplicate SKU exists;
- base unit price is non-numeric, zero or negative;
- units per case is not a positive integer;
- category/group is missing;
- required name or size field is missing;
- currency is not EUR for this catalogue version.

Catalogue-level validation must additionally reject:

- missing metadata;
- duplicate discount tiers;
- non-monotonic discount tiers;
- discount rates below 0 or >= 1;
- empty product collection.

## Freshness states

### `fresh`
Live commercial source was fetched, parsed and validated successfully during the current freshness window.

### `stale`
A previously validated live payload is being used beyond the normal freshness window but is still inside the allowed stale window.

### `fallback`
The live source failed and the application is serving the last committed/verified snapshot.

The UI must never hide `stale` or `fallback` state.

## Error policy

Forbidden:

```ts
catch (error) {}
```

Required behaviour:

1. preserve the last known verified catalogue;
2. log a structured error;
3. expose catalogue freshness state;
4. prevent invalid new values from replacing verified data;
5. allow the buyer to continue only with clearly identified verified fallback data.

## i18n separation

Product commercial identity and translation strings are separate concerns.

Stable data:

```text
categoryId: sauces-condiments
groupId: black-truffle-sauces
sku: 1
```

Presentation translation:

```text
category.sauces-condiments.title
product.1.name
```

No translation key may be reused to represent two different commercial entities.

## Quote line contract

```ts
export interface QuoteLine {
  sku: string;
  cases: number;
}
```

Price values are always recalculated from the current verified catalogue and pricing policy. The quote basket must not persist stale calculated prices as authoritative values.

## Migration rule from current HTML

During migration, current HTML prices are treated only as a bootstrap snapshot for reconciliation. After Sprint 1 migration is complete, HTML must not contain an independent authoritative price copy.

Before the new engine replaces current behaviour, every SKU must be reconciled against the existing catalogue and commercial source with a generated discrepancy report.
