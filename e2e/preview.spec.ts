import { mkdirSync } from 'node:fs';
import { expect, test, type Locator } from '@playwright/test';

mkdirSync('qa-screenshots', { recursive: true });

async function expectLoadedProductImage(image: Locator): Promise<void> {
  await expect(image).toBeVisible();
  await expect.poll(async () => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
}

test('production homepage serves the verified buyer catalogue', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/?sku=29');

  await expect(page.locator('#metric-products')).toHaveText('145');
  await expect(page.locator('#metric-categories')).toHaveText('8');
  await expect(page.locator('tr[data-sku="29"]')).toBeVisible();
  await expect(page.locator('#quote-trigger')).toBeVisible();

  const robots = page.locator('meta[name="robots"]');
  await expect(robots).toHaveAttribute('content', 'index,follow');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://houseoftartufo-price-list.vercel.app/',
  );

  await page.screenshot({ path: 'qa-screenshots/production-homepage.png' });
});

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

test('clicking a product only opens the descriptive card with official site content', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/preview.html?sku=87');

  const row = page.locator('tr[data-sku="87"]');
  await expect(row).toBeVisible();
  await expect(row.locator('.product-name')).toContainText(/Summer Truffle Carpaccio/i);

  await row.locator('.product-cell').click();
  const dialog = page.locator('#product-detail-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('#product-detail-title')).toContainText(/Summer Truffle Carpaccio/i);
  await expect(dialog).toContainText('87');
  await expect(dialog.locator('.product-detail-source')).toHaveAttribute('href', /houseoftartufo\.com\/products\/summer-truffle-carpaccio/);
  await expect(dialog).toContainText(/Ingredients/i, { timeout: 12_000 });
  await expectLoadedProductImage(dialog.locator('[data-product-detail-main-image]'));

  await page.screenshot({ path: 'qa-screenshots/product-detail-desktop.png' });
  await dialog.locator('[data-product-detail-close]').click();
  await expect(dialog).not.toBeVisible();
  await expect(row).toBeVisible();
  await expect(page.locator('#quote-count')).toHaveText('0');
});

test('product detail card stays contained on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/preview.html?sku=87');

  const row = page.locator('tr[data-sku="87"]');
  await row.locator('.product-cell').click();
  const dialog = page.locator('#product-detail-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(/Ingredients/i, { timeout: 12_000 });
  await expectLoadedProductImage(dialog.locator('[data-product-detail-main-image]'));

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  const dialogBox = await dialog.boundingBox();
  expect(dialogBox?.width ?? 9999).toBeLessThanOrEqual(390);

  await page.screenshot({ path: 'qa-screenshots/product-detail-mobile-390.png' });
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
