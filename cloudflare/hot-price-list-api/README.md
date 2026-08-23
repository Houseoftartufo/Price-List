# HOT Price List API

Isolated Cloudflare backend for the House of Tartufo Price List.

## Hard boundaries

- This service belongs only to `Houseoftartufo/Price-List`.
- It has no dependency on Revenue OS.
- It does not modify or reuse the existing `billit-invoice-worker` runtime.
- The existing Price List remains functional while this service is developed behind a feature flag.
- `QUOTE_ENGINE_ENABLED` remains `false` until shadow QA and an explicit cutover decision.

## Authorities

- Billit: B2B commercial identity, reference/SKU, official name, `AmountExcl`, VAT, unit, quotation document.
- Shopify: stock/availability, media, ecommerce content, variants, pack/logistic metadata, translations.
- Cloudflare D1: verified read model, quote snapshots, idempotency and operational state. It is not a commercial source of truth.
- Attio: CRM projection for Person, Company and Deal after a quote request is accepted.

## Universal key

`Billit.Reference === Shopify.Variant.SKU`

No product-name or fuzzy matching is allowed.

## Public safety boundary

The browser never receives Billit credentials, Shopify Admin credentials, Attio credentials, provider internal IDs, raw inventory quantities unless explicitly approved, or provider internal information.

The browser submits only customer details, locale, preferred contact channel, SKU, case quantity and a single-use Cloudflare Turnstile token. Prices are recalculated server-side from the current Billit `AmountExcl` and the HOT volume-discount policy.

New quotation requests fail closed unless Turnstile is fully configured. The Worker validates the token using Cloudflare Siteverify and requires both:

- `action === quote_request`
- `hostname` in the explicit `TURNSTILE_HOSTNAMES` allowlist

The Turnstile sitekey is public frontend configuration (`VITE_HOT_TURNSTILE_SITE_KEY`). The secret is server-only (`TURNSTILE_SECRET`) and must be stored as a Cloudflare Worker secret. The shadow GitHub workflow reads it only from the repository secret `PRICE_LIST_TURNSTILE_SECRET` and uploads it with `wrangler secret bulk`.

## Quote lifecycle

1. Validate request.
2. Resolve an existing idempotency key, or validate the new request's Turnstile token.
3. Resolve every SKU against the canonical catalogue.
4. Hard-refresh/revalidate fiscal price from Billit before accepting the quote.
5. Recheck Shopify availability.
6. Calculate deterministic B2B prices.
7. Persist immutable quote snapshot in D1 using an idempotency key.
8. Return `ACCEPTED` with a `HOT-Q-*` reference.
9. Enqueue independent Billit, Attio and admin jobs.
10. Open WhatsApp/email only after acceptance on the frontend.

Provider failures must never discard an accepted quote.

## Languages

First-class locale contract: `en | fr | it | nl | de`.

## Controlled shadow origins

The Worker accepts browser CORS and Turnstile hostnames only from:

- `https://pricelist.houseoftartufo.com`
- `https://price-list-git-codex-price-list-quote-engine-house-of-tartufo.vercel.app`

Do not add random Vercel deployment URLs to the allowlist.

## Rollout gates

The current Google Sheet/runtime catalogue is not removed until every gate below is green:

1. Cloudflare authorization is restored for the dedicated Price List account and the isolated D1 / Queue / DLQ / Worker inventory is verified before any provisioning.
2. Shadow Worker is deployed with `QUOTE_ENGINE_ENABLED=false`.
3. `TURNSTILE_SECRET` is present as a Worker secret and the matching public sitekey is configured only for the controlled production/branch hostnames.
4. Preview frontend has `VITE_HOT_QUOTE_ENGINE_ENABLED=true`, `VITE_HOT_QUOTE_API_URL`, and `VITE_HOT_TURNSTILE_SITE_KEY`; production remains disabled during shadow QA.
5. Billit ↔ Shopify SKU parity is exact. Pack metadata remains BLOCKED until `units_per_case` can be mapped by SKU, never by product name.
6. Company/Private × WhatsApp/Email × EN/FR/IT/NL/DE controlled quotations pass end-to-end.
7. Billit, Attio and admin projections are verified for exactly-once behavior, retries and provider-outage recovery.
8. Existing regression, browser and responsive QA remain green.
9. Only then may an explicit production feature-flag cutover be considered.

Migration is additive and reversible.
