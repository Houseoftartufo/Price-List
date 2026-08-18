import { expect, test } from '@playwright/test';

test('keeps Line internal and shows Carpaccio under Preserved', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('tr[data-sku="5430004174417"]')).toBeVisible();

  const lineFilter = page.locator('#line-filter');
  await expect(lineFilter).toBeHidden();
  await expect(lineFilter.locator('xpath=..')).toBeHidden();

  const preservedChip = page.locator('[data-category="Preserved"]');
  await expect(preservedChip).toBeVisible();
  await expect(preservedChip).toHaveText('Preserved');

  const carpaccioRow = page.locator('tr[data-sku="5430004174417"]');
  await expect(carpaccioRow).toContainText('Summer Truffle Carpaccio');
  await expect(carpaccioRow).toContainText('Preserved');
  await expect(carpaccioRow).not.toContainText('Pure Creams');

  await preservedChip.click();
  await expect(carpaccioRow).toBeVisible();
});

test('centers the editorial hero on desktop without changing the mobile composition', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');

  const desktopHero = page.locator('.hero-content');
  await expect(desktopHero).toBeVisible();
  const desktopBox = await desktopHero.boundingBox();
  expect(desktopBox).not.toBeNull();
  if (desktopBox) {
    expect(Math.abs(desktopBox.x + desktopBox.width / 2 - 720)).toBeLessThan(3);
  }
  await expect(desktopHero).toHaveCSS('text-align', 'center');

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileHero = page.locator('.hero-content');
  await expect(mobileHero).toBeVisible();
  const mobileBox = await mobileHero.boundingBox();
  expect(mobileBox).not.toBeNull();
  if (mobileBox) {
    expect(mobileBox.x).toBeLessThan(24);
    expect(mobileBox.width).toBeGreaterThan(340);
  }
  await expect(mobileHero).not.toHaveCSS('text-align', 'center');
});
