import { expect, test } from '@playwright/test';

test('product detail quote CTA delegates to the existing quote flow for the selected format', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/preview.html');

  const familyRow = page.locator('#product-rows tr[data-product-family="Summer Truffle Carpaccio"]');
  await expect(familyRow).toBeVisible();
  await familyRow.locator('[data-format-select]').selectOption('5430004174387');

  const row = page.locator('#product-rows tr[data-sku="5430004174387"]');
  await expect(row).toBeVisible();
  await expect(row).toHaveAttribute('data-order-status', 'orderable');

  const tableQuoteButton = row.locator('[data-add-quote]');
  await expect(tableQuoteButton).toBeEnabled();
  const initialLabel = (await tableQuoteButton.innerText()).trim();

  await row.locator('.product-cell').click();

  const dialog = page.locator('#product-detail-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('[data-official-sku]')).toHaveText('5430004174387');
  const detailQuoteButton = dialog.locator('[data-product-detail-quote]');
  await expect(detailQuoteButton).toBeVisible();
  await expect(detailQuoteButton).toHaveText(initialLabel);
  await expect(detailQuoteButton).toHaveAttribute('data-in-quote', 'false');

  await detailQuoteButton.click();

  await expect(page.locator('#quote-count')).toHaveText('1');
  await expect(detailQuoteButton).toHaveAttribute('data-in-quote', 'true');
  await expect(page.locator('#product-rows tr[data-sku="5430004174387"] [data-add-quote]')).toHaveAttribute('data-in-quote', 'true');

  await dialog.locator('[data-product-detail-close]').click();
  await page.locator('#quote-trigger').click();
  await expect(page.locator('#quote-dialog')).toBeVisible();
  await expect(page.locator('#quote-lines')).toContainText('Summer Truffle Carpaccio');
  await expect(page.locator('#quote-lines')).toContainText('5430004174387');
});
