import {
  distance,
  isGeometryValid,
  isPointInCleanableRegion,
  isValidTargetPlacement,
  type Point,
} from "../domain/geometry";
import type { SpawnRegionId, TargetId } from "../domain/identifiers";
import type {
  BodyViewDefinition,
  CleanableRegion,
  FixedTargetPlacement,
  RescueCatalog,
  RescueDefinition,
  SpawnRegion,
} from "./rescueDefinitions";

/** Validates authored compatibility content before any rescue can be selected. */
export function assertValidRescueCatalog(catalog: RescueCatalog): void {
  assertUnique(catalog.animals.map((animal) => animal.id), "animal");
  assertUnique(catalog.environments.map((environment) => environment.id), "environment");
  assertUnique(catalog.rescues.map((rescue) => rescue.id), "rescue");

  for (const animal of catalog.animals) {
    assertScoped(animal.id, "animal/", `Animal ID ${animal.id}`);
    assertUnique(animal.bodyViews.map((view) => view.id), `body view on ${animal.id}`);
    for (const view of animal.bodyViews) validateBodyView(animal.id, view);
  }
  for (const environment of catalog.environments) {
    assertScoped(environment.id, "environment/", `Environment ID ${environment.id}`);
  }
  for (const rescue of catalog.rescues) validateRescue(catalog, rescue);
}

function validateBodyView(animalId: string, view: BodyViewDefinition): void {
  assertScoped(view.id, `${animalId}/view/`, `Body view ID ${view.id}`);
  if (!isPositiveFinite(view.designSize.width) || !isPositiveFinite(view.designSize.height)) {
    invalid(`Body view ${view.id} must have a positive finite design size`);
  }
  if (view.presentation !== undefined && view.presentation !== "dorsal" && view.presentation !== "ventral") {
    invalid(`Body view ${view.id} has an unsupported presentation`);
  }
  if (view.viewportAnchor && [view.viewportAnchor.x, view.viewportAnchor.y].some((value) => !Number.isFinite(value) || value < 0 || value > 1)) {
    invalid(`Body view ${view.id} has an invalid viewport anchor`);
  }
  if (view.cleanableRegions.length === 0) invalid(`Body view ${view.id} must define a cleanable region`);
  assertUnique(view.cleanableRegions.map((region) => region.id), `cleanable region on ${view.id}`);
  assertUnique(view.spawnRegions.map((region) => region.id), `spawn region on ${view.id}`);

  const cleanableById = new Map(view.cleanableRegions.map((region) => [region.id, region]));
  for (const region of view.cleanableRegions) {
    assertScoped(region.id, `${view.id}/region/`, `Cleanable region ID ${region.id}`);
    if (!isGeometryValid(region.geometry) || region.exclusions.some((exclusion) => !isGeometryValid(exclusion))) {
      invalid(`Cleanable region ${region.id} has invalid geometry`);
    }
  }
  for (const region of view.spawnRegions) {
    assertScoped(region.id, `${view.id}/spawn/`, `Spawn region ID ${region.id}`);
    const cleanable = cleanableById.get(region.cleanableRegionId);
    if (!cleanable) invalid(`Spawn region ${region.id} references unknown cleanable region ${region.cleanableRegionId}`);
    if (!isGeometryValid(region.geometry)) invalid(`Spawn region ${region.id} has invalid geometry`);
    if (!Number.isSafeInteger(region.capacity) || region.capacity <= 0) {
      invalid(`Spawn region ${region.id} must have a positive integer capacity`);
    }
    if (!isPositiveFinite(region.weight)) invalid(`Spawn region ${region.id} must have a positive finite weight`);
    if (region.fallbackAnchors.length === 0) invalid(`Spawn region ${region.id} must define a fallback anchor`);
    for (const anchor of region.fallbackAnchors) validateFallbackAnchor(anchor, region, cleanable);
  }
}

function validateFallbackAnchor(anchor: Readonly<Point>, spawn: SpawnRegion, cleanable: CleanableRegion): void {
  if (!isPointFinite(anchor)
    || !isPointInCleanableRegion(anchor, spawn.geometry, cleanable.exclusions)
    || !isPointInCleanableRegion(anchor, cleanable.geometry, cleanable.exclusions)) {
    invalid(`Spawn region ${spawn.id} has a fallback anchor outside its cleanable surface`);
  }
}

function validateRescue(catalog: RescueCatalog, rescue: RescueDefinition): void {
  assertScoped(rescue.id, "rescue/", `Rescue ID ${rescue.id}`);
  const animal = catalog.animals.find((candidate) => candidate.id === rescue.animalId);
  if (!animal) invalid(`Rescue ${rescue.id} references unknown animal ${rescue.animalId}`);
  if (!catalog.environments.some((candidate) => candidate.id === rescue.environmentId)) {
    invalid(`Rescue ${rescue.id} references unknown environment ${rescue.environmentId}`);
  }
  if (rescue.stages.length === 0) invalid(`Rescue ${rescue.id} must define a stage`);
  validateSpawnProfile(rescue);
  if (!isPositiveFinite(rescue.durability.normalHp) || !isPositiveFinite(rescue.durability.hardHp)) {
    invalid(`Rescue ${rescue.id} durability must be positive and finite`);
  }
  if (!isPositiveFinite(rescue.challenge.timeLimitSeconds)
    || !isPositiveFinite(rescue.challenge.animalHealth)
    || !isPositiveFinite(rescue.challenge.parScore)) {
    invalid(`Rescue ${rescue.id} Challenge tuning must be positive and finite`);
  }

  assertUnique(rescue.stages.map((stage) => stage.id), `stage in ${rescue.id}`);
  const targetIds = new Set<TargetId>();
  const eligibleSpawnIds = new Set<SpawnRegionId>();
  let fixedTargetCount = 0;
  let fixedHardCount = 0;
  let hasGeneratedStage = false;
  let generatedStageCount = 0;
  let generatedCapacity = 0;

  for (const stage of rescue.stages) {
    assertScoped(stage.id, `${rescue.id}/stage/`, `Stage ID ${stage.id}`);
    const view = animal.bodyViews.find((candidate) => candidate.id === stage.bodyViewId);
    if (!view) invalid(`Stage ${stage.id} references unknown view ${stage.bodyViewId}`);
    const spawnById = new Map(view.spawnRegions.map((region) => [region.id, region]));

    if (stage.placement.kind === "generated") {
      hasGeneratedStage = true;
      generatedStageCount += 1;
      if (stage.placement.spawnRegionIds.length === 0) {
        invalid(`Generated stage ${stage.id} must reference a spawn region`);
      }
      assertUnique(stage.placement.spawnRegionIds, `generated spawn region in ${stage.id}`);
      for (const spawnRegionId of stage.placement.spawnRegionIds) {
        const spawn = spawnById.get(spawnRegionId);
        if (!spawn) invalid(`Stage ${stage.id} references unknown spawn region ${spawnRegionId}`);
        generatedCapacity += spawn.capacity;
        eligibleSpawnIds.add(spawnRegionId);
      }
      continue;
    }

    if (stage.placement.targets.length === 0) invalid(`Fixed stage ${stage.id} must define a target`);
    const targetCountBySpawn = new Map<SpawnRegionId, number>();
    for (const target of stage.placement.targets) {
      assertScoped(target.id, `${rescue.id}/target/`, `Target ID ${target.id}`);
      if (targetIds.has(target.id)) invalid(`Duplicate target ID in rescue ${rescue.id}: ${target.id}`);
      targetIds.add(target.id);
      if (target.type !== "normal" && target.type !== "hard") invalid(`Target ${target.id} has an unknown type`);
      if (!isPointFinite(target) || !isPositiveFinite(target.diameter)) {
        invalid(`Target ${target.id} must have finite coordinates and a positive diameter`);
      }
      const [minimumDiameter, maximumDiameter] = rescue.spawnProfile.diameterRange;
      if (target.diameter < minimumDiameter || target.diameter > maximumDiameter) {
        invalid(`Target ${target.id} diameter is outside the rescue range`);
      }
      const spawn = spawnById.get(target.spawnRegionId);
      if (!spawn) invalid(`Target ${target.id} references unknown spawn region ${target.spawnRegionId}`);
      validateFixedPlacement(target, spawn, view, rescue.spawnProfile.minimumTargetHitRadius);
      eligibleSpawnIds.add(target.spawnRegionId);
      fixedTargetCount += 1;
      if (target.type === "hard") fixedHardCount += 1;
      targetCountBySpawn.set(target.spawnRegionId, (targetCountBySpawn.get(target.spawnRegionId) ?? 0) + 1);
    }
    for (const [spawnRegionId, count] of targetCountBySpawn) {
      const spawn = spawnById.get(spawnRegionId);
      if (!spawn) invalid(`Fixed stage ${stage.id} references unknown spawn region ${spawnRegionId}`);
      if (count > spawn.capacity) {
        invalid(`Fixed stage ${stage.id} exceeds capacity for spawn region ${spawnRegionId}`);
      }
    }
    validateTargetSeparation(rescue, stage.placement.targets);
  }

  if (hasGeneratedStage) {
    const generatedTargetCount = rescue.spawnProfile.targetCount - fixedTargetCount;
    const generatedHardCount = rescue.spawnProfile.hardTargetCount - fixedHardCount;
    if (generatedTargetCount < generatedStageCount
      || generatedHardCount < 0
      || generatedHardCount > generatedTargetCount) {
      invalid(`Rescue ${rescue.id} cannot satisfy its generated target totals`);
    }
    if (generatedCapacity < generatedTargetCount) {
      invalid(`Rescue ${rescue.id} generated regions do not have enough capacity`);
    }
    if (eligibleSpawnIds.size < rescue.spawnProfile.maximumAffectedRegions) {
      invalid(`Rescue ${rescue.id} does not expose enough eligible spawn regions`);
    }
  } else {
    if (eligibleSpawnIds.size < rescue.spawnProfile.minimumAffectedRegions
      || eligibleSpawnIds.size > rescue.spawnProfile.maximumAffectedRegions) {
      invalid(`Rescue ${rescue.id} fixed targets do not match its affected-region limits`);
    }
    if (fixedTargetCount !== rescue.spawnProfile.targetCount
      || fixedHardCount !== rescue.spawnProfile.hardTargetCount) {
      invalid(`Rescue ${rescue.id} fixed targets do not match its configured totals`);
    }
  }
}

function validateSpawnProfile(rescue: RescueDefinition): void {
  const profile = rescue.spawnProfile;
  const [minimumDiameter, maximumDiameter] = profile.diameterRange;
  if (!Number.isSafeInteger(profile.targetCount) || profile.targetCount <= 0) {
    invalid(`Rescue ${rescue.id} must have a positive integer target count`);
  }
  if (!Number.isSafeInteger(profile.hardTargetCount)
    || profile.hardTargetCount < 0
    || profile.hardTargetCount > profile.targetCount) {
    invalid(`Rescue ${rescue.id} has an invalid hard-target count`);
  }
  if (!isPositiveFinite(minimumDiameter)
    || !isPositiveFinite(maximumDiameter)
    || minimumDiameter > maximumDiameter) {
    invalid(`Rescue ${rescue.id} has an invalid target diameter range`);
  }
  if (!Number.isSafeInteger(profile.minimumAffectedRegions)
    || !Number.isSafeInteger(profile.maximumAffectedRegions)
    || profile.minimumAffectedRegions <= 0
    || profile.minimumAffectedRegions > profile.maximumAffectedRegions
    || profile.maximumAffectedRegions > profile.targetCount) {
    invalid(`Rescue ${rescue.id} has invalid affected-region limits`);
  }
  if (!Number.isFinite(profile.minimumTargetSpacing) || profile.minimumTargetSpacing < 0) {
    invalid(`Rescue ${rescue.id} has invalid target spacing`);
  }
  if (!isPositiveFinite(profile.minimumTargetHitRadius)) {
    invalid(`Rescue ${rescue.id} has invalid minimum target hit radius`);
  }
  if (!Number.isSafeInteger(profile.maximumPlacementAttemptsPerTarget)
    || profile.maximumPlacementAttemptsPerTarget <= 0) {
    invalid(`Rescue ${rescue.id} has invalid placement attempts`);
  }
}

function validateFixedPlacement(
  target: FixedTargetPlacement,
  spawn: SpawnRegion,
  view: BodyViewDefinition,
  minimumTargetHitRadius: number,
): void {
  const cleanable = view.cleanableRegions.find((region) => region.id === spawn.cleanableRegionId);
  if (!cleanable) invalid(`Spawn region ${spawn.id} references unknown cleanable region ${spawn.cleanableRegionId}`);
  const center = { x: target.x, y: target.y };
  const radius = target.diameter / 2;
  if (!isValidTargetPlacement(center, radius, minimumTargetHitRadius, spawn.geometry, cleanable.exclusions)
    || !isValidTargetPlacement(
      center,
      radius,
      minimumTargetHitRadius,
      cleanable.geometry,
      cleanable.exclusions,
    )) {
    invalid(`Target ${target.id} is outside its configured cleanable spawn surface`);
  }
}

function validateTargetSeparation(
  rescue: RescueDefinition,
  targets: readonly Readonly<{ id: TargetId; x: number; y: number; diameter: number }>[],
): void {
  for (let leftIndex = 0; leftIndex < targets.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < targets.length; rightIndex += 1) {
      const left = targets[leftIndex];
      const right = targets[rightIndex];
      const required = Math.max(rescue.spawnProfile.minimumTargetHitRadius, left.diameter / 2)
        + Math.max(rescue.spawnProfile.minimumTargetHitRadius, right.diameter / 2)
        + rescue.spawnProfile.minimumTargetSpacing;
      if (distance(left, right) < required) {
        invalid(`Targets ${left.id} and ${right.id} overlap`);
      }
    }
  }
}

function assertUnique(values: readonly string[], label: string): void {
  if (new Set(values).size !== values.length) invalid(`Duplicate ${label} ID`);
}

function assertScoped(value: string, prefix: string, label: string): void {
  if (!value.startsWith(prefix) || value.length === prefix.length) invalid(`${label} is outside its configured scope`);
}

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function isPointFinite(point: Readonly<Point>): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

function invalid(message: string): never {
  throw new Error(`Invalid rescue catalog: ${message}`);
}
