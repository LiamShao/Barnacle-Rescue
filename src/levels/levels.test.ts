import { describe, expect, it } from "vitest";
import { createBarnacle, damageBarnacle } from "../domain/barnacle";
import { levelBarnacles, levels } from "./levels";

describe("level configurations", () => {
  it("progresses through three distinct rescues with increasing cleaning work", () => {
    expect(levels.map((level) => level.id)).toEqual([1, 2, 3]);
    expect(levels.map((level) => level.barnacleCount)).toEqual([3, 5, 7]);
    expect(levels.map((level) => level.hardBarnacleCount)).toEqual([0, 1, 2]);
    const totalHp = levels.map((level) => levelBarnacles(level).reduce((sum, target) => sum + target.maxHp, 0));
    expect(totalHp[0]).toBeLessThan(totalHp[1]);
    expect(totalHp[1]).toBeLessThan(totalHp[2]);
  });

  for (const level of levels) {
    it(`${level.name}: validates tuning, containment and non-overlapping hit areas`, () => {
      const targets = levelBarnacles(level);
      expect(targets).toHaveLength(level.barnacleCount);
      expect(targets.filter((target) => target.type === "hard")).toHaveLength(level.hardBarnacleCount);
      expect(new Set(targets.map((target) => target.id)).size).toBe(targets.length);
      expect(level.timeLimitSeconds).toBeGreaterThan(0);
      expect(level.animalHealth).toBeGreaterThan(0);
      for (const target of targets) {
        expect(target.maxHp).toBe(target.type === "hard" ? level.hardBarnacleHp : level.normalBarnacleHp);
        expect(target.maxHp).toBeGreaterThan(0);
        expect(target.size * 2).toBeGreaterThanOrEqual(level.barnacleSizeRange[0]);
        expect(target.size * 2).toBeLessThanOrEqual(level.barnacleSizeRange[1]);
        // Conservative ellipse bound: full circle stays inside the cleanable shell.
        expect(Math.hypot(target.x / 235, target.y / 145) + (target.size + 3) / 145).toBeLessThan(1);
        for (const other of targets.filter((other) => other.id !== target.id)) {
          for (const scale of [1, 282 / 820, 352 / 820]) {
            const separation = Math.hypot(target.x - other.x, target.y - other.y) * scale;
            expect(separation).toBeGreaterThan(Math.max(12, target.size * scale) + Math.max(12, other.size * scale) + 2);
          }
        }
      }
    });
  }

  it("creates fresh state for replay without mutating level data", () => {
    const config = JSON.stringify(levels);
    const first = levelBarnacles(levels[2]).map(createBarnacle);
    first[0] = damageBarnacle(first[0], 1000).barnacle;
    const replay = levelBarnacles(levels[2]).map(createBarnacle);
    expect(replay[0].state).toBe("intact");
    expect(replay[0].hp).toBe(replay[0].maxHp);
    expect(JSON.stringify(levels)).toBe(config);
  });
});
