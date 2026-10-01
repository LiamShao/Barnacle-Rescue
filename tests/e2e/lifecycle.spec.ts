import { expect, test } from "@playwright/test";

test("repeated rescue navigation releases WebGL contexts and leaves one playable scene", async ({ page }) => {
  const errors: string[] = [];
  // The app has no favicon; exclude its unrelated browser-generated 404.
  await page.route("**/favicon.ico", (route) => route.fulfill({ status: 204 }));
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.addInitScript(() => {
    const contexts = new Set<WebGLRenderingContext | WebGL2RenderingContext>();
    Object.assign(window, {
      // Pixi also retains a shader-capability probe; only count rescue renderers.
      activeGameContexts: () => [...contexts].filter((context) => (
        context.canvas instanceof HTMLCanvasElement
        && context.canvas.getAttribute("role") === "application"
        && !context.isContextLost()
      )).length,
    });
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (...args) {
      const context = Reflect.apply(original, this, args);
      if (args[0] === "webgl" || args[0] === "webgl2") {
        if (context) contexts.add(context);
      }
      return context;
    } as typeof original;
  });
  const activeContexts = () => page.evaluate(() => (
    window as unknown as { activeGameContexts: () => number }
  ).activeGameContexts());

  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Start rescue" }).click();
  await page.getByRole("button", { name: "Zen", exact: true }).click();
  for (let run = 0; run < 12; run += 1) {
    await page.getByRole("button", { name: /Gentle Start/ }).click();
    await expect(page.getByRole("application", { name: "Sea turtle rescue area" })).toBeVisible();
    await expect(page.locator("canvas")).toHaveCount(1);
    await expect.poll(activeContexts).toBe(1);
    await page.getByRole("button", { name: "Choose rescue", exact: true }).click();
    await expect(page.locator("canvas")).toHaveCount(0);
    await expect.poll(activeContexts).toBe(0);
  }
  expect(errors).toEqual([]);
});
