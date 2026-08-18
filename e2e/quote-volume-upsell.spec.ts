import { expect, test } from '@playwright/test';

async function honeyRow(page: import('@playwright/test').Page) {
  const row = page.locator('#product-rows tr[data-product-family="Acacia Honey with Truffle"]');
  await expect(row).toBeVisible();
  return row;
}

test('volume recommendation is prominent and jumps catalogue quantity to the next discount tier', async ({ page }) => {
  await page.goto('/preview.html');
  const row = await honeyRow(page);

  const quantity = row.locator('[data-qty-input]');
  await expect(quantity).toHaveValue('1');

  const recommendation = row.locator('[data-catalogue-tier-target]');
  await expect(recommendation).toBeVisible();
  await expect(recommendation).toContainText('Add 1 box');
  await expect(recommendation).toContainText('−5%');

  await recommendation.click();
  await expect(row.locator('[data-qty-input]')).toHaveValue('2');
  await expect(row.locator('.discount-pill')).toContainText('5%');
  await expect(row.locator('[data-catalogue-tier-target]')).toContainText('−10%');
});

test('quote panel edits boxes in place and makes the next discount tier one click away', async ({ page }) => {
  await page.goto('/preview.html');
  const row = await honeyRow(page);

  await row.locator('[data-add-quote]').click();
  await expect(page.locator('#quote-count')).toHaveText('1');
  await page.locator('#quote-trigger').click();

  const line = page.locator('#quote-lines .quote-line').filter({ hasText: 'Acacia Honey with Truffle' });
  await expect(line).toBeVisible();
  await expect(line.locator('[data-quote-volume-tools]')).toBeVisible();
  await expect(line.locator('[data-quote-qty-value]')).toHaveText('1');
  await expect(line.locator('[data-quote-tier-target]')).toContainText('Add 1 box');
  await expect(line.locator('[data-quote-tier-target]')).toContainText('−5%');

  await line.locator('[data-quote-qty-action="increment"]').click();
  await expect(line.locator('[data-quote-qty-value]')).toHaveText('2');
  await expect(line.locator('.discount-pill')).toContainText('5%');
  await expect(line.locator('[data-quote-tier-target]')).toContainText('−10%');

  await line.locator('[data-quote-tier-target]').click();
  await expect(line.locator('[data-quote-qty-value]')).toHaveText('3');
  await expect(line.locator('.discount-pill')).toContainText('10%');
  await expect(line.locator('[data-quote-tier-target]')).toContainText('−15%');

  await line.locator('[data-quote-qty-action="decrement"]').click();
  await expect(line.locator('[data-quote-qty-value]')).toHaveText('2');
  await expect(page.locator('#product-rows tr[data-product-family="Acacia Honey with Truffle"] [data-qty-input]')).toHaveValue('2');
});

test('quote volume controls follow the active buyer language', async ({ page }) => {
  await page.goto('/preview.html');
  const row = await honeyRow(page);
  await row.locator('[data-add-quote]').click();

  await page.locator('[data-locale="it"]').click();
  await page.locator('#quote-trigger').click();

  const line = page.locator('#quote-lines .quote-line').filter({ hasText: 'Acacia Honey with Truffle' });
  await expect(line.locator('.quote-quantity-editor')).toContainText('Box');
  await expect(line.locator('[data-quote-tier-target]')).toContainText('Aggiungi 1 box');
  await expect(line.locator('[data-quote-tier-target]')).toContainText('Sblocca −5%');
});
