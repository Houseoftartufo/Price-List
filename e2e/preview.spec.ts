import { mkdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';

mkdirSync('qa-screenshots', { recursive: true });

test('desktop buyer can find a SKU, price quantity and build a quote', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/preview.html?sku=29');

  await expect(page.locator('#metric-products')).toHaveText('145');
  await expect(page.locator('#metric-categories')).toHaveText('8');

  const row = page.locator('tr[data-sku="29"]');
  await expect(row).toBeVisible();
  await expect(row.locator('.dynamic-price')).toBeVisible();

  const quantity = row.locator('[data-qty-input="29"]');
  await quantity.fill('2');
  await quantity.press('Tab');
  await expect(row.locator('.discount-pill')).toContainText('5%');

  await row.locator('[data-add-quote="29"]').click();
  await expect(page.locator('#quote-count')).toHaveText('1');

  await page.locator('#quote-trigger').click();
  await expect(page.locator('#quote-dialog')).toBeVisible();
  await expect(page.locator('#quote-lines')).toContainText('SKU 29');
  await expect(page.locator('#whatsapp-order')).toHaveAttribute('href', /wa\.me\/32480205715/);
  await expect(page.locator('#email-order')).toHaveAttribute('href', /^mailto:/);
  await page.locator('#quote-close').click();

  await page.locator('[data-locale="it"]').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'it');
  await expect(page.locator('#quote-trigger')).toContainText(/preventivo/i);

  await page.screenshot({ path: 'qa-screenshots/desktop-buyer.png' });
});

for (const width of [320, 360, 390, 430]) {
  test(`${width}px mobile keeps languages, buyer controls and horizontal layout safe`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/preview.html?sku=46');

    await expect(page.locator('[data-locale="en"]')).toBeVisible();
    await expect(page.locator('[data-locale="fr"]')).toBeVisible();
    await expect(page.locator('#quote-trigger')).toBeVisible();
    await expect(page.locator('#catalogue-search')).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);

    const row = page.locator('tr[data-sku="46"]');
    await expect(row).toBeVisible();
    const decrement = row.locator('[data-qty-action="decrement"]');
    const increment = row.locator('[data-qty-action="increment"]');
    const decrementBox = await decrement.boundingBox();
    const incrementBox = await increment.boundingBox();
    expect(decrementBox?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(incrementBox?.height ?? 0).toBeGreaterThanOrEqual(44);

    await page.locator('[data-locale="fr"]').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');

    await page.screenshot({ path: `qa-screenshots/mobile-${width}.png` });
  });
}
