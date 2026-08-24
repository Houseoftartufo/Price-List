import { expect, test, type Page } from '@playwright/test';

test.describe('guarded quote engine wizard', () => {
  test.skip(process.env.QUOTE_ENGINE_BROWSER_QA !== '1', 'Requires the isolated feature-enabled browser fixture.');

  async function seedQuote(page: Page): Promise<void> {
    await page.addInitScript(() => {
      window.localStorage.removeItem('hot-price-list:quote:v1');
      window.localStorage.setItem('hot-price-list:locale:v1', 'de');
      (window as typeof window & { __hotAccepted?: unknown }).__hotAccepted = undefined;
      window.addEventListener('hot:quote-engine-accepted', (event) => {
        (window as typeof window & { __hotAccepted?: unknown }).__hotAccepted = (event as CustomEvent).detail;
      });
    });
  }

  test('submits only after Turnstile and uses the accepted server quote for handoff', async ({ page, context }) => {
    await seedQuote(page);

    let resetCount = 0;
    await context.route('https://challenges.cloudflare.com/turnstile/v0/api.js*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: `
          window.turnstile = {
            render(container, options) {
              window.__hotTurnstileOptions = options;
              container.dataset.turnstileMock = 'ready';
              setTimeout(() => options.callback('turnstile-e2e-token'), 0);
              return 'hot-e2e-widget';
            },
            reset() { window.__hotTurnstileResetCount = (window.__hotTurnstileResetCount || 0) + 1; },
            remove() {}
          };
        `,
      });
    });

    let submitted: Record<string, unknown> | undefined;
    await context.route('http://127.0.0.1:4173/mock-quote-api/quotes', async (route) => {
      submitted = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          duplicate: false,
          quote: {
            quoteId: 'HOT-Q-2026-009999',
            status: 'ACCEPTED',
            currency: 'EUR',
            totalExVat: 102,
            createdAt: '2026-08-23T20:00:00.000Z',
            lines: [{
              sku: '5430004174417',
              name: 'Summer Truffle Carpaccio',
              cases: 2,
              unitsPerCase: 6,
              totalUnits: 12,
              finalUnitPriceExVat: 8.5,
              subtotalExVat: 102,
            }],
          },
        }),
      });
    });

    await context.route('https://wa.me/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'text/html', body: '<title>WhatsApp mock</title>' });
    });

    await page.goto('/preview.html');
    await page.locator('[data-add-quote]').first().click();
    await page.locator('#quote-trigger').click();
    await expect(page.locator('#quote-dialog')).toBeVisible();
    await expect.poll(() => page.locator('#quote-dialog').evaluate((element: HTMLDialogElement) => element.open)).toBe(true);
    await expect(page.locator('#quote-actions')).toBeVisible();
    await page.locator('#whatsapp-order').click();

    const wizard = page.locator('#hot-quote-wizard');
    await expect(wizard).toBeVisible();
    await expect.poll(() => wizard.evaluate((element: HTMLDialogElement) => element.open)).toBe(true);
    await expect(page.locator('#hot-quote-turnstile')).toHaveAttribute('data-turnstile-mock', 'ready');

    const turnstileAction = await page.evaluate(() => (
      window as typeof window & { __hotTurnstileOptions?: { action?: string } }
    ).__hotTurnstileOptions?.action);
    expect(turnstileAction).toBe('quote_request');

    await page.locator('input[name="companyName"]').fill('Tartufo Test GmbH');
    await page.locator('input[name="vatNumber"]').fill('DE123456789');
    await page.locator('input[name="firstName"]').fill('Anna');
    await page.locator('input[name="lastName"]').fill('Muster');
    await page.locator('select[name="countryCode"]').selectOption('DE');
    await page.locator('input[name="email"]').fill('anna@example.de');
    await page.locator('input[name="phone"]').fill('+491701234567');
    await page.locator('input[name="street"]').fill('Musterstrasse');
    await page.locator('input[name="streetNumber"]').fill('12');
    await page.locator('input[name="postalCode"]').fill('10115');
    await page.locator('input[name="city"]').fill('Berlin');

    const popupPromise = context.waitForEvent('page');
    await page.locator('.hot-quote-wizard__submit').click();
    const popup = await popupPromise;

    await expect.poll(() => submitted).toBeTruthy();
    expect(submitted?.turnstileToken).toBe('turnstile-e2e-token');
    expect(submitted?.locale).toBe('de');
    expect(submitted?.preferredChannel).toBe('whatsapp');
    expect(submitted).not.toHaveProperty('price');
    expect(submitted).not.toHaveProperty('total');

    await expect.poll(() => page.evaluate(() => (
      window as typeof window & { __hotAccepted?: { quoteId?: string; channel?: string } }
    ).__hotAccepted)).toMatchObject({ quoteId: 'HOT-Q-2026-009999', channel: 'whatsapp' });

    await popup.waitForLoadState('domcontentloaded').catch(() => undefined);
    expect(popup.url()).toContain('wa.me/32480205715');
    expect(decodeURIComponent(popup.url())).toContain('HOT-Q-2026-009999');
    expect(decodeURIComponent(popup.url())).toContain('€102.00');

    resetCount = await page.evaluate(() => (
      window as typeof window & { __hotTurnstileResetCount?: number }
    ).__hotTurnstileResetCount || 0);
    expect(resetCount).toBe(0);
  });

  test('resets the single-use Turnstile token after a rejected submission', async ({ page, context }) => {
    await seedQuote(page);

    await context.route('https://challenges.cloudflare.com/turnstile/v0/api.js*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: `
          window.turnstile = {
            render(container, options) {
              container.dataset.turnstileMock = 'ready';
              setTimeout(() => options.callback('turnstile-retry-token'), 0);
              return 'hot-e2e-widget';
            },
            reset() { window.__hotTurnstileResetCount = (window.__hotTurnstileResetCount || 0) + 1; },
            remove() {}
          };
        `,
      });
    });

    await context.route('http://127.0.0.1:4173/mock-quote-api/quotes', async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, code: 'turnstile-rejected', message: 'Security verification failed.' }),
      });
    });

    await page.goto('/preview.html');
    await page.locator('[data-add-quote]').first().click();
    await page.locator('#quote-trigger').click();
    await expect(page.locator('#quote-actions')).toBeVisible();
    await page.locator('#email-order').click();
    await expect(page.locator('#hot-quote-turnstile')).toHaveAttribute('data-turnstile-mock', 'ready');

    await page.locator('input[name="companyName"]').fill('Tartufo Test GmbH');
    await page.locator('input[name="vatNumber"]').fill('DE123456789');
    await page.locator('input[name="firstName"]').fill('Anna');
    await page.locator('input[name="lastName"]').fill('Muster');
    await page.locator('select[name="countryCode"]').selectOption('DE');
    await page.locator('input[name="email"]').fill('anna@example.de');
    await page.locator('input[name="phone"]').fill('+491701234567');
    await page.locator('input[name="street"]').fill('Musterstrasse');
    await page.locator('input[name="streetNumber"]').fill('12');
    await page.locator('input[name="postalCode"]').fill('10115');
    await page.locator('input[name="city"]').fill('Berlin');

    await page.locator('.hot-quote-wizard__submit').click();
    await expect(page.locator('#hot-quote-wizard-status')).toContainText('Security verification failed.');
    await expect.poll(async () => page.evaluate(() => (
      window as typeof window & { __hotTurnstileResetCount?: number }
    ).__hotTurnstileResetCount || 0)).toBe(1);
  });
});
