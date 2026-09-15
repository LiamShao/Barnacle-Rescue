import { expect, test, type Page } from "@playwright/test";
import { levels, type LevelConfig } from "../../src/levels/levels";
import { SAVE_KEY } from "../../src/state/persistence";

async function openSelection(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Start rescue" }).click();
}

test("sound can be toggled without resetting a run and stays selected during navigation", async ({ page }) => {
  await page.goto("/");
  const enable = page.getByRole("button", { name: "Turn sound on" });
  await expect(enable).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "Start rescue" }).click();
  await expect(page.getByRole("button", { name: "Turn sound on" })).toBeVisible();
  await page.getByRole("button", { name: /Gentle Start/ }).click();
  await scrape(page, 0);
  await expect(page.getByTestId("progress")).toHaveText("33%");
  await page.getByRole("button", { name: "Turn sound on" }).click();
  await expect(page.locator("canvas")).toHaveCount(1);
  await expect(page.getByTestId("progress")).toHaveText("33%");
  await page.getByRole("button", { name: "Choose rescue", exact: true }).click();
  await expect(page.getByRole("button", { name: "Mute sound" })).toHaveAttribute("aria-pressed", "true");
});

test("settings and a successful completion restore after reload", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Turn sound on" }).click();
  await page.getByRole("button", { name: "Start rescue" }).click();
  await page.getByRole("button", { name: "Zen", exact: true }).click();
  await page.getByRole("button", { name: /Gentle Start/ }).click();
  for (let index = 0; index < levels[0].barnacleCount; index += 1) await scrape(page, index);
  await expect(page.getByTestId("rescue-complete")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("button", { name: "Mute sound" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Start rescue" }).click();
  await expect(page.getByRole("button", { name: "Zen", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("level-progress-1")).toHaveText("Zen complete");
});

test("malformed and old saves safely restore defaults", async ({ page }) => {
  await page.goto("/");
  for (const serialized of ["{", JSON.stringify({ version: 0, settings: { soundEnabled: true, mode: "zen" }, completions: [] })]) {
    await page.evaluate(([key, value]) => localStorage.setItem(key, value), [SAVE_KEY, serialized]);
    await page.reload();
    await expect(page.getByRole("button", { name: "Turn sound on" })).toHaveAttribute("aria-pressed", "false");
    await page.getByRole("button", { name: "Start rescue" }).click();
    await expect(page.getByRole("button", { name: "Challenge", exact: true })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Main menu", exact: true }).click();
  }
});

for (const width of [1280, 320]) {
  test(`main menu, instructions and return navigation (${width}px)`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    const start = page.getByRole("button", { name: "Start rescue" });
    await expect(start).toBeFocused();
    await expect(page.locator("canvas")).toHaveCount(0);
    await page.getByText("How to play", { exact: true }).click();
    await expect(page.getByText(/Clicking alone will not clean it/)).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("main-menu.png"), fullPage: true });
    await start.press("Enter");
    await page.getByRole("button", { name: "Zen", exact: true }).click();
    await page.getByRole("button", { name: /Gentle Start/ }).click();
    await expect(page.getByRole("progressbar", { name: "Cleaning progress" })).toHaveAttribute("aria-valuenow", "0");
    await scrape(page, 0);
    await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "33");
    await page.getByRole("button", { name: "Main menu", exact: true }).click();
    await expect(start).toBeFocused();
    await expect(page.locator("canvas")).toHaveCount(0);
    await start.click();
    await expect(page.getByRole("button", { name: "Zen", exact: true })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: /Gentle Start/ }).click();
    await expect(page.getByTestId("progress")).toHaveText("0%");
    for (let index = 0; index < 3; index += 1) await scrape(page, index);
    const result = page.getByTestId("rescue-complete");
    await expect(result).toBeVisible();
    await result.getByRole("button", { name: "Main menu" }).click();
    await expect(start).toBeFocused();
    await expect(page.locator("canvas")).toHaveCount(0);
  });
}

for (const width of [1280, 320]) {
  test(`Zen is pressure-free across levels, replay and mode switches (${width}px)`, async ({ page }, testInfo) => {
    test.setTimeout(90000);
    await page.clock.install();
    await page.setViewportSize({ width, height: 844 });
  await openSelection(page);
    const zen = page.getByRole("button", { name: "Zen", exact: true });
    await zen.focus();
    await page.keyboard.press("Enter");
    await expect(zen).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: /Gentle Start/ }).click();
    await expect(page.locator("canvas")).toBeVisible();
    await page.clock.fastForward(120000);
    await expect(page.getByTestId("rescue-failed")).toHaveCount(0);
    const box = (await page.locator("canvas").boundingBox())!;
    const scale = Math.min(box.width / 820, box.height / 540);
    const x = box.x + box.width / 2;
    const y = box.y + box.height * 0.55 - 100 * scale;
    await page.mouse.move(x - 25 * scale, y);
    await page.mouse.down();
    for (let pass = 0; pass < 9; pass += 1) {
      await page.mouse.move(x + 25 * scale, y, { steps: 3 });
      await page.mouse.move(x - 25 * scale, y, { steps: 3 });
    }
    await page.mouse.up();
    await expect(page.getByTestId("animal-status")).toHaveAttribute("data-reaction", "idle");
    await expect(page.getByTestId("progress")).toHaveText("0%");
    for (const level of levels) {
      if (level.id > 1) {
        await openSelection(page);
        await page.getByRole("button", { name: "Zen", exact: true }).click();
        await page.getByRole("button", { name: new RegExp(level.name) }).click();
      }
      await expect(page.getByTestId("level-title")).toContainText(`Zen · ${level.name}`);
      for (const id of ["timer", "health", "score", "combo", "grade"]) await expect(page.getByTestId(id)).toHaveCount(0);
      if (level.id === 3) {
        await page.screenshot({ path: testInfo.outputPath("zen.png"), fullPage: true });
      }
      for (let index = 0; index < level.barnacleCount; index += 1) await scrape(page, index, level);
      await expect(page.getByTestId("rescue-complete")).toBeVisible();
      await expect(page.getByTestId("rescue-complete")).not.toContainText(/Score|Grade|bonus/);
    }
    await page.getByRole("button", { name: "Rescue again" }).click();
    await expect(page.getByTestId("level-title")).toContainText("Zen · Full Rescue");
    await expect(page.getByTestId("progress")).toHaveText("0%");
    await expect(page.getByTestId("animal-status")).toHaveAttribute("data-mood", "sad");
  });
}

test("a failed Challenge run can return to selection and start fresh in Zen", async ({ page }) => {
  await page.clock.install();
  await openSelection(page);
  await page.getByRole("button", { name: /Gentle Start/ }).click();
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.getByTestId("health")).toHaveText("100");
  await page.clock.fastForward(76000);
  await expect(page.getByTestId("rescue-failed")).toBeVisible();
  await page.getByTestId("rescue-failed").getByRole("button", { name: "Choose rescue" }).click();
  await page.getByRole("button", { name: "Zen", exact: true }).click();
  await page.getByRole("button", { name: /Gentle Start/ }).click();
  await expect(page.getByTestId("rescue-failed")).toHaveCount(0);
  await expect(page.getByTestId("progress")).toHaveText("0%");
  await scrape(page, 0);
  await expect(page.getByTestId("progress")).toHaveText("33%");
});

async function targetPoint(page: Page, index: number, level: LevelConfig = levels[0]) {
  const canvas = page.getByRole("application", { name: "Sea turtle rescue area" });
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("game canvas has no bounding box");
  const scale = Math.min(box.width / 820, box.height / 540);
  const target = level.placements[index];
  return { x: box.x + box.width / 2 + target.x * scale, y: box.y + box.height * 0.55 + target.y * scale, scale };
}

async function scrape(page: Page, index: number, level: LevelConfig = levels[0], passes = 14) {
  const initialProgress = await page.getByTestId("progress").textContent();
  const { x, y, scale } = await targetPoint(page, index, level);
  await page.mouse.move(x - 25 * scale, y);
  await page.mouse.down();
  for (let pass = 0; pass < passes; pass += 1) {
    await page.mouse.move(x + 25 * scale, y, { steps: 3 });
    await page.mouse.move(x - 25 * scale, y, { steps: 3 });
    if (await page.getByTestId("progress").textContent() !== initialProgress) break;
  }
  await page.mouse.up();
}

for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
  test(`all targets must detach, including after replay (${viewport.width}px)`, async ({ page }) => {
    test.setTimeout(60000);
    await page.setViewportSize(viewport);
  await openSelection(page);
    await page.getByRole("button", { name: /Gentle Start/ }).click();
    for (let run = 0; run < 2; run += 1) {
      const animal = page.getByTestId("animal-status");
      await expect(page.getByTestId("progress")).toHaveText("0%");
      await expect(animal).toHaveAttribute("data-mood", "sad");
      await expect(animal).toHaveAttribute("data-reaction", "idle");
      await scrape(page, 0);
      await expect(page.getByTestId("progress")).toHaveText("33%");
      await expect(animal).toHaveAttribute("data-mood", "neutral");
      await expect(animal).toHaveAttribute("data-reaction", "relief");
      await expect(page.getByTestId("health")).toHaveText("100");
      await expect(animal).toHaveText("The turtle is feeling better.");
      await expect(page.getByTestId("rescue-complete")).toHaveCount(0);
      await scrape(page, 0, levels[0], 1);
      await expect(page.getByTestId("progress")).toHaveText("33%");
      await scrape(page, 1);
      await expect(page.getByTestId("progress")).toHaveText("67%");
      await expect(animal).toHaveAttribute("data-mood", "relaxed");
      await expect(animal).toHaveText("The turtle feels relaxed.");
      await expect(page.getByTestId("rescue-complete")).toHaveCount(0);
      await scrape(page, 2);
      await expect(page.getByTestId("progress")).toHaveText("100%");
      await expect(animal).toHaveAttribute("data-mood", "happy");
      await expect(animal).toHaveText("The turtle is celebrating!");
      await expect(page.getByTestId("rescue-complete")).toHaveCount(0);
      await expect(page.getByTestId("rescue-complete")).toBeVisible();
      await expect(page.getByTestId("grade")).toContainText(/Grade [SABC]/);
      if (run === 0) {
        const replay = page.getByRole("button", { name: "Rescue again" });
        await expect(replay).toBeFocused();
        await replay.press("Enter");
        await expect(page.getByTestId("rescue-complete")).toHaveCount(0);
        await expect(page.locator("canvas")).toHaveCount(1);
      }
    }
  });
}

test("timeout fails without a grade and replay restores challenge state", async ({ page }) => {
  await page.clock.install();
  await openSelection(page);
  await page.getByRole("button", { name: /Gentle Start/ }).click();
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.getByTestId("health")).toHaveText("100");
  await expect(page.getByTestId("score")).toHaveText("0");
  await page.clock.fastForward(76000);
  await expect(page.getByTestId("rescue-failed")).toContainText("Time ran out.");
  await expect(page.getByTestId("timer")).toHaveText("0s");
  await expect(page.getByTestId("grade")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Next rescue" })).toHaveCount(0);
  await page.getByRole("button", { name: "Rescue again" }).click();
  await expect(page.getByTestId("timer")).toHaveText("75s");
  await expect(page.getByTestId("progress")).toHaveText("0%");
  await expect(page.getByTestId("health")).toHaveText("100");
  await expect(page.getByTestId("rescue-failed")).toHaveCount(0);
});

test("bare-shell scraping hurts and can fail, while water and stationary input are safe", async ({ page }) => {
  await openSelection(page);
  await page.getByRole("button", { name: /Gentle Start/ }).click();
  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + 20, box.y + 40);
  await page.mouse.down();
  await page.mouse.move(box.x + 80, box.y + 40, { steps: 6 });
  await page.mouse.up();
  await expect(page.getByTestId("health")).toHaveText("100");
  const scale = Math.min(box.width / 820, box.height / 540);
  const x = box.x + box.width / 2;
  const y = box.y + box.height * 0.55 - 100 * scale;
  await page.mouse.move(x - 25 * scale, y);
  await page.mouse.down();
  await page.waitForTimeout(150);
  await expect(page.getByTestId("health")).toHaveText("100");
  for (let pass = 0; pass < 9; pass += 1) {
    await page.mouse.move(x + 25 * scale, y, { steps: 3 });
    await page.mouse.move(x - 25 * scale, y, { steps: 3 });
  }
  await page.mouse.up();
  await expect(page.getByTestId("rescue-failed")).toContainText("The turtle needs a rest.");
  await expect(page.getByTestId("health")).toHaveText("0");
  await expect(page.getByTestId("grade")).toHaveCount(0);
  await expect(page.getByTestId("progress")).toHaveText("0%");
});

test("clicking and holding without movement do not remove targets", async ({ page }) => {
  await openSelection(page);
  await page.getByRole("button", { name: /Gentle Start/ }).click();
  const { x, y } = await targetPoint(page, 0);
  await page.mouse.click(x, y);
  await page.mouse.down();
  await page.waitForTimeout(500);
  await page.mouse.up();
  await expect(page.getByTestId("progress")).toHaveText("0%");
  await expect(page.getByTestId("rescue-complete")).toHaveCount(0);
});

for (const width of [1280, 320]) {
  test(`select, complete and advance through all levels (${width}px)`, async ({ page }, testInfo) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width, height: 844 });
  await openSelection(page);
    await expect(page.getByRole("button", { name: /Gentle Start/ })).toBeFocused();
    await page.screenshot({ path: testInfo.outputPath("level-selection.png"), fullPage: true });
    await page.keyboard.press("Enter");
    for (const level of levels) {
      await expect(page.getByTestId("level-title")).toContainText(level.name);
      await expect(page.getByTestId("progress")).toHaveText("0%");
      await expect(page.getByTestId("animal-status")).toHaveAttribute("data-mood", "sad");
      await expect(page.locator("canvas")).toHaveCount(1);
      if (level.id === 3) {
        await page.screenshot({ path: testInfo.outputPath("full-rescue.png"), fullPage: true });
      }
      for (let index = 0; index < level.barnacleCount; index += 1) {
        await scrape(page, index, level);
        await expect(page.getByTestId("progress")).toHaveText(`${Math.round((index + 1) / level.barnacleCount * 100)}%`);
        if (index < level.barnacleCount - 1) await expect(page.getByTestId("rescue-complete")).toHaveCount(0);
      }
      await expect(page.getByTestId("rescue-complete")).toBeVisible();
      if (level.id < 3) await page.getByRole("button", { name: "Next rescue" }).click();
    }
    await expect(page.getByRole("button", { name: "Next rescue" })).toHaveCount(0);
    await expect(page.getByText("You finished the final rescue.")).toBeVisible();
    await page.getByRole("button", { name: "Rescue again" }).click();
    await expect(page.getByTestId("level-title")).toContainText("Full Rescue");
    await expect(page.getByTestId("progress")).toHaveText("0%");
    await page.getByRole("button", { name: "Choose rescue", exact: true }).click();
    await expect(page.locator("canvas")).toHaveCount(0);
    await page.getByRole("button", { name: /Shell Care/ }).click();
    await scrape(page, 0, levels[1]);
    await expect(page.getByTestId("progress")).toHaveText("20%");
    await page.getByRole("button", { name: "Choose rescue", exact: true }).click();
    await page.getByRole("button", { name: /Gentle Start/ }).click();
    await expect(page.getByTestId("progress")).toHaveText("0%");
    await expect(page.getByTestId("animal-status")).toHaveAttribute("data-reaction", "idle");
    await expect(page.locator("canvas")).toHaveCount(1);
  });
}
