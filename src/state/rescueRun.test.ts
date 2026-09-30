import { describe, expect, it } from "vitest";
import {
  animalId,
  bodyViewId,
  cleanableRegionId,
  environmentId,
  rescueId,
  spawnRegionId,
  stageId,
  type TargetId,
} from "../domain/identifiers";
import {
  resolveRescueContent,
  type RescueCatalog,
  type ResolvedRescueContent,
} from "../levels/rescueDefinitions";
import { assertValidRescueCatalog } from "../levels/rescueValidation";
import { wholeTurtleCare } from "../levels/levels";
import {
  abandonRescueRun,
  activeRescueStage,
  completedRescueStageIds,
  currentStageProgress,
  damageRescueTarget,
  finishRescueTargetDetachment,
  finishStageTransition,
  overallRescueProgress,
  prepareRescueRun,
  replayRescueRun,
  startStageTransition,
  type RescueRun,
} from "./rescueRun";

const turtleId = animalId("run-turtle");
const viewId = bodyViewId(turtleId, "care-view");
const cleanableId = cleanableRegionId(viewId, "body");
const firstSpawnId = spawnRegionId(viewId, "first-area");
const secondSpawnId = spawnRegionId(viewId, "second-area");
const oceanId = environmentId("run-ocean");
const generatedRescueId = rescueId("two-area-care");
const firstStageId = stageId(generatedRescueId, "first-area");
const secondStageId = stageId(generatedRescueId, "second-area");
const asset = { src: "/test.png", fallback: "vector" } as const;

function runContent(): ResolvedRescueContent {
  const catalog: RescueCatalog = {
    animals: [{
      id: turtleId,
      name: "Run turtle",
      bodyViews: [{
        id: viewId,
        name: "Care view",
        asset,
        designSize: { width: 500, height: 300 },
        cleanableRegions: [{
          id: cleanableId,
          name: "Body",
          geometry: { kind: "ellipse", center: { x: 0, y: 0 }, radiusX: 230, radiusY: 120, rotation: 0 },
          exclusions: [],
        }],
        spawnRegions: [
          {
            id: firstSpawnId,
            cleanableRegionId: cleanableId,
            geometry: { kind: "circle", center: { x: -120, y: 0 }, radius: 60 },
            capacity: 2,
            weight: 1,
            fallbackAnchors: [{ x: -140, y: 0 }, { x: -100, y: 0 }],
          },
          {
            id: secondSpawnId,
            cleanableRegionId: cleanableId,
            geometry: { kind: "circle", center: { x: 120, y: 0 }, radius: 60 },
            capacity: 2,
            weight: 1,
            fallbackAnchors: [{ x: 100, y: 0 }, { x: 140, y: 0 }],
          },
        ],
      }],
    }],
    environments: [{ id: oceanId, name: "Run ocean", background: asset }],
    rescues: [{
      id: generatedRescueId,
      name: "Two-area care",
      description: "Run-state fixture",
      animalId: turtleId,
      environmentId: oceanId,
      stages: [
        {
          id: firstStageId,
          name: "First area",
          bodyViewId: viewId,
          placement: { kind: "generated", spawnRegionIds: [firstSpawnId] },
        },
        {
          id: secondStageId,
          name: "Second area",
          bodyViewId: viewId,
          placement: { kind: "generated", spawnRegionIds: [secondSpawnId] },
        },
      ],
      spawnProfile: {
        targetCount: 4,
        hardTargetCount: 1,
        diameterRange: [18, 20],
        minimumAffectedRegions: 2,
        maximumAffectedRegions: 2,
        minimumTargetSpacing: 4,
        minimumTargetHitRadius: 12,
        maximumPlacementAttemptsPerTarget: 30,
      },
      durability: { normalHp: 80, hardHp: 160 },
      challenge: { timeLimitSeconds: 90, animalHealth: 100, parScore: 900 },
    }],
  };
  assertValidRescueCatalog(catalog);
  return resolveRescueContent(catalog, generatedRescueId);
}

function removeTarget(run: RescueRun, targetId: TargetId) {
  const damaged = damageRescueTarget(run, targetId, Number.MAX_SAFE_INTEGER);
  expect(damaged.startedBreaking).toBe(true);
  return finishRescueTargetDetachment(damaged.run, targetId);
}

describe("deterministic multi-stage rescue run", () => {
  it("prepares the approved Whole Turtle Care allocation across deterministic seeds", () => {
    for (let seed = 0; seed < 24; seed += 1) {
      const run = prepareRescueRun(wholeTurtleCare, seed);
      const targets = run.stages.flatMap((stage) => stage.targets);
      const affectedRegions = new Set(targets.map(({ placement }) => placement.spawnRegionId));

      expect(targets).toHaveLength(10);
      expect(targets.filter(({ placement }) => placement.type === "hard")).toHaveLength(2);
      expect(affectedRegions.size).toBe(7);
      expect(run.stages[0].targets.length).toBeGreaterThanOrEqual(6);
      expect(run.stages[0].targets.length).toBeLessThanOrEqual(7);
      expect(run.stages[1].targets.length).toBeGreaterThanOrEqual(3);
      expect(run.stages[1].targets.length).toBeLessThanOrEqual(4);
    }
  });

  it("prepares every stage and mutable target from one reproducible seed", () => {
    const content = runContent();
    const first = prepareRescueRun(content, "case-42");
    const sameCase = prepareRescueRun(content, "case-42");

    expect(sameCase).toEqual(first);
    expect(first).toMatchObject({
      rescueId: generatedRescueId,
      seed: "case-42",
      status: "playing",
      activeStageIndex: 0,
    });
    expect(first.stages.map((stage) => [stage.id, stage.status, stage.targets.length])).toEqual([
      [firstStageId, "active", 2],
      [secondStageId, "pending", 2],
    ]);
    expect(first.stages.flatMap((stage) => stage.targets)).toHaveLength(4);
    expect(first.stages.flatMap((stage) => stage.targets).filter(({ placement }) => placement.type === "hard"))
      .toHaveLength(1);
    for (const { placement, barnacle } of first.stages.flatMap((stage) => stage.targets)) {
      expect(barnacle).toMatchObject({
        id: placement.id,
        type: placement.type,
        x: placement.x,
        y: placement.y,
        size: placement.diameter / 2,
        hp: barnacle.maxHp,
        state: "intact",
      });
    }
  });

  it("updates only the active target and keeps progress removal-based", () => {
    const run = prepareRescueRun(runContent(), 7);
    const activeTarget = activeRescueStage(run).targets[0];
    const inactiveTarget = run.stages[1].targets[0];
    const ignored = damageRescueTarget(run, inactiveTarget.placement.id, 40);

    expect(ignored).toEqual({ run, startedBreaking: false });
    const cracked = damageRescueTarget(run, activeTarget.placement.id, activeTarget.barnacle.maxHp / 2);
    expect(cracked.run).not.toBe(run);
    expect(activeRescueStage(cracked.run).targets[0].barnacle.state).toBe("cracked");
    expect(activeRescueStage(run).targets[0].barnacle.state).toBe("intact");
    expect(currentStageProgress(cracked.run)).toBe(0);
    expect(overallRescueProgress(cracked.run)).toBe(0);
  });

  it("locks intermediate and final completion once while preserving weighted progress", () => {
    let run = prepareRescueRun(runContent(), 17);
    const firstIds = run.stages[0].targets.map(({ placement }) => placement.id);
    const firstRemoval = removeTarget(run, firstIds[0]);
    run = firstRemoval.run;
    expect(firstRemoval).toMatchObject({
      targetRemoved: true,
      completedStageId: null,
      rescueCompleted: false,
    });
    expect(currentStageProgress(run)).toBe(50);
    expect(overallRescueProgress(run)).toBe(25);

    const firstStageComplete = removeTarget(run, firstIds[1]);
    run = firstStageComplete.run;
    expect(firstStageComplete).toMatchObject({
      targetRemoved: true,
      completedStageId: firstStageId,
      rescueCompleted: false,
    });
    expect(run.status).toBe("awaiting-next-stage");
    expect(completedRescueStageIds(run)).toEqual([firstStageId]);
    expect(currentStageProgress(run)).toBe(100);
    expect(overallRescueProgress(run)).toBe(50);
    expect(finishRescueTargetDetachment(run, firstIds[1])).toEqual({
      run,
      targetRemoved: false,
      completedStageId: null,
      rescueCompleted: false,
    });

    const started = startStageTransition(run);
    expect(started.changed).toBe(true);
    expect(started.run.status).toBe("transitioning");
    expect(startStageTransition(started.run)).toEqual({ run: started.run, changed: false });
    const arrived = finishStageTransition(started.run);
    expect(arrived.changed).toBe(true);
    run = arrived.run;
    expect(run).toMatchObject({ status: "playing", activeStageIndex: 1 });
    expect(activeRescueStage(run).status).toBe("active");
    expect(currentStageProgress(run)).toBe(0);
    expect(overallRescueProgress(run)).toBe(50);
    expect(finishStageTransition(run)).toEqual({ run, changed: false });

    const finalIds = run.stages[1].targets.map(({ placement }) => placement.id);
    run = removeTarget(run, finalIds[0]).run;
    const completed = removeTarget(run, finalIds[1]);
    run = completed.run;
    expect(completed).toMatchObject({
      targetRemoved: true,
      completedStageId: secondStageId,
      rescueCompleted: true,
    });
    expect(run.status).toBe("complete");
    expect(completedRescueStageIds(run)).toEqual([firstStageId, secondStageId]);
    expect(overallRescueProgress(run)).toBe(100);
    expect(finishRescueTargetDetachment(run, finalIds[1])).toEqual({
      run,
      targetRemoved: false,
      completedStageId: null,
      rescueCompleted: false,
    });
  });

  it("replays the same case with fresh state and abandons every stage", () => {
    const content = runContent();
    const original = prepareRescueRun(content, 101);
    const targetId = original.stages[0].targets[0].placement.id;
    const changed = removeTarget(original, targetId).run;
    const replay = replayRescueRun(content, changed);

    expect(replay.seed).toBe(original.seed);
    expect(replay.stages.map((stage) => stage.targets.map(({ placement }) => placement)))
      .toEqual(original.stages.map((stage) => stage.targets.map(({ placement }) => placement)));
    expect(replay.status).toBe("playing");
    expect(replay.activeStageIndex).toBe(0);
    expect(replay.stages.map((stage) => stage.status)).toEqual(["active", "pending"]);
    for (const { barnacle } of replay.stages.flatMap((stage) => stage.targets)) {
      expect(barnacle).toMatchObject({ state: "intact", hp: barnacle.maxHp });
    }
    expect(abandonRescueRun(replay)).toBeNull();
  });
});
