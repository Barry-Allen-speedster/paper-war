import { test, expect } from "@playwright/test";

test("local game smoke test — 3 turns play correctly", async ({ page }) => {
  // Capture console errors
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  // ── Navigate to main menu ──────────────────────────────────────────────────
  await page.goto("/");
  await expect(page.getByText("Paper War")).toBeVisible();

  // ── Start local game ───────────────────────────────────────────────────────
  await page.getByRole("button", { name: /pass.*play/i }).click();

  // ── Player 1 deployment ───────────────────────────────────────────────────
  await expect(page.getByText(/player 1/i)).toBeVisible();
  await page.getByRole("button", { name: /randomize/i }).click();
  await page.getByRole("button", { name: /ready/i }).click();

  // ── Pass-device screen ────────────────────────────────────────────────────
  await expect(page.getByText(/player 2/i)).toBeVisible();
  await page.click("body"); // tap to reveal

  // ── Player 2 deployment ───────────────────────────────────────────────────
  await page.getByRole("button", { name: /randomize/i }).click();
  await page.getByRole("button", { name: /ready/i }).click();

  // ── Playing — play 3 turns ────────────────────────────────────────────────
  for (let i = 0; i < 3; i++) {
    // Pass-device screen may appear between turns
    const passScreen = page.getByText(/tap to reveal/i);
    if (await passScreen.isVisible({ timeout: 1000 }).catch(() => false)) {
      await page.click("body");
    }

    // Wait for Fire button
    await expect(page.getByRole("button", { name: /fire/i })).toBeVisible({ timeout: 5000 });

    // Click somewhere on the opponent half (right half of the board)
    const board = page.locator('[aria-label="Battlefield"]');
    const boardBox = await board.boundingBox();
    if (boardBox) {
      await page.mouse.click(
        boardBox.x + boardBox.width * 0.75,
        boardBox.y + boardBox.height * 0.4
      );
    }

    await page.getByRole("button", { name: /fire/i }).click();

    // Skip animation if present
    const skipBtn = page.getByRole("button", { name: /skip/i });
    if (await skipBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await skipBtn.click();
    }

    // Wait for animation to finish (max 3s)
    await page.waitForTimeout(2000);
  }

  // ── Verify turn counter incremented ───────────────────────────────────────
  // Turn indicator should show at least turn 2 by now
  const turnText = page.getByText(/turn [2-9]/i);
  await expect(turnText).toBeVisible({ timeout: 5000 });

  // ── No console errors ─────────────────────────────────────────────────────
  const criticalErrors = consoleErrors.filter(
    (e) => !e.includes("Warning:") && !e.includes("ResizeObserver")
  );
  expect(criticalErrors).toHaveLength(0);
});
