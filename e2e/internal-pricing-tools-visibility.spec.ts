import { expect, test } from '@playwright/test';

const INTERNAL_PRICING_COPY = /Pricing tools|Markup calculator|Suggested selling price|Gross margin/i;

for (const path of ['/', '/preview.html']) {
  test(`internal pricing tools are never exposed on public surface ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('body')).not.toContainText(INTERNAL_PRICING_COPY);
    const html = await page.content();
    expect(html).not.toMatch(INTERNAL_PRICING_COPY);
  });
}
