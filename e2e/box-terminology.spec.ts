import { expect, test } from '@playwright/test';

test('buyer-facing quantity terminology uses box and boxes everywhere', async ({ page }) => {
  await page.goto('/preview.html');
  await expect(page.locator('#product-rows tr[data-sku]').first()).toBeVisible();

  await expect(page.locator('th[data-ui="casePack"]')).toHaveText('Units / box');
  await expect(page.locator('th[data-ui="cases"]')).toHaveText('Boxes');
  await expect(page.locator('[data-ui="volumePricingBody"]')).toContainText('boxes ordered');
  await expect(page.locator('#discount-ladder')).toContainText('boxes');

  const orderable = page.locator('#product-rows tr[data-order-status="orderable"]').first();
  await expect(orderable).toBeVisible();
  await expect(orderable.locator('td').nth(2)).toContainText('units');
  await expect(orderable.locator('.best-price')).toContainText('boxes');
  await expect(orderable.locator('.dynamic-price')).toContainText('/ box');

  await orderable.locator('[data-qty-input]').fill('2');
  await orderable.locator('[data-qty-input]').press('Tab');
  const sku = await orderable.getAttribute('data-sku');
  expect(sku).toBeTruthy();
  await page.locator(`#product-rows tr[data-sku="${sku}"] [data-add-quote]`).click();
  await page.locator('#quote-trigger').click();
  await expect(page.locator('#quote-lines')).toContainText('boxes');
  await expect(page.locator('#quote-lines')).not.toContainText(/\bcases\b/i);
  await page.locator('#quote-close').click();

  const productCell = page.locator(`#product-rows tr[data-sku="${sku}"] .product-cell`);
  await productCell.click();
  const dialog = page.locator('#product-detail-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.product-detail-specs')).toContainText('Units / box');
  await expect(dialog.locator('.product-detail-specs')).not.toContainText(/Case pack/i);
  await dialog.locator('[data-product-detail-close]').click();

  await page.locator('[data-locale="it"]').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'it');
  await expect(page.locator('th[data-ui="casePack"]')).toHaveText('Pz / box');
  await expect(page.locator('th[data-ui="cases"]')).toHaveText('Box');
  await expect(page.locator('[data-ui="volumePricingBody"]')).toContainText('box ordinati');
  await expect(page.locator('body')).not.toContainText(/scatole|scatola/i);
});
