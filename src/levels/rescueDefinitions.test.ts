import { describe, expect, it } from "vitest";
import {
  animalId,
  authoredTargetId,
  bodyViewId,
  cleanableRegionId,
  environmentId,
  rescueId,
  spawnRegionId,
  stageId,
} from "../domain/identifiers";
import {
  resolveRescueContent,
  type AnimalDefinition,
  type EnvironmentDefinition,
  type RescueCatalog,
  type RescueDefinition,
} from "./rescueDefinitions";

type TestGeometry = Readonly<{ kind: "ellipse" }>;

const asset = { src: "/test.png", fallback: "vector" } as const;
const turtleId = animalId("sea-turtle");
const rayId = animalId("ray");
const oceanId = environmentId("shallow-ocean");
const poolId = environmentId("rescue-pool");
const gentleStartId = rescueId("gentle-start");
const dorsalViewId = bodyViewId(turtleId, "dorsal");
const shellRegionId = cleanableRegionId(dorsalViewId, "shell");
const shellSpawnId = spawnRegionId(dorsalViewId, "shell-center");
const shellStageId = stageId(gentleStartId, "shell-care");
const shellView = {
  id: dorsalViewId,
  name: "Shell",
  asset,
  designSize: { width: 820, height: 560 },
  cleanableRegions: [{ id: shellRegionId, name: "Shell", geometry: { kind: "ellipse" }, exclusions: [] }],
  spawnRegions: [{
    id: shellSpawnId,
    cleanableRegionId: shellRegionId,
    geometry: { kind: "ellipse" },
    capacity: 3,
    weight: 1,
    fallbackAnchors: [{ x: 0, y: 0 }],
  }],
} as const;

const animals: readonly AnimalDefinition<TestGeometry>[] = [
  { id: turtleId, name: "Sea turtle", bodyViews: [shellView] },
  { id: rayId, name: "Ray", bodyViews: [] },
];

const environments: readonly EnvironmentDefinition[] = [
  { id: oceanId, name: "Shallow ocean", background: asset },
  { id: poolId, name: "Rescue pool", background: asset },
];

const rescue: RescueDefinition = {
  id: gentleStartId,
  name: "Gentle Start",
  description: "A fixed compatibility rescue.",
  animalId: turtleId,
  environmentId: oceanId,
  stages: [{
    id: shellStageId,
    name: "Shell",
    bodyViewId: dorsalViewId,
    placement: {
      kind: "fixed",
      targets: [{
        id: authoredTargetId(gentleStartId, "target-one"),
        spawnRegionId: shellSpawnId,
        type: "normal",
        x: 0,
        y: 0,
        diameter: 84,
      }],
    },
  }],
  spawnProfile: {
    targetCount: 1,
    hardTargetCount: 0,
    diameterRange: [84, 84],
    minimumAffectedRegions: 1,
    maximumAffectedRegions: 1,
    minimumTargetSpacing: 2,
    maximumPlacementAttemptsPerTarget: 20,
  },
  durability: { normalHp: 70, hardHp: 140 },
  challenge: { timeLimitSeconds: 75, animalHealth: 100, parScore: 750 },
};

function catalogWith(candidate: RescueDefinition): RescueCatalog<TestGeometry> {
  return { animals, environments, rescues: [candidate] };
}

describe("rescue definition contracts", () => {
  it("resolves the explicitly configured animal, environment and ordered body views", () => {
    const resolved = resolveRescueContent(catalogWith(rescue), rescue.id);

    expect(resolved.animal.id).toBe(turtleId);
    expect(resolved.environment.id).toBe(oceanId);
    expect(resolved.stages.map((stage) => stage.bodyView.id)).toEqual([dorsalViewId]);
    expect(resolved.rescue.stages[0].placement.kind).toBe("fixed");
  });

  it("does not imply animal and environment combinations without a rescue definition", () => {
    const catalog = catalogWith(rescue);

    expect(() => resolveRescueContent(catalog, rescueId("ray-at-rescue-pool"))).toThrow("Unknown rescue definition");
    expect(catalog.rescues).toHaveLength(1);
  });

  it("rejects unresolved animal, environment and body-view references", () => {
    expect(() => resolveRescueContent(catalogWith({ ...rescue, animalId: animalId("missing-animal") }), rescue.id))
      .toThrow("references unknown animal");
    expect(() => resolveRescueContent(catalogWith({
      ...rescue,
      environmentId: environmentId("missing-environment"),
    }), rescue.id))
      .toThrow("references unknown environment");
    expect(() => resolveRescueContent(catalogWith({
      ...rescue,
      stages: [{ ...rescue.stages[0], bodyViewId: bodyViewId(turtleId, "missing-view") }],
    }), rescue.id)).toThrow("references unknown view");
  });

  it("rejects duplicate authored target IDs across different stages", () => {
    const duplicateStage = {
      ...rescue.stages[0],
      id: stageId(gentleStartId, "second-area"),
    };
    expect(() => resolveRescueContent(catalogWith({
      ...rescue,
      stages: [rescue.stages[0], duplicateStage],
    }), rescue.id)).toThrow("Duplicate target ID");
  });
});
