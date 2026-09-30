import { Texture } from "pixi.js";
import { describe, expect, it } from "vitest";
import { createAnimal } from "../domain/animal";
import { TurtleView } from "./TurtleView";

describe("TurtleView presentations", () => {
  it("keeps the existing dorsal presentation as the default", () => {
    const turtle = new TurtleView();

    expect(turtle.presentation).toBe("dorsal");
    expect(turtle.usesRasterAsset).toBe(false);
  });

  it("provides a complete centered ventral vector fallback", () => {
    const turtle = new TurtleView("ventral");
    const bounds = turtle.getLocalBounds();

    expect(turtle.usesRasterAsset).toBe(false);
    expect(bounds.minX).toBeLessThanOrEqual(-337);
    expect(bounds.maxX).toBeGreaterThanOrEqual(349);
    expect(bounds.minY).toBeLessThanOrEqual(-241);
    expect(bounds.maxY).toBeGreaterThanOrEqual(241);
    expect(() => turtle.animate(createAnimal(), 1)).not.toThrow();
  });

  it("replaces the vector fallback only after a raster texture is supplied", () => {
    const turtle = new TurtleView("ventral");

    turtle.useAsset(Texture.WHITE);

    expect(turtle.usesRasterAsset).toBe(true);
  });
});
