import { expect, test, type Page } from "@playwright/test";
import { wholeTurtleCare } from "../../src/levels/levels";
import { prepareRescueRun } from "../../src/state/rescueRun";
import { SAVE_KEY } from "../../src/state/persistence";

const cases = Array.from({ length: 24 }, (_, index) => {
  const seed = `zen-browser-${index}`;
  return { seed, run: prepareRescueRun(wholeTurtleCare, seed) };
});
const first = cases[0];
const firstRegions = new Set(first.run.stages.flatMap((stage) => stage.targets.map((target) => target.placement.spawnRegionId)));
const second = cases.find((candidate) => candidate.run.stages.some((stage) => stage.targets.some((target) => !firstRegions.has(target.placement.spawnRegionId))))!;

async function selectCare(page: Page, seeds = [first.seed, second.seed]) {
  await page.addInitScript((values) => {
    let selection = 0;
    Object.defineProperty(crypto, "randomUUID", { value: () => values[selection++ % values.length] });
  }, seeds);
  await page.goto("/");
  await page.getByRole("button", { name: "Start rescue" }).click();
  await expect(page.getByRole("button", { name: /Whole Turtle Care/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Zen", exact: true }).click();
  await page.getByRole("button", { name: /Whole Turtle Care/ }).click();
  await expect(page.getByTestId("area-title")).toHaveText("Area 1 of 2 · Back and flippers");
}

async function cleanArea(page: Page, fixture = first, stageIndex = 0, targetLimit = Infinity) {
  for (const target of fixture.run.stages[stageIndex].targets.slice(0, targetLimit)) {
    const canvas = page.getByRole("application", { name: "Sea turtle rescue area" });
    await expect(canvas).toBeVisible();
    await canvas.scrollIntoViewIfNeeded();
    await expect.poll(() => canvas.evaluate((element) => {
      const view = element as HTMLCanvasElement;
      return Math.abs(view.width / devicePixelRatio - view.clientWidth) <= 1
        && Math.abs(view.height / devicePixelRatio - view.clientHeight) <= 1;
    })).toBe(true);
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Missing rescue canvas");
    const scale = Math.min(box.width / 820, box.height / 540);
    const x = box.x + box.width / 2 + target.placement.x * scale;
    const y = box.y + box.height / 2 + target.placement.y * scale;
    const before = await page.getByTestId("progress").textContent();
    await page.mouse.move(x - 24 * scale, y);
    await page.mouse.down();
    for (let pass = 0; pass < 60; pass += 1) {
      await page.mouse.move(x + 24 * scale, y, { steps: 3 });
      await page.mouse.move(x - 24 * scale, y, { steps: 3 });
      if (await page.getByTestId("progress").textContent() !== before) break;
    }
    await page.mouse.up();
    await expect(page.getByTestId("progress")).not.toHaveText(before!);
  }
}

async function nextArea(page: Page) {
  const next = page.getByRole("button", { name: "Next area: Underside" });
  await expect(next).toBeFocused();
  // Both activations happen before React has removed the button.
  await next.evaluate((button) => { (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click(); });
  await expect(page.getByTestId("area-status")).toHaveText("Turning the turtle gently…");
  await expect(page.getByTestId("area-title")).toHaveText("Area 2 of 2 · Underside");
  await expect(page.getByTestId("area-title")).toBeFocused();
  await expect(page.getByTestId("area-status")).toHaveText("Underside ready. Keep scraping.");
  await expect(page.locator("canvas")).toHaveCount(1);
  await expect(page.locator("canvas")).toHaveAttribute("data-body-view", "ventral");
}

for (const [width, fixture] of [[1280, first], [320, second]] as const) {
  test(`Zen two-area rescue, same-case replay, abandonment and completion save (${width}px)`, async ({ page }, testInfo) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width, height: 900 });
    await selectCare(page, [fixture.seed, fixture === first ? second.seed : first.seed]);
    const seedUnion = new Set([first, second].flatMap((item) => item.run.stages.flatMap((stage) => stage.targets.map((target) => target.placement.spawnRegionId))));
    expect(seedUnion.size).toBe(8);
    await expect(page.getByTestId("timer")).toHaveCount(0);
    await expect(page.getByTestId("health")).toHaveCount(0);
    await expect(page.getByTestId("score")).toHaveCount(0);
    await expect(page.locator("canvas")).toHaveAttribute("data-animal-asset", "raster");
    await page.screenshot({ path: testInfo.outputPath("back-and-flippers.png"), fullPage: true });
    await cleanArea(page, fixture);
    await expect(page.getByRole("progressbar", { name: "Current area progress" })).toHaveAttribute("aria-valuenow", "100");
    await expect(page.getByTestId("progress")).toHaveText(`${fixture.run.stages[0].targets.length * 10}%`);
    await expect(page.getByTestId("animal-status")).toHaveAttribute("data-mood", "relaxed");
    await expect(page.getByTestId("animal-status")).not.toHaveAttribute("data-reaction", "celebrate");
    await expect(page.getByTestId("rescue-complete")).toHaveCount(0);
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).completions, SAVE_KEY)).toEqual([]);
    await nextArea(page);
    await expect(page.getByTestId("animal-status")).toHaveAttribute("data-mood", "relaxed");
    await expect(page.getByTestId("animal-status")).toHaveAttribute("data-reaction", "idle");
    await expect(page.locator("canvas")).toHaveAttribute("data-animal-asset", "raster");
    await page.screenshot({ path: testInfo.outputPath("underside.png"), fullPage: true });
    await cleanArea(page, fixture, 1);
    await expect(page.getByTestId("animal-status")).toHaveAttribute("data-reaction", "celebrate");
    await expect(page.getByTestId("rescue-complete")).toBeVisible();
    const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
    expect(saved.completions).toEqual([{ rescueId: wholeTurtleCare.rescue.id, zenCompleted: true, challengeBest: null }]);
    expect(Object.keys(saved).sort()).toEqual(["completions", "settings", "version"]);
    await page.getByRole("button", { name: "Rescue again" }).click();
    await expect(page.getByTestId("progress")).toHaveText("0%");
    await expect(page.getByTestId("area-title")).toHaveText("Area 1 of 2 · Back and flippers");
    await cleanArea(page, fixture); // Expected original coordinates must work again.
    await nextArea(page);
    await page.getByRole("button", { name: "Choose rescue", exact: true }).click();
    await expect(page.locator("canvas")).toHaveCount(0);
    await expect(page.getByTestId(`rescue-progress-${wholeTurtleCare.rescue.id}`)).toHaveText("Zen complete");
    await page.getByRole("button", { name: /Whole Turtle Care/ }).click();
    const fresh = fixture === first ? second : first;
    await cleanArea(page, fresh);
    await expect(page.getByTestId("progress")).toHaveText(`${fresh.run.stages[0].targets.length * 10}%`);
    await page.getByRole("button", { name: "Main menu", exact: true }).click();
    await page.reload();
    await page.getByRole("button", { name: "Start rescue" }).click();
    await expect(page.getByTestId(`rescue-progress-${wholeTurtleCare.rescue.id}`)).toHaveText("Zen complete");
    await page.getByRole("button", { name: "Challenge", exact: true }).click();
    await expect(page.getByRole("button", { name: /Whole Turtle Care/ })).toHaveCount(0);
  });
}

test("underside fallback stays playable when its asset fails", async ({ page }, testInfo) => {
  test.setTimeout(60000);
  await page.route("**/turtle_body_ventral_v4.png", (route) => route.abort());
  await selectCare(page);
  await cleanArea(page);
  await nextArea(page);
  await expect(page.locator("canvas")).toHaveAttribute("data-animal-asset", "vector");
  await page.screenshot({ path: testInfo.outputPath("underside-vector-fallback.png"), fullPage: true });
  await cleanArea(page, first, 1);
  await expect(page.getByTestId("rescue-complete")).toBeVisible();
});

test("late dorsal assets and abandoned underside loading cannot overwrite the active view", async ({ page }) => {
  test.setTimeout(60000);
  let releaseDorsal!: () => void;
  let releaseVentral!: () => void;
  const dorsal = new Promise<void>((resolve) => { releaseDorsal = resolve; });
  const ventral = new Promise<void>((resolve) => { releaseVentral = resolve; });
  await page.route("**/turtle_body_base_v2.png", async (route) => { await dorsal; await route.continue(); });
  await page.route("**/turtle_body_ventral_v4.png", async (route) => { await ventral; await route.continue(); });
  await selectCare(page);
  await cleanArea(page);
  await nextArea(page);
  const response = page.waitForResponse("**/turtle_body_base_v2.png");
  releaseDorsal();
  await (await response).finished();
  await cleanArea(page, first, 1, 1);
  await expect(page.locator("canvas")).toHaveAttribute("data-body-view", "ventral");
  await expect(page.locator("canvas")).toHaveAttribute("data-animal-asset", "vector");
  await page.getByRole("button", { name: "Choose rescue", exact: true }).click();
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).completions, SAVE_KEY)).toEqual([]);
  await page.getByRole("button", { name: /Whole Turtle Care/ }).click();
  releaseVentral();
  await expect(page.locator("canvas")).toHaveAttribute("data-body-view", "dorsal");
  await expect(page.getByTestId("area-title")).toHaveText("Area 1 of 2 · Back and flippers");
  await expect(page.getByTestId("progress")).toHaveText("0%");
  await cleanArea(page, second);
  await expect(page.locator("canvas")).toHaveAttribute("data-body-view", "dorsal");
});
