# HOT Price List API

Isolated Cloudflare backend for the House of Tartufo Price List.

## Hard boundaries

- This service belongs only to `Houseoftartufo/Price-List`.
- It has no dependency on Revenue OS.
- It does not modify or reuse the existing `billit-invoice-worker` runtime.
- The existing Price List remains functional while this service is developed behind a feature flag.

## Authorities

- Billit: B2B commercial identity, reference/SKU, official name, `AmountExcl`, VAT, unit, quotation document.
- Shopify: stock/availability, media, ecommerce content, variants, pack/logistic metadata, translations.
- Cloudflare D1: verified read model, quote snapshots, idempotency and operational state. It is not a commercial source of truth.
- Attio: CRM projection for Person, Company and Deal after a quote request is accepted.

## Universal key

`Billit.Reference === Shopify.Variant.SKU`

No product-name or fuzzy matching is allowed.

## Public safety boundary

The browser never receives Billit credentials, Shopify Admin credentials, provider internal IDs, raw inventory quantities unless explicitly approved, or provider internal information.

The browser submits only customer details, locale, preferred contact channel, SKU and case quantity. Prices are recalculated server-side from the current Billit `AmountExcl` and the HOT volume-discount policy.

## Quote lifecycle

1. Validate request.
2. Resolve every SKU against the canonical catalogue.
3. Hard-refresh/revalidate fiscal price from Billit before accepting the quote.
4. Recheck Shopify availability.
5. Calculate deterministic B2B prices.
6. Persist immutable quote snapshot in D1 using an idempotency key.
7. Return `ACCEPTED` with a `HOT-Q-*` reference.
8. Enqueue independent Billit, Attio and admin jobs.
9. Open WhatsApp/email only after acceptance on the frontend.

Provider failures must never discard an accepted quote.

## Languages

First-class locale contract: `en | fr | it | nl | de`.

## Rollout

The current Google Sheet/runtime catalogue is not removed until Billit + Shopify coverage reaches verified parity and the existing regression suite stays green. Migration is additive and reversible.
