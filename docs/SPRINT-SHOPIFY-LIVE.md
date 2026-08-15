# Sprint — Shopify Live Source

## Goal

Use Shopify Admin as a live enrichment and verification layer for the House of Tartufo B2B Price List without making Shopify the commercial source of truth.

## Source-of-truth hierarchy

1. `Master_file_prodotti.xlsx` → official product identity, SKU, barcode, case pack and technical specifications.
2. B2B Google Sheet → wholesale base price only, and only when product + format resolves to one official master row.
3. Shopify Admin GraphQL API → live product status, variants, images, public URL, description and explicitly allowed metafields.
4. Static Shopify map → public-verified image/link fallback only when the Admin API is unavailable.

Shopify must never silently overwrite the master SKU, barcode, case pack or B2B price.

## Implemented

- Vercel function: `GET /api/shopify-products`
- Shopify Admin GraphQL API version: `2026-07`
- Minimum required Shopify scope: `read_products`
- Reads ACTIVE, DRAFT and ARCHIVED master products through Admin API.
- Paginates the product catalogue.
- Matches variants to the Price List by exact official SKU.
- Returns only products/variants whose SKU exists in the official 55-SKU master.
- Returns product/variant images, status, handle, online-store URL, retail price metadata and selected options.
- Product/variant metafields are queried but exposed only through an explicit allowlist.
- Client-side enrichment is fail-safe: master content renders immediately; Shopify is optional.
- Draft products can supply live images but never receive a fake public storefront link.
- Barcode mismatches are logged and never overwrite the master barcode.
- CDN response cache: 120 seconds + stale-while-revalidate 600 seconds.

## Vercel environment variables

Required:

- `SHOPIFY_SHOP_DOMAIN` — exact `*.myshopify.com` store domain.

Authentication option A:

- `SHOPIFY_ADMIN_ACCESS_TOKEN`

Authentication option B (Dev Dashboard client credentials):

- `SHOPIFY_CLIENT_ID`
- `SHOPIFY_CLIENT_SECRET`

Optional:

- `SHOPIFY_METAFIELD_ALLOWLIST`
  - comma-separated `namespace.key` rules
  - `custom.*` exposes every key in the `custom` namespace
  - `*` exposes every queried product/variant metafield and should only be used if all metafields are safe for the B2B Price List response

Secrets must exist only in Vercel/server environment variables and must never be committed or sent to the browser.

## Failure behaviour

If Shopify is not configured, rate-limited, unreachable, or returns an API error:

- `/api/shopify-products` returns an unavailable response;
- the buyer catalogue continues to work;
- master technical data remains visible;
- public-verified static image fallbacks remain available where known;
- wholesale pricing is unaffected.

## Next gate

1. Configure Shopify credentials in the Price List Vercel project.
2. Set the exact `SHOPIFY_SHOP_DOMAIN`.
3. Start with `read_products` only.
4. Inspect real metafield namespaces/keys returned by Shopify Admin.
5. Add only required safe fields to `SHOPIFY_METAFIELD_ALLOWLIST`.
6. Verify `matchedSkus` / `missingMasterSkus` against all 55 master SKUs.
7. Test ACTIVE + DRAFT products in desktop and mobile product detail UI.
8. Merge only after full Price List quality gate passes.
