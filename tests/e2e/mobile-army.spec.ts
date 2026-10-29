import { test, expect } from "@playwright/test";

test("phone viewport can configure the army and deploy both armies", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await page.getByRole("button", { name: /rules/i }).click();
  await page.getByRole("button", { name: "Add one soldier" }).click();
  await page.getByText("Add one bomber soldier").click();
  await expect(page.getByText("6 soldiers per player")).toBeVisible();

  await page.getByRole("button", { name: /rules/i }).click();
  await page.getByRole("button", { name: /pass.*play/i }).click();
  await expect(page.getByText(/player 1/i)).toBeVisible();
  await page.getByRole("button", { name: /randomize/i }).click();
  await page.getByRole("button", { name: /ready/i }).click();
  await expect(page.getByText(/player 2/i)).toBeVisible();

  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
});
