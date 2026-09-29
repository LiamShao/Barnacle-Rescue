import { describe, expect, it } from "vitest";
import { authoredTargetId, rescueId, spawnRegionId } from "../domain/identifiers";
import { rescueCatalog } from "./levels";
import type {
  BodyViewDefinition,
  FixedTargetPlacement,
  RescueCatalog,
  RescueDefinition,
} from "./rescueDefinitions";
import { assertValidRescueCatalog } from "./rescueValidation";

function withFirstRescue(update: (rescue: RescueDefinition) => RescueDefinition): RescueCatalog {
  return { ...rescueCatalog, rescues: [update(rescueCatalog.rescues[0]), ...rescueCatalog.rescues.slice(1)] };
}

function withFirstView(update: (view: BodyViewDefinition) => BodyViewDefinition): RescueCatalog {
  const animal = rescueCatalog.animals[0];
  return {
    ...rescueCatalog,
    animals: [{ ...animal, bodyViews: [update(animal.bodyViews[0]), ...animal.bodyViews.slice(1)] }, ...rescueCatalog.animals.slice(1)],
  };
}

function withFirstTarget(update: (target: FixedTargetPlacement) => FixedTargetPlacement): RescueCatalog {
  return withFirstRescue((rescue) => {
    const stage = rescue.stages[0];
    if (stage.placement.kind !== "fixed") throw new Error("Compatibility fixture must use fixed placement");
    return {
      ...rescue,
      stages: [{
        ...stage,
        placement: {
          kind: "fixed",
          targets: [update(stage.placement.targets[0]), ...stage.placement.targets.slice(1)],
        },
      }, ...rescue.stages.slice(1)],
    };
  });
}

describe("rescue catalog validation", () => {
  it("accepts the complete fixed-placement compatibility catalog", () => {
    expect(() => assertValidRescueCatalog(rescueCatalog)).not.toThrow();
  });

  it("rejects duplicate catalog identities and targets outside their rescue scope", () => {
    expect(() => assertValidRescueCatalog({
      ...rescueCatalog,
      rescues: [...rescueCatalog.rescues, rescueCatalog.rescues[0]],
    })).toThrow("Duplicate rescue ID");

    expect(() => assertValidRescueCatalog(withFirstTarget((target) => ({
      ...target,
      id: authoredTargetId(rescueId("another-rescue"), "target-1"),
    })))).toThrow("outside its configured scope");
  });

  it("rejects invalid cleanable geometry and fallback anchors", () => {
    expect(() => assertValidRescueCatalog(withFirstView((view) => ({
      ...view,
      cleanableRegions: [{
        ...view.cleanableRegions[0],
        geometry: { kind: "ellipse", center: { x: 0, y: 0 }, radiusX: 0, radiusY: 145, rotation: 0 },
      }],
    })))).toThrow("invalid geometry");

    expect(() => assertValidRescueCatalog(withFirstView((view) => ({
      ...view,
      spawnRegions: [{ ...view.spawnRegions[0], fallbackAnchors: [{ x: 1000, y: 1000 }] }],
    })))).toThrow("fallback anchor outside");
  });

  it("rejects unknown placement regions and targets outside configured bounds", () => {
    const view = rescueCatalog.animals[0].bodyViews[0];
    expect(() => assertValidRescueCatalog(withFirstTarget((target) => ({
      ...target,
      spawnRegionId: spawnRegionId(view.id, "missing"),
    })))).toThrow("unknown spawn region");

    expect(() => assertValidRescueCatalog(withFirstTarget((target) => ({
      ...target,
      x: 1000,
    })))).toThrow("outside its configured cleanable spawn surface");
  });

  it("rejects target tuning mismatches, capacity overflow, and overlap", () => {
    expect(() => assertValidRescueCatalog(withFirstRescue((rescue) => ({
      ...rescue,
      spawnProfile: { ...rescue.spawnProfile, targetCount: rescue.spawnProfile.targetCount + 1 },
    })))).toThrow("fixed targets do not match its configured totals");

    expect(() => assertValidRescueCatalog(withFirstView((view) => ({
      ...view,
      spawnRegions: [{ ...view.spawnRegions[0], capacity: 2 }],
    })))).toThrow("exceeds capacity");

    expect(() => assertValidRescueCatalog(withFirstRescue((rescue) => {
      const stage = rescue.stages[0];
      if (stage.placement.kind !== "fixed") throw new Error("Compatibility fixture must use fixed placement");
      const [first, second, ...remaining] = stage.placement.targets;
      return {
        ...rescue,
        stages: [{
          ...stage,
          placement: {
            kind: "fixed",
            targets: [first, { ...second, x: first.x, y: first.y }, ...remaining],
          },
        }],
      };
    }))).toThrow("overlap");
  });

  it("validates generated-stage references without generating a layout", () => {
    const invalid = withFirstRescue((rescue) => {
      const stage = rescue.stages[0];
      return {
        ...rescue,
        stages: [{
          ...stage,
          placement: {
            kind: "generated",
            spawnRegionIds: [spawnRegionId(stage.bodyViewId, "missing")],
          },
        }],
      };
    });

    expect(() => assertValidRescueCatalog(invalid)).toThrow("unknown spawn region");
  });
});
