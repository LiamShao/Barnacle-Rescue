import {
  createBarnacle,
  damageBarnacle,
  finishDetachment,
  isRescueComplete,
  rescueProgress,
  type Barnacle,
} from "../domain/barnacle";
import type { RescueId, StageId, TargetId } from "../domain/identifiers";
import {
  generateRescueLayout,
  type RescueLayout,
  type RescueSeed,
} from "../levels/generatedPlacement";
import type {
  ResolvedRescueContent,
  TargetPlacement,
} from "../levels/rescueDefinitions";

export type RescueRunStatus = "playing" | "awaiting-next-stage" | "transitioning" | "complete";
export type RescueStageStatus = "pending" | "active" | "complete";

export type RescueRunTarget = Readonly<{
  placement: TargetPlacement;
  barnacle: Barnacle;
}>;

export type RescueRunStage = Readonly<{
  id: StageId;
  name: string;
  status: RescueStageStatus;
  targets: readonly RescueRunTarget[];
}>;

export type RescueRun = Readonly<{
  rescueId: RescueId;
  seed: RescueSeed;
  status: RescueRunStatus;
  activeStageIndex: number;
  stages: readonly RescueRunStage[];
}>;

export type TargetDamageUpdate = Readonly<{
  run: RescueRun;
  startedBreaking: boolean;
}>;

export type TargetRemovalUpdate = Readonly<{
  run: RescueRun;
  targetRemoved: boolean;
  completedStageId: StageId | null;
  rescueCompleted: boolean;
}>;

export type StageTransitionUpdate = Readonly<{
  run: RescueRun;
  changed: boolean;
}>;

export class RescueRunPreparationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RescueRunPreparationError";
  }
}

/** Generates and validates the complete immutable case before gameplay starts. */
export function prepareRescueRun(content: ResolvedRescueContent, seed: RescueSeed): RescueRun {
  return createRunFromLayout(content, generateRescueLayout(content, seed));
}

/** Rebuilds every stage from the original seed with fresh target state. */
export function replayRescueRun(content: ResolvedRescueContent, run: RescueRun): RescueRun {
  if (content.rescue.id !== run.rescueId) {
    throw new RescueRunPreparationError(
      `Cannot replay ${run.rescueId} with content for ${content.rescue.id}`,
    );
  }
  return prepareRescueRun(content, run.seed);
}

/** Active runs are session-only; abandonment deliberately retains nothing. */
export function abandonRescueRun(run: RescueRun): null {
  void run;
  return null;
}

export function activeRescueStage(run: RescueRun): RescueRunStage {
  return run.stages[run.activeStageIndex];
}

export function completedRescueStageIds(run: RescueRun): readonly StageId[] {
  return run.stages.filter((stage) => stage.status === "complete").map((stage) => stage.id);
}

export function currentStageProgress(run: RescueRun): number {
  return rescueProgress(activeRescueStage(run).targets.map(({ barnacle }) => barnacle));
}

export function overallRescueProgress(run: RescueRun): number {
  return rescueProgress(run.stages.flatMap((stage) => stage.targets.map(({ barnacle }) => barnacle)));
}

/** Damage is accepted only for a target in the currently playable stage. */
export function damageRescueTarget(
  run: RescueRun,
  targetId: TargetId,
  amount: number,
): TargetDamageUpdate {
  if (run.status !== "playing") return { run, startedBreaking: false };
  const stage = activeRescueStage(run);
  const targetIndex = stage.targets.findIndex(({ placement }) => placement.id === targetId);
  if (targetIndex < 0) return { run, startedBreaking: false };

  const result = damageBarnacle(stage.targets[targetIndex].barnacle, amount);
  if (result.barnacle === stage.targets[targetIndex].barnacle) {
    return { run, startedBreaking: false };
  }
  return {
    run: replaceTarget(run, run.activeStageIndex, targetIndex, result.barnacle),
    startedBreaking: result.startedBreaking,
  };
}

/** Locks target, stage, and rescue completion exactly once after detachment feedback. */
export function finishRescueTargetDetachment(
  run: RescueRun,
  targetId: TargetId,
): TargetRemovalUpdate {
  const unchanged = (): TargetRemovalUpdate => ({
    run,
    targetRemoved: false,
    completedStageId: null,
    rescueCompleted: false,
  });
  if (run.status !== "playing") return unchanged();
  const stageIndex = run.activeStageIndex;
  const stage = run.stages[stageIndex];
  const targetIndex = stage.targets.findIndex(({ placement }) => placement.id === targetId);
  if (targetIndex < 0) return unchanged();

  const detached = finishDetachment(stage.targets[targetIndex].barnacle);
  if (detached === stage.targets[targetIndex].barnacle) return unchanged();

  let nextRun = replaceTarget(run, stageIndex, targetIndex, detached);
  const updatedStage = nextRun.stages[stageIndex];
  if (!isRescueComplete(updatedStage.targets.map(({ barnacle }) => barnacle))) {
    return {
      run: nextRun,
      targetRemoved: true,
      completedStageId: null,
      rescueCompleted: false,
    };
  }

  const completedStage: RescueRunStage = { ...updatedStage, status: "complete" };
  const stages = replaceAt(nextRun.stages, stageIndex, completedStage);
  const finalStage = stageIndex === stages.length - 1;
  nextRun = {
    ...nextRun,
    stages,
    status: finalStage ? "complete" : "awaiting-next-stage",
  };
  return {
    run: nextRun,
    targetRemoved: true,
    completedStageId: updatedStage.id,
    rescueCompleted: finalStage,
  };
}

/** Idempotently locks input before the renderer begins a view change. */
export function startStageTransition(run: RescueRun): StageTransitionUpdate {
  if (run.status !== "awaiting-next-stage") return { run, changed: false };
  return { run: { ...run, status: "transitioning" }, changed: true };
}

/** Makes the next configured stage active only after its view is ready. */
export function finishStageTransition(run: RescueRun): StageTransitionUpdate {
  if (run.status !== "transitioning") return { run, changed: false };
  const nextStageIndex = run.activeStageIndex + 1;
  const nextStage = run.stages[nextStageIndex];
  if (!nextStage || nextStage.status !== "pending") return { run, changed: false };
  const activeStage: RescueRunStage = { ...nextStage, status: "active" };
  return {
    run: {
      ...run,
      status: "playing",
      activeStageIndex: nextStageIndex,
      stages: replaceAt(run.stages, nextStageIndex, activeStage),
    },
    changed: true,
  };
}

function createRunFromLayout(content: ResolvedRescueContent, layout: RescueLayout): RescueRun {
  const { rescue } = content;
  if (layout.targets.length !== rescue.spawnProfile.targetCount) {
    invalid(`Layout for ${rescue.id} has ${layout.targets.length} targets, expected ${rescue.spawnProfile.targetCount}`);
  }
  const ids = new Set<TargetId>();
  for (const target of layout.targets) {
    if (ids.has(target.id)) invalid(`Layout for ${rescue.id} repeats target ${target.id}`);
    ids.add(target.id);
  }

  const stages = content.stages.map(({ definition, bodyView }, index): RescueRunStage => {
    const targets = layout.targets.filter((target) => target.stageId === definition.id);
    if (targets.length === 0) invalid(`Stage ${definition.id} has no target in the prepared layout`);
    if (targets.some((target) => target.bodyViewId !== bodyView.id)) {
      invalid(`Stage ${definition.id} has a target for a different body view`);
    }
    return {
      id: definition.id,
      name: definition.name,
      status: index === 0 ? "active" : "pending",
      targets: targets.map((placement) => ({
        placement,
        barnacle: createBarnacle({
          id: placement.id,
          type: placement.type,
          x: placement.x,
          y: placement.y,
          size: placement.diameter / 2,
          maxHp: placement.type === "hard" ? rescue.durability.hardHp : rescue.durability.normalHp,
        }),
      })),
    };
  });
  const knownStageIds = new Set(stages.map((stage) => stage.id));
  const unknownTarget = layout.targets.find((target) => !knownStageIds.has(target.stageId));
  if (unknownTarget) invalid(`Target ${unknownTarget.id} references unknown stage ${unknownTarget.stageId}`);

  return {
    rescueId: rescue.id,
    seed: layout.seed,
    status: "playing",
    activeStageIndex: 0,
    stages,
  };
}

function replaceTarget(
  run: RescueRun,
  stageIndex: number,
  targetIndex: number,
  barnacle: Barnacle,
): RescueRun {
  const stage = run.stages[stageIndex];
  const target = stage.targets[targetIndex];
  const targets = replaceAt(stage.targets, targetIndex, { ...target, barnacle });
  return { ...run, stages: replaceAt(run.stages, stageIndex, { ...stage, targets }) };
}

function replaceAt<T>(values: readonly T[], index: number, value: T): readonly T[] {
  return values.map((candidate, candidateIndex) => candidateIndex === index ? value : candidate);
}

function invalid(message: string): never {
  throw new RescueRunPreparationError(message);
}
