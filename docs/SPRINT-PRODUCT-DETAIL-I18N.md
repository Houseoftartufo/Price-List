# Sprint — Product detail localization integrity

Status: IN PROGRESS

Goal: when the buyer changes EN / IT / FR / NL and opens a product detail card, every customer-facing product-detail field must be rendered in the selected language without mixed-language content.

## Scope

- Keep SKU, barcode, size, case pack, pricing and other commercial master data unchanged.
- Resolve localized product title and rich product content from Shopify translations.
- Keep the existing verified Excel master as the commercial source of truth.
- Localize UI labels for ingredients, allergens, usage, storage, product information and nutrition.
- Localize fact labels and simple values such as Italy / shelf-life units / no-allergen values.
- Keep the product source link on the selected storefront locale.
- Separate cache entries by locale so changing language can never reuse stale content from another language.
- Preserve the quote CTA and the current product-detail layout.

## Safety model

The existing `/api/shopify-products` endpoint is not changed by this sprint. Localized content is fetched through an isolated endpoint. If Shopify translation access is unavailable, the core catalogue, pricing and quote flow continue to work normally.

## QA gate

- EN detail card contains no Italian master-copy leak.
- FR Summer Truffle Carpaccio uses the Shopify French title/content and French fact labels.
- IT detail card uses Italian content and labels.
- NL detail card uses Dutch content and labels.
- Switching locale and reopening a card cannot show stale content from the previous locale.
- Quote CTA remains functional after localization.
- Desktop and mobile Playwright buyer journeys pass before merge.
