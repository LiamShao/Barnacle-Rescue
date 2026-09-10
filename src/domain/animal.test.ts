import { describe, expect, it } from "vitest";
import { advanceAnimal, animalAfterRemoval, celebrationFinished, createAnimal, deriveMood, reactAnimal } from "./animal";

describe("animal mood and reactions", () => {
  it.each([[-1, "sad"], [24.9, "sad"], [25, "neutral"], [59.9, "neutral"], [60, "relaxed"], [89.9, "relaxed"], [90, "happy"], [100, "happy"], [120, "happy"], [NaN, "sad"]] as const)("derives mood at %s percent", (progress, mood) => {
    expect(deriveMood(progress)).toBe(mood);
  });

  it("returns from relief to the latest progress-derived mood", () => {
    const first = animalAfterRemoval(createAnimal(), 33);
    const second = animalAfterRemoval(advanceAnimal(first, 0.8), 67);
    expect(second).toEqual({ mood: "relaxed", reaction: "relief", elapsed: 0 });
    expect(advanceAnimal(second, 1.2)).toEqual({ mood: "relaxed", reaction: "idle", elapsed: 0 });
    expect(advanceAnimal(animalAfterRemoval(createAnimal(), 10), 1.2).mood).toBe("sad");
  });

  it("lets hurt interrupt relief without losing the mood", () => {
    const hurt = reactAnimal(animalAfterRemoval(createAnimal(), 67), "hurt");
    expect(reactAnimal(hurt, "relief")).toBe(hurt);
    expect(advanceAnimal(hurt, 0.5)).toEqual({ mood: "relaxed", reaction: "idle", elapsed: 0 });
  });

  it("locks celebration against ordinary reactions and repeated completion", () => {
    const celebrating = advanceAnimal(animalAfterRemoval(createAnimal(), 100), 1);
    expect(celebrationFinished(celebrating)).toBe(false);
    expect(reactAnimal(celebrating, "hurt")).toBe(celebrating);
    expect(animalAfterRemoval(celebrating, 100)).toBe(celebrating);
    expect(celebrationFinished(advanceAnimal(celebrating, 1))).toBe(true);
    expect(createAnimal()).toEqual({ mood: "sad", reaction: "idle", elapsed: 0 });
  });
});
