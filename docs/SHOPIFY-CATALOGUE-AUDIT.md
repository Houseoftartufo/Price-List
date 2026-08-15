# Shopify catalogue audit

Status: complete for the current verified Price List catalogue.

## Scope

The audit compares all 145 verified wholesale catalogue rows with the public House of Tartufo Shopify catalogue using:

- the verified Price List source snapshot;
- Shopify's public products feed;
- the official Shopify product sitemap;
- each discovered product's public `.js` endpoint;
- exact product family, format, percentage/line where applicable, and Shopify variant SKU.

No fuzzy or ambiguous match is allowed to surface a Shopify photo, description, ingredients or site SKU in the Price List.

## Result

- Catalogue rows audited: **145 / 145**
- Public Shopify products discovered: **15**
- Exact public Shopify variants verified and mapped: **22**
- Public related product exists but no exact public variant: **5**
- No exact public Shopify product/variant equivalent: **118**
- Ambiguous matches accepted: **0**

Every catalogue row remains clickable. A rich site-backed product sheet is shown only for an exact verified variant. All other rows show the verified wholesale catalogue specifications only.

## Exact verified mappings

| Catalogue code | Wholesale product | Format | Shopify handle | Site SKU |
| --- | --- | --- | --- | --- |
| 18 | Truffled Sauce – Summer Truffle 5% | 80g | black-truffle-sauce | 5430004174103 |
| 19 | Truffled Sauce – Summer Truffle 5% | 170g | black-truffle-sauce | 5430004174110 |
| 20 | Truffled Sauce – Summer Truffle 5% | 500g | black-truffle-sauce | 5430004174127 |
| 21 | Truffled Sauce – Summer Truffle 10% | 80g | black-truffle-sauce | 5430004174318 |
| 23 | Truffled Sauce – Summer Truffle 10% | 500g | black-truffle-sauce | 5430004174332 |
| 27 | White Truffled Sauce – Bianchetto Truffle 2% | 80g | white-truffle-sauce | 5430004174325 |
| 28 | White Truffled Sauce – Bianchetto Truffle 2% | 170g | white-truffle-sauce | 5430004174134 |
| 29 | White Truffled Sauce – Bianchetto Truffle 2% | 500g | white-truffle-sauce | 5430004174240 |
| 49 | Butter with Bianchetto Truffle 6% | 80g | white-truffle-butter | 5430004174486 |
| 50 | Butter with Bianchetto Truffle 6% | 160g | white-truffle-butter | 5430004174141 |
| 51 | Butter with Bianchetto Truffle 6% | 450g | white-truffle-butter | 5430004174264 |
| 58 | White Truffle Extra Virgin Olive Oil | 100ml | parfumed-white-truffle-extra-virgin-olive-oil | 5430004174493 |
| 59 | White Truffle Extra Virgin Olive Oil | 250ml | parfumed-white-truffle-extra-virgin-olive-oil | 5430004174547 |
| 61 | White Truffle Extra Virgin Olive Oil | 1000ml | parfumed-white-truffle-extra-virgin-olive-oil | 5430004174448 |
| 62 | White Truffle Extra Virgin Olive Oil | 5L | parfumed-white-truffle-extra-virgin-olive-oil | 5430004174035 |
| 64 | Black Truffle Extra Virgin Olive Oil | 100ml | black-truffle-extra-virgin-olive-oil | 5430004174530 |
| 65 | Black Truffle Extra Virgin Olive Oil | 250ml | black-truffle-extra-virgin-olive-oil | 5430004174455 |
| 66 | Black Truffle Extra Virgin Olive Oil | 5L | black-truffle-extra-virgin-olive-oil | 5430004174028 |
| 87 | Summer Truffle Carpaccio | 45g | summer-truffle-carpaccio | Product86 |
| 88 | Summer Truffle Carpaccio | 80g | summer-truffle-carpaccio | Product87 |
| 89 | Summer Truffle Carpaccio | 170g | summer-truffle-carpaccio | Product88 |
| 90 | Summer Truffle Carpaccio with Aroma | 500g | summer-truffle-carpaccio | Product89 |

## Related public product, but no exact public variant

These rows deliberately do **not** inherit a site SKU, photo or ingredients from a similar variant:

| Catalogue code | Wholesale product | Format | Reason |
| --- | --- | --- | --- |
| 2 | Tomato & Black Truffle Sauce | 170ml | Related sauce exists, but no exact matching Shopify variant |
| 22 | Truffled Sauce – Summer Truffle 10% | 170g | Product family exists, but the exact 170g / 10% public variant is absent |
| 57 | White Truffle Extra Virgin Olive Oil | 60ml | Public product exists, exact 60ml variant absent |
| 60 | White Truffle Extra Virgin Olive Oil | 500ml | Public product exists, exact 500ml variant absent |
| 63 | Black Truffle Extra Virgin Olive Oil | 60ml | Public product exists, exact 60ml variant absent |

## Runtime safety rule

`src/product-detail-map.ts` is the only allow-list for site-backed product details. The Quality Gate runs a fresh 145-row Shopify audit and then `verify:product-map` compares every `verified` audit row with this allow-list. The gate fails if:

- a verified catalogue row is missing from the map;
- a mapped handle differs from the audited Shopify handle;
- a mapped site SKU differs from the audited Shopify SKU;
- a row is mapped even though the current audit does not verify it.

At runtime, the site SKU is checked again against the live Shopify product response before remote photo, ingredients or description are exposed. Until verification completes, remote product content is hidden. This prevents both incorrect mappings and brief flashes of an unverified product image.

## Maintenance

Run:

```bash
npm run audit:shopify
npm run verify:product-map
```

The audit also produces `qa-shopify-audit/catalogue-shopify-audit.json` and `.csv`. CI uploads these as the `price-list-shopify-catalogue-audit` artifact for each protected release check.
