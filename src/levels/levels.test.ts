import { describe, expect, it } from "vitest";
import { createBarnacle, damageBarnacle } from "../domain/barnacle";
import { isValidTargetPlacement } from "../domain/geometry";
import { levelBarnacles, levels, rescueBarnacles, rescueCatalog, rescues } from "./levels";

describe("level configurations", () => {
  it("resolves the MVP through three explicit one-stage rescue definitions", () => {
    expect(rescues.map((rescue) => rescue.content.rescue.id)).toEqual([
      "rescue/gentle-start",
      "rescue/shell-care",
      "rescue/full-rescue",
    ]);
    expect(rescues.map((rescue) => rescue.legacyLevelId)).toEqual([1, 2, 3]);
    expect(rescueCatalog.animals).toHaveLength(1);
    expect(rescueCatalog.environments).toHaveLength(1);
    for (const { content } of rescues) {
      expect(content.rescue.stages).toHaveLength(1);
      expect(content.rescue.stages[0].placement.kind).toBe("fixed");
      expect(content.stages[0].bodyView.id).toBe("animal/sea-turtle/view/dorsal");
      expect(content.environment.id).toBe("environment/shallow-ocean");
    }
  });

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

  it("keeps every fixed target inside its configured spawn region", () => {
    for (const { content } of rescues) {
      const view = content.stages[0].bodyView;
      const stage = content.rescue.stages[0];
      if (stage.placement.kind !== "fixed") throw new Error("MVP compatibility rescue must use fixed placement");
      for (const target of stage.placement.targets) {
        const spawn = view.spawnRegions.find((region) => region.id === target.spawnRegionId);
        if (!spawn) throw new Error(`Missing spawn region: ${target.spawnRegionId}`);
        const cleanable = view.cleanableRegions.find((region) => region.id === spawn.cleanableRegionId);
        if (!cleanable) throw new Error(`Missing cleanable region: ${spawn.cleanableRegionId}`);
        expect(isValidTargetPlacement(
          { x: target.x, y: target.y },
          target.diameter / 2,
          12,
          spawn.geometry,
          cleanable.exclusions,
        )).toBe(true);
      }
    }
  });

  it("preserves the frozen authored coordinates through the derived compatibility view", () => {
    expect(levels.map((level) => level.placements.map(({ x, y, diameter, type }) => [x, y, diameter, type]))).toEqual([
      [[-110, -30, 96, "normal"], [0, 45, 84, "normal"], [110, -30, 88, "normal"]],
      [[-120, -55, 78, "normal"], [120, -55, 74, "normal"], [-120, 55, 70, "normal"], [120, 55, 66, "normal"], [0, 0, 90, "hard"]],
      [[-130, -55, 68, "normal"], [0, -88, 62, "normal"], [130, -55, 72, "hard"], [-130, 55, 72, "hard"], [0, 88, 56, "normal"], [130, 55, 64, "normal"], [0, 0, 84, "normal"]],
    ]);
  });

  it("creates fresh state for replay without mutating level data", () => {
    const config = JSON.stringify(levels);
    const first = rescueBarnacles(rescues[2].content.rescue).map(createBarnacle);
    first[0] = damageBarnacle(first[0], 1000).barnacle;
    const replay = rescueBarnacles(rescues[2].content.rescue).map(createBarnacle);
    expect(replay[0].state).toBe("intact");
    expect(replay[0].hp).toBe(replay[0].maxHp);
    expect(JSON.stringify(levels)).toBe(config);
  });
});
