import { describe, expect, it } from "vitest";
import { distance, isValidTargetPlacement, type CleanableGeometry } from "../domain/geometry";
import {
  animalId,
  bodyViewId,
  cleanableRegionId,
  environmentId,
  generatedTargetId,
  rescueId,
  spawnRegionId,
  stageId,
} from "../domain/identifiers";
import { rescues } from "./levels";
import {
  generateRescueLayout,
  PlacementGenerationError,
  type RescueSeed,
} from "./generatedPlacement";
import {
  resolveRescueContent,
  type RescueCatalog,
  type ResolvedRescueContent,
  type SpawnRegion,
} from "./rescueDefinitions";
import { assertValidRescueCatalog } from "./rescueValidation";

const turtleId = animalId("placement-turtle");
const viewId = bodyViewId(turtleId, "dorsal");
const surfaceId = cleanableRegionId(viewId, "body");
const oceanId = environmentId("placement-ocean");
const generatedRescueId = rescueId("generated-care");
const firstStageId = stageId(generatedRescueId, "upper-care");
const secondStageId = stageId(generatedRescueId, "lower-care");
const asset = { src: "/test.png", fallback: "vector" } as const;
const cleanableGeometry: CleanableGeometry = {
  kind: "polygon",
  points: [{ x: -230, y: -170 }, { x: 230, y: -170 }, { x: 230, y: 170 }, { x: -230, y: 170 }],
};
const exclusion: CleanableGeometry = { kind: "circle", center: { x: 0, y: 0 }, radius: 18 };

function spawn(
  key: string,
  geometry: CleanableGeometry,
  weight: number,
  fallbackAnchors: readonly Readonly<{ x: number; y: number }>[],
): SpawnRegion {
  return {
    id: spawnRegionId(viewId, key),
    cleanableRegionId: surfaceId,
    geometry,
    capacity: 3,
    weight,
    fallbackAnchors,
  };
}

const spawnRegions: readonly SpawnRegion[] = [
  spawn("left", { kind: "circle", center: { x: -150, y: 0 }, radius: 50 }, 1, [
    { x: -175, y: 0 }, { x: -125, y: 0 }, { x: -150, y: 30 },
  ]),
  spawn("right", {
    kind: "ellipse", center: { x: 150, y: 0 }, radiusX: 55, radiusY: 42, rotation: Math.PI / 7,
  }, 2, [{ x: 125, y: 0 }, { x: 175, y: 0 }, { x: 150, y: 28 }]),
  spawn("upper", {
    kind: "capsule", start: { x: -50, y: -100 }, end: { x: 50, y: -100 }, radius: 26,
  }, 3, [{ x: -40, y: -100 }, { x: 0, y: -100 }, { x: 40, y: -100 }]),
  spawn("lower", {
    kind: "polygon",
    points: [{ x: -55, y: 75 }, { x: 55, y: 75 }, { x: 55, y: 135 }, { x: -55, y: 135 }],
  }, 4, [{ x: -35, y: 105 }, { x: 0, y: 105 }, { x: 35, y: 105 }]),
];

function generatedCatalog(): RescueCatalog {
  return {
    animals: [{
      id: turtleId,
      name: "Placement turtle",
      bodyViews: [{
        id: viewId,
        name: "Dorsal",
        asset,
        designSize: { width: 500, height: 360 },
        cleanableRegions: [{
          id: surfaceId,
          name: "Body",
          geometry: cleanableGeometry,
          exclusions: [exclusion],
        }],
        spawnRegions,
      }],
    }],
    environments: [{ id: oceanId, name: "Placement ocean", background: asset }],
    rescues: [{
      id: generatedRescueId,
      name: "Generated care",
      description: "Placement test fixture",
      animalId: turtleId,
      environmentId: oceanId,
      stages: [
        {
          id: firstStageId,
          name: "Upper care",
          bodyViewId: viewId,
          placement: { kind: "generated", spawnRegionIds: [spawnRegions[0].id, spawnRegions[1].id] },
        },
        {
          id: secondStageId,
          name: "Lower care",
          bodyViewId: viewId,
          placement: { kind: "generated", spawnRegionIds: [spawnRegions[2].id, spawnRegions[3].id] },
        },
      ],
      spawnProfile: {
        targetCount: 8,
        hardTargetCount: 3,
        diameterRange: [18, 26],
        minimumAffectedRegions: 2,
        maximumAffectedRegions: 4,
        minimumTargetSpacing: 4,
        minimumTargetHitRadius: 14,
        maximumPlacementAttemptsPerTarget: 40,
      },
      durability: { normalHp: 80, hardHp: 160 },
      challenge: { timeLimitSeconds: 90, animalHealth: 100, parScore: 900 },
    }],
  };
}

function generatedContent(): ResolvedRescueContent {
  const catalog = generatedCatalog();
  assertValidRescueCatalog(catalog);
  return resolveRescueContent(catalog, generatedRescueId);
}

describe("seeded constrained placement", () => {
  it("reproduces a complete layout from the same typed seed", () => {
    const content = generatedContent();
    const first = generateRescueLayout(content, 42);
    const replay = generateRescueLayout(content, 42);
    const stringSeed = generateRescueLayout(content, "42");

    expect(replay).toEqual(first);
    expect(stringSeed.targets).not.toEqual(first.targets);
    expect(first.targets).toHaveLength(8);
    expect(first.targets.filter((target) => target.type === "hard")).toHaveLength(3);
    expect(new Set(first.targets.map((target) => target.id)).size).toBe(8);
    expect(first.targets.map((target) => target.id)).toEqual(
      first.targets.map((_, index) => generatedTargetId(generatedRescueId, 42, index)),
    );
    expect(new Set(first.targets.map((target) => target.stageId))).toEqual(new Set([firstStageId, secondStageId]));
  });

  it("honors region limits, geometry, exclusions, touch radius, spacing, and capacity across seeds", () => {
    const content = generatedContent();
    const seenRegions = new Set<string>();
    for (let seed = 0; seed < 40; seed += 1) {
      const layout = generateRescueLayout(content, seed);
      const affected = new Set(layout.targets.map((target) => `${target.stageId}|${target.spawnRegionId}`));
      expect(affected.size).toBeGreaterThanOrEqual(2);
      expect(affected.size).toBeLessThanOrEqual(4);
      expect(new Set(layout.targets.map((target) => target.stageId)).size).toBe(2);
      for (const target of layout.targets) {
        seenRegions.add(target.spawnRegionId);
        const stage = content.stages.find((candidate) => candidate.definition.id === target.stageId)!;
        const region = stage.bodyView.spawnRegions.find((candidate) => candidate.id === target.spawnRegionId)!;
        const cleanable = stage.bodyView.cleanableRegions.find(
          (candidate) => candidate.id === region.cleanableRegionId,
        )!;
        expect(target.diameter).toBeGreaterThanOrEqual(18);
        expect(target.diameter).toBeLessThanOrEqual(26);
        expect(isValidTargetPlacement(
          target,
          target.diameter / 2,
          14,
          region.geometry,
          cleanable.exclusions,
        )).toBe(true);
        expect(isValidTargetPlacement(
          target,
          target.diameter / 2,
          14,
          cleanable.geometry,
          cleanable.exclusions,
        )).toBe(true);
        expect(layout.targets.filter((candidate) => (
          candidate.stageId === target.stageId && candidate.spawnRegionId === target.spawnRegionId
        )).length).toBeLessThanOrEqual(region.capacity);
      }
      for (let leftIndex = 0; leftIndex < layout.targets.length; leftIndex += 1) {
        for (let rightIndex = leftIndex + 1; rightIndex < layout.targets.length; rightIndex += 1) {
          const left = layout.targets[leftIndex];
          const right = layout.targets[rightIndex];
          if (left.stageId !== right.stageId) continue;
          expect(distance(left, right)).toBeGreaterThanOrEqual(
            Math.max(14, left.diameter / 2) + Math.max(14, right.diameter / 2) + 4,
          );
        }
      }
    }
    expect(seenRegions).toEqual(new Set(spawnRegions.map((region) => region.id)));
  });

  it("applies configured region weights across a deterministic seed sweep", () => {
    const content = generatedContent();
    const counts = new Map(spawnRegions.map((region) => [region.id, 0]));
    for (let seed = 1000; seed < 1200; seed += 1) {
      const affected = new Set(generateRescueLayout(content, seed).targets.map((target) => target.spawnRegionId));
      for (const regionId of affected) counts.set(regionId, counts.get(regionId)! + 1);
    }

    expect(counts.get(spawnRegions[1].id)!).toBeGreaterThan(counts.get(spawnRegions[0].id)!);
    expect(counts.get(spawnRegions[3].id)!).toBeGreaterThan(counts.get(spawnRegions[2].id)!);
  });

  it("uses a deterministic authored fallback when bounded sampling cannot fit", () => {
    const content = fallbackContent([{ x: 0, y: 0 }]);
    const layout = generateRescueLayout(content, 7);

    expect(layout.targets).toHaveLength(1);
    expect(layout.targets[0]).toMatchObject({ x: 0, y: 0, diameter: 28 });
  });

  it("rejects an impossible generated layout after bounded attempts", () => {
    const content = fallbackContent([{ x: 40, y: 40 }]);
    expect(() => generateRescueLayout(content, 7)).toThrow(PlacementGenerationError);
    expect(() => generateRescueLayout(content, 7)).toThrow("No valid sampled point or fallback anchor");
  });

  it("projects every frozen fixed layout unchanged for any seed", () => {
    for (const rescue of rescues) {
      const first = generateRescueLayout(rescue.content, 1).targets;
      const nextSeed = generateRescueLayout(rescue.content, 2).targets;
      const expected = rescue.content.stages.flatMap(({ definition, bodyView }) => {
        if (definition.placement.kind !== "fixed") return [];
        return definition.placement.targets.map((target) => ({
          ...target,
          stageId: definition.id,
          bodyViewId: bodyView.id,
        }));
      });
      expect(first).toEqual(expected);
      expect(nextSeed).toEqual(expected);
    }
  });

  it.each([Number.NaN, 1.5, ""] as RescueSeed[])("rejects invalid seed %p", (seed) => {
    expect(() => generateRescueLayout(generatedContent(), seed)).toThrow(PlacementGenerationError);
  });
});

function fallbackContent(fallbackAnchors: readonly Readonly<{ x: number; y: number }>[]): ResolvedRescueContent {
  const id = rescueId("fallback-care");
  const singleStageId = stageId(id, "only-area");
  const region = spawn("fallback", { kind: "circle", center: { x: 0, y: 0 }, radius: 14 }, 1, fallbackAnchors);
  const catalog: RescueCatalog = {
    animals: [{
      id: turtleId,
      name: "Placement turtle",
      bodyViews: [{
        id: viewId,
        name: "Dorsal",
        asset,
        designSize: { width: 100, height: 100 },
        cleanableRegions: [{
          id: surfaceId,
          name: "Body",
          geometry: { kind: "circle", center: { x: 0, y: 0 }, radius: 40 },
          exclusions: [],
        }],
        spawnRegions: [{ ...region, capacity: 1 }],
      }],
    }],
    environments: [{ id: oceanId, name: "Placement ocean", background: asset }],
    rescues: [{
      id,
      name: "Fallback care",
      description: "Fallback test fixture",
      animalId: turtleId,
      environmentId: oceanId,
      stages: [{
        id: singleStageId,
        name: "Only area",
        bodyViewId: viewId,
        placement: { kind: "generated", spawnRegionIds: [region.id] },
      }],
      spawnProfile: {
        targetCount: 1,
        hardTargetCount: 0,
        diameterRange: [28, 28],
        minimumAffectedRegions: 1,
        maximumAffectedRegions: 1,
        minimumTargetSpacing: 0,
        minimumTargetHitRadius: 14,
        maximumPlacementAttemptsPerTarget: 2,
      },
      durability: { normalHp: 50, hardHp: 100 },
      challenge: { timeLimitSeconds: 30, animalHealth: 100, parScore: 100 },
    }],
  };
  return resolveRescueContent(catalog, id);
}
