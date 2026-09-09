import { expect, test } from "@playwright/test";

test("dragging repeatedly across the barnacle completes the rescue", async ({ page }) => {
  await page.goto("/");
  const canvas = page.getByRole("application", { name: "Sea turtle rescue area" });
  await expect(canvas).toBeVisible();
  await expect(page.getByTestId("progress")).toHaveText("0%");

  const box = await canvas.boundingBox();
  if (!box) throw new Error("game canvas has no bounding box");
  const centerX = box.x + box.width * 0.5;
  const centerY = box.y + box.height * 0.55;

  await page.mouse.move(centerX - 55, centerY - 6);
  await page.mouse.down();
  for (let index = 0; index < 8; index += 1) {
    await page.mouse.move(centerX - 15, centerY - 6, { steps: 3 });
    await page.mouse.move(centerX + 35, centerY - 6, { steps: 3 });
  }
  await page.mouse.up();

  await expect(page.getByTestId("rescue-complete")).toContainText("Rescue Complete!");
  await expect(page.getByTestId("progress")).toHaveText("100%");
});

test("a click without movement does not damage the barnacle", async ({ page }) => {
  await page.goto("/");
  const canvas = page.getByRole("application", { name: "Sea turtle rescue area" });
  const box = await canvas.boundingBox();
  if (!box) throw new Error("game canvas has no bounding box");

  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.55);
  await expect(page.getByTestId("progress")).toHaveText("0%");
  await expect(page.getByTestId("rescue-complete")).toHaveCount(0);
});
