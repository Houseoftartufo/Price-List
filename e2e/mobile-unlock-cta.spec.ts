import { expect, test } from '@playwright/test';

async function assertUnlockLayout(page: import('@playwright/test').Page, width: number): Promise<void> {
  await page.setViewportSize({ width, height: 844 });

  const row = page.locator('#product-rows tr[data-product-family="Summer Truffle Carpaccio"]');
  await expect(row).toBeVisible();

  const quantity = row.locator('[data-qty-input]');
  await quantity.fill('2');
  await quantity.press('Tab');

  const hint = row.locator('.tier-hint-action');
  await expect(hint).toBeVisible();
  await expect(hint).toContainText(/Débloquez\s*[−-]10%/i);
  await hint.scrollIntoViewIfNeeded();

  const metrics = await hint.evaluate((element) => {
    const button = element as HTMLElement;
    const buttonRect = button.getBoundingClientRect();
    const children = Array.from(button.querySelectorAll<HTMLElement>(':scope > span, :scope > strong, :scope > i'));
    const childRects = children.flatMap((child) => {
      const rect = child.getBoundingClientRect();
      const style = getComputedStyle(child);
      if (style.display === 'none' || rect.width === 0 || rect.height === 0) return [];
      return [{
        tag: child.tagName,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
      }];
    });

    return {
      clientWidth: button.clientWidth,
      scrollWidth: button.scrollWidth,
      left: buttonRect.left,
      right: buttonRect.right,
      viewportWidth: window.innerWidth,
      childRects,
    };
  });

  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
  expect(metrics.left).toBeGreaterThanOrEqual(-1);
  expect(metrics.right).toBeLessThanOrEqual(metrics.viewportWidth + 1);

  for (const child of metrics.childRects) {
    expect(child.left).toBeGreaterThanOrEqual(metrics.left - 1);
    expect(child.right).toBeLessThanOrEqual(metrics.right + 1);
  }

  const span = metrics.childRects.find((child) => child.tag === 'SPAN');
  const strong = metrics.childRects.find((child) => child.tag === 'STRONG');
  expect(span).toBeTruthy();
  expect(strong).toBeTruthy();
  if (span && strong) expect(span.bottom).toBeLessThanOrEqual(strong.top + 1);
}

test('French mobile unlock CTA stays ordered and overflow-free', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#product-rows tr[data-format-grouped="true"]')).toHaveCount(27);

  await page.locator('[data-locale="fr"]').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');

  await assertUnlockLayout(page, 390);
  await page.screenshot({ path: 'qa-screenshots/mobile-unlock-fr-390.png', fullPage: false });

  await assertUnlockLayout(page, 320);
  await page.screenshot({ path: 'qa-screenshots/mobile-unlock-fr-320.png', fullPage: false });
});
