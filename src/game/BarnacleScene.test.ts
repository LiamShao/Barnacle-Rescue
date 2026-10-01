import { Application, Container } from "pixi.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rescues } from "../levels/levels";
import { BarnacleScene } from "./BarnacleScene";

describe("BarnacleScene initialization cancellation", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function createScene() {
    const callbacks = {
      onDamage: vi.fn(), onComplete: vi.fn(), onAnimalChange: vi.fn(), onChallengeChange: vi.fn(),
    };
    return { callbacks, scene: new BarnacleScene(document.createElement("div"), callbacks, rescues[0].content, "zen") };
  }

  it("releases every owned display object when navigation cancels pending initialization", async () => {
    let finish!: () => void;
    let stage!: Container;
    vi.spyOn(Application.prototype, "init").mockImplementation(function (this: Application) {
      stage = this.stage;
      return new Promise<void>((resolve) => { finish = resolve; });
    });
    // Exercise the real display tree, replacing only the absent GPU renderer teardown.
    const destroy = vi.spyOn(Application.prototype, "destroy").mockImplementation(function (this: Application, _renderer, options) {
      this.stage.destroy(options);
    });
    const { scene, callbacks } = createScene();
    const pending = scene.start();
    const objects: Container[] = [];
    const visit = (container: Container) => {
      objects.push(container);
      container.children.forEach(visit);
    };
    visit(stage);
    expect(objects.length).toBeGreaterThan(20);
    scene.destroy();
    scene.destroy();
    expect(destroy).not.toHaveBeenCalled();
    finish();
    await pending;
    expect(destroy).toHaveBeenCalledExactlyOnceWith({ removeView: true }, { children: true });
    expect(objects.every((object) => object.destroyed)).toBe(true);
    expect(callbacks.onAnimalChange).not.toHaveBeenCalled();
    expect(callbacks.onComplete).not.toHaveBeenCalled();
  });

  it("does not allocate a renderer when destroyed before start", async () => {
    const init = vi.spyOn(Application.prototype, "init");
    const { scene } = createScene();
    scene.destroy();
    await scene.start();
    expect(init).not.toHaveBeenCalled();
  });

  it("releases the display tree when renderer initialization rejects", async () => {
    let stage!: Container;
    const error = new Error("renderer unavailable");
    vi.spyOn(Application.prototype, "init").mockImplementation(function (this: Application) {
      stage = this.stage;
      return Promise.reject(error);
    });
    const { scene, callbacks } = createScene();
    await expect(scene.start()).rejects.toBe(error);
    expect(stage.destroyed).toBe(true);
    expect(callbacks.onAnimalChange).not.toHaveBeenCalled();
    scene.destroy();
  });
});
