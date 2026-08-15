import { expect, test } from '@playwright/test';

test('product detail quote CTA delegates to the existing quote flow', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/preview.html');

  const row = page.locator('#product-rows tr[data-official-key="summer truffle carpaccio|80g"]');
  await expect(row).toBeVisible();
  await expect(row).toHaveAttribute('data-order-status', 'orderable');

  const tableQuoteButton = row.locator('[data-add-quote]');
  await expect(tableQuoteButton).toBeEnabled();
  const initialLabel = (await tableQuoteButton.innerText()).trim();

  await row.locator('.product-cell').click();

  const dialog = page.locator('#product-detail-dialog');
  await expect(dialog).toBeVisible();
  const detailQuoteButton = dialog.locator('[data-product-detail-quote]');
  await expect(detailQuoteButton).toBeVisible();
  await expect(detailQuoteButton).toHaveText(initialLabel);
  await expect(detailQuoteButton).toHaveAttribute('data-in-quote', 'false');

  await detailQuoteButton.click();

  await expect(page.locator('#quote-count')).toHaveText('1');
  await expect(detailQuoteButton).toHaveAttribute('data-in-quote', 'true');
  await expect(row.locator('[data-add-quote]')).toHaveAttribute('data-in-quote', 'true');

  await dialog.locator('[data-product-detail-close]').click();
  await page.locator('#quote-trigger').click();
  await expect(page.locator('#quote-dialog')).toBeVisible();
  await expect(page.locator('#quote-lines')).toContainText('Summer Truffle Carpaccio');
});
