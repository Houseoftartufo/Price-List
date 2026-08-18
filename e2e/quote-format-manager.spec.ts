import { expect, test } from '@playwright/test';

const CARPACCIO = {
  '45g': '5430004174417',
  '80g': '5430004174387',
  '170g': '5430004174424',
  '500g': '5430004174370',
} as const;

async function addCarpaccio170g(page: import('@playwright/test').Page, boxes = 2) {
  const family = page.locator('#product-rows tr[data-product-family="Summer Truffle Carpaccio"]');
  await expect(family).toBeVisible();
  await family.locator('[data-format-select]').selectOption(CARPACCIO['170g']);
  const row = page.locator(`#product-rows tr[data-sku="${CARPACCIO['170g']}"]`);
  await expect(row).toBeVisible();
  await row.locator('[data-qty-input]').fill(String(boxes));
  await row.locator('[data-qty-input]').press('Tab');
  await row.locator('[data-add-quote]').click();
  await expect(page.locator('#quote-count')).toHaveText('1');
  return row;
}

function quoteLine(page: import('@playwright/test').Page, sku: string) {
  return page.locator('#quote-lines .quote-line').filter({
    has: page.locator(`[data-remove-quote="${sku}"]`),
  });
}

test('quote always exposes the selected product format and can switch it in place', async ({ page }) => {
  await page.goto('/preview.html');
  await addCarpaccio170g(page, 2);
  await page.locator('#quote-trigger').click();

  let line = quoteLine(page, CARPACCIO['170g']);
  await expect(line).toBeVisible();
  const format = line.locator('[data-quote-format-select]');
  await expect(format).toBeVisible();
  await expect(format).toHaveValue(CARPACCIO['170g']);
  await expect(format.locator('option:checked')).toHaveText('170g');
  await expect(line.locator('[data-quote-qty-value]')).toHaveText('2');

  await format.selectOption(CARPACCIO['500g']);
  await expect(page.locator('#quote-count')).toHaveText('1');
  line = quoteLine(page, CARPACCIO['500g']);
  await expect(line).toBeVisible();
  await expect(line.locator('[data-quote-format-select]')).toHaveValue(CARPACCIO['500g']);
  await expect(line.locator('[data-quote-qty-value]')).toHaveText('2');
  await expect(line.locator('.quote-line-meta')).toContainText(CARPACCIO['500g']);
});

test('quote can add another format of the same product as an independent SKU line', async ({ page }) => {
  await page.goto('/preview.html');
  await addCarpaccio170g(page, 2);
  await page.locator('#quote-trigger').click();

  const original = quoteLine(page, CARPACCIO['170g']);
  await original.locator('[data-quote-add-format] summary').click();
  await expect(original.locator(`[data-quote-add-format-sku="${CARPACCIO['80g']}"]`)).toBeVisible();
  await original.locator(`[data-quote-add-format-sku="${CARPACCIO['80g']}"]`).click();

  await expect(page.locator('#quote-count')).toHaveText('2');
  const line170 = quoteLine(page, CARPACCIO['170g']);
  const line80 = quoteLine(page, CARPACCIO['80g']);
  await expect(line170).toBeVisible();
  await expect(line80).toBeVisible();
  await expect(line170.locator('[data-quote-format-select]')).toHaveValue(CARPACCIO['170g']);
  await expect(line80.locator('[data-quote-format-select]')).toHaveValue(CARPACCIO['80g']);
  await expect(line170.locator('[data-quote-qty-value]')).toHaveText('2');
  await expect(line80.locator('[data-quote-qty-value]')).toHaveText('1');

  await line80.locator('[data-quote-qty-action="increment"]').click();
  await expect(line80.locator('[data-quote-qty-value]')).toHaveText('2');
  await expect(line170.locator('[data-quote-qty-value]')).toHaveText('2');
  await expect(line80.locator('[data-quote-tier-target]')).toContainText('−10%');
  await page.screenshot({ path: 'qa-screenshots/quote-format-manager-desktop.png' });
});

test('quote format manager follows buyer language and stays compact on 320px mobile', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('/preview.html');
  await addCarpaccio170g(page, 1);
  await page.locator('[data-locale="it"]').click();
  await page.locator('#quote-trigger').click();

  const line = quoteLine(page, CARPACCIO['170g']);
  await expect(line.locator('.quote-format-field')).toContainText('Formato');
  await expect(line.locator('[data-quote-add-format] summary')).toContainText('Aggiungi un altro formato');
  await line.locator('[data-quote-add-format] summary').click();
  await expect(line.locator(`[data-quote-add-format-sku="${CARPACCIO['500g']}"]`)).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.screenshot({ path: 'qa-screenshots/quote-format-manager-mobile-320.png' });
});
