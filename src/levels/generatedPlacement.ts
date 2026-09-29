import {
  distance,
  isValidTargetPlacement,
  type CleanableGeometry,
  type Point,
} from "../domain/geometry";
import { generatedTargetId, type StageId } from "../domain/identifiers";
import type {
  BodyViewDefinition,
  CleanableRegion,
  ResolvedRescueContent,
  SpawnRegion,
  TargetPlacement,
} from "./rescueDefinitions";

export type RescueSeed = string | number;

export type RescueLayout = Readonly<{
  seed: RescueSeed;
  targets: readonly TargetPlacement[];
}>;

type GeneratedCandidate = Readonly<{
  key: string;
  stageIndex: number;
  stageId: StageId;
  bodyView: BodyViewDefinition;
  spawn: SpawnRegion;
  cleanable: CleanableRegion;
}>;

type PlacedCircle = Readonly<{
  stageId: StageId;
  x: number;
  y: number;
  diameter: number;
}>;

export class PlacementGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlacementGenerationError";
  }
}

/**
 * Builds immutable target placements without mutating authored content.
 * Fixed stages are projected unchanged; generated stages consume the supplied seed.
 */
export function generateRescueLayout(content: ResolvedRescueContent, seed: RescueSeed): RescueLayout {
  const random = seededRandom(seed);
  const rescue = content.rescue;
  const targetsByStage = new Map<StageId, TargetPlacement[]>();
  const fixedAffected = new Set<string>();
  let fixedTargetCount = 0;
  let fixedHardCount = 0;

  for (let stageIndex = 0; stageIndex < content.stages.length; stageIndex += 1) {
    const { definition, bodyView } = content.stages[stageIndex];
    targetsByStage.set(definition.id, []);
    if (definition.placement.kind !== "fixed") continue;
    for (const target of definition.placement.targets) {
      targetsByStage.get(definition.id)!.push({
        ...target,
        stageId: definition.id,
        bodyViewId: bodyView.id,
      });
      fixedAffected.add(candidateKey(definition.id, target.spawnRegionId));
      fixedTargetCount += 1;
      if (target.type === "hard") fixedHardCount += 1;
    }
  }

  const generatedCandidates = collectGeneratedCandidates(content);
  const remainingTargetCount = rescue.spawnProfile.targetCount - fixedTargetCount;
  const remainingHardCount = rescue.spawnProfile.hardTargetCount - fixedHardCount;
  if (remainingTargetCount < 0 || remainingHardCount < 0 || remainingHardCount > remainingTargetCount) {
    fail(`Rescue ${rescue.id} fixed targets exceed its configured totals`);
  }
  if (generatedCandidates.length === 0) {
    if (remainingTargetCount !== 0) fail(`Rescue ${rescue.id} has no generated regions for remaining targets`);
    return { seed, targets: flattenTargets(content, targetsByStage) };
  }

  const generatedStageCount = new Set(generatedCandidates.map((candidate) => candidate.stageId)).size;
  if (remainingTargetCount < generatedStageCount) {
    fail(`Rescue ${rescue.id} cannot place at least one target in every generated stage`);
  }

  const minimumSelected = Math.max(
    generatedStageCount,
    rescue.spawnProfile.minimumAffectedRegions - fixedAffected.size,
  );
  const maximumSelected = Math.min(
    generatedCandidates.length,
    remainingTargetCount,
    rescue.spawnProfile.maximumAffectedRegions - fixedAffected.size,
  );
  if (minimumSelected > maximumSelected) {
    fail(`Rescue ${rescue.id} cannot satisfy its affected-region limits`);
  }

  const selected = selectRegions(
    generatedCandidates,
    remainingTargetCount,
    minimumSelected,
    maximumSelected,
    rescue.spawnProfile.maximumPlacementAttemptsPerTarget,
    random,
  );
  const allocation = allocateTargets(selected, remainingTargetCount, random);
  const types = shuffledTargetTypes(remainingTargetCount, remainingHardCount, random);
  const placed: TargetPlacement[] = [];
  let generationOrder = 0;

  for (const candidate of [...selected].sort(compareCandidates)) {
    const count = allocation.get(candidate.key) ?? 0;
    const diameters = Array.from(
      { length: count },
      () => randomDiameter(rescue.spawnProfile.diameterRange, random),
    );
    const points = placeRegionTargets(
      candidate,
      diameters,
      rescue.spawnProfile.minimumTargetHitRadius,
      rescue.spawnProfile.minimumTargetSpacing,
      rescue.spawnProfile.maximumPlacementAttemptsPerTarget,
      placed,
      random,
    );
    for (let index = 0; index < count; index += 1) {
      const diameter = diameters[index];
      const point = points[index];
      const target: TargetPlacement = {
        id: generatedTargetId(rescue.id, seed, generationOrder),
        stageId: candidate.stageId,
        bodyViewId: candidate.bodyView.id,
        spawnRegionId: candidate.spawn.id,
        type: types[generationOrder],
        x: point.x,
        y: point.y,
        diameter,
      };
      targetsByStage.get(candidate.stageId)!.push(target);
      placed.push(target);
      generationOrder += 1;
    }
  }

  if (generationOrder !== remainingTargetCount) {
    fail(`Rescue ${rescue.id} generated ${generationOrder} of ${remainingTargetCount} required targets`);
  }
  return { seed, targets: flattenTargets(content, targetsByStage) };
}

function collectGeneratedCandidates(content: ResolvedRescueContent): GeneratedCandidate[] {
  const candidates: GeneratedCandidate[] = [];
  for (let stageIndex = 0; stageIndex < content.stages.length; stageIndex += 1) {
    const { definition, bodyView } = content.stages[stageIndex];
    if (definition.placement.kind !== "generated") continue;
    for (const spawnRegionId of definition.placement.spawnRegionIds) {
      const spawn = bodyView.spawnRegions.find((region) => region.id === spawnRegionId);
      if (!spawn) fail(`Stage ${definition.id} references unknown spawn region ${spawnRegionId}`);
      const cleanable = bodyView.cleanableRegions.find((region) => region.id === spawn.cleanableRegionId);
      if (!cleanable) fail(`Spawn region ${spawn.id} references unknown cleanable region ${spawn.cleanableRegionId}`);
      candidates.push({
        key: candidateKey(definition.id, spawn.id),
        stageIndex,
        stageId: definition.id,
        bodyView,
        spawn,
        cleanable,
      });
    }
  }
  return candidates;
}

function selectRegions(
  candidates: readonly GeneratedCandidate[],
  targetCount: number,
  minimumSelected: number,
  maximumSelected: number,
  attempts: number,
  random: () => number,
): GeneratedCandidate[] {
  const counts = shuffle(
    Array.from({ length: maximumSelected - minimumSelected + 1 }, (_, index) => minimumSelected + index),
    random,
  );
  const stageIds = [...new Set(candidates.map((candidate) => candidate.stageId))];

  for (const count of counts) {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const selected: GeneratedCandidate[] = [];
      for (const stageId of stageIds) {
        const available = candidates.filter((candidate) => candidate.stageId === stageId && !selected.includes(candidate));
        selected.push(weightedPick(available, random));
      }
      while (selected.length < count) {
        selected.push(weightedPick(candidates.filter((candidate) => !selected.includes(candidate)), random));
      }
      if (capacityOf(selected) >= targetCount) return selected;
    }

    const fallback: GeneratedCandidate[] = [];
    for (const stageId of stageIds) {
      const stageCandidates = candidates.filter((candidate) => candidate.stageId === stageId);
      fallback.push(highestCapacity(stageCandidates));
    }
    const remaining = candidates
      .filter((candidate) => !fallback.includes(candidate))
      .sort((left, right) => right.spawn.capacity - left.spawn.capacity || compareText(left.key, right.key));
    fallback.push(...remaining.slice(0, count - fallback.length));
    if (fallback.length === count && capacityOf(fallback) >= targetCount) return fallback;
  }

  fail(`No eligible region selection can hold ${targetCount} generated targets`);
}

function allocateTargets(
  selected: readonly GeneratedCandidate[],
  targetCount: number,
  random: () => number,
): Map<string, number> {
  const allocation = new Map(selected.map((candidate) => [candidate.key, 1]));
  let remaining = targetCount - selected.length;
  while (remaining > 0) {
    const available = selected.filter((candidate) => allocation.get(candidate.key)! < candidate.spawn.capacity);
    if (available.length === 0) fail(`Selected regions cannot hold ${targetCount} generated targets`);
    const candidate = weightedPick(available, random);
    allocation.set(candidate.key, allocation.get(candidate.key)! + 1);
    remaining -= 1;
  }
  return allocation;
}

function shuffledTargetTypes(
  targetCount: number,
  hardTargetCount: number,
  random: () => number,
): Array<TargetPlacement["type"]> {
  return shuffle([
    ...Array.from({ length: hardTargetCount }, () => "hard" as const),
    ...Array.from({ length: targetCount - hardTargetCount }, () => "normal" as const),
  ], random);
}

function placeRegionTargets(
  candidate: GeneratedCandidate,
  diameters: readonly number[],
  minimumHitRadius: number,
  minimumSpacing: number,
  maximumAttempts: number,
  previouslyPlaced: readonly PlacedCircle[],
  random: () => number,
): Point[] {
  const sampledPoints: Point[] = [];
  const sampledTargets: PlacedCircle[] = [];
  const bounds = geometryBounds(candidate.spawn.geometry);
  for (const diameter of diameters) {
    let accepted: Point | null = null;
    for (let attempt = 0; attempt < maximumAttempts; attempt += 1) {
      const point = roundedPoint({
        x: bounds.minimumX + random() * (bounds.maximumX - bounds.minimumX),
        y: bounds.minimumY + random() * (bounds.maximumY - bounds.minimumY),
      });
      if (isAvailable(
        point,
        candidate,
        diameter,
        minimumHitRadius,
        minimumSpacing,
        [...previouslyPlaced, ...sampledTargets],
      )) {
        accepted = point;
        break;
      }
    }
    if (!accepted) return fallbackRegionTargets(
      candidate,
      diameters,
      minimumHitRadius,
      minimumSpacing,
      previouslyPlaced,
    );
    sampledPoints.push(accepted);
    sampledTargets.push({ stageId: candidate.stageId, ...accepted, diameter });
  }
  return sampledPoints;
}

function fallbackRegionTargets(
  candidate: GeneratedCandidate,
  diameters: readonly number[],
  minimumHitRadius: number,
  minimumSpacing: number,
  previouslyPlaced: readonly PlacedCircle[],
): Point[] {
  const points: Array<Point | undefined> = Array.from({ length: diameters.length });
  const fallbackTargets: PlacedCircle[] = [];
  const largestFirst = diameters
    .map((diameter, index) => ({ diameter, index }))
    .sort((left, right) => right.diameter - left.diameter || left.index - right.index);

  for (const { diameter, index } of largestFirst) {
    const anchor = candidate.spawn.fallbackAnchors.find((point) => isAvailable(
      point,
      candidate,
      diameter,
      minimumHitRadius,
      minimumSpacing,
      [...previouslyPlaced, ...fallbackTargets],
    ));
    if (!anchor) {
      fail(`No valid sampled point or fallback anchor remains in spawn region ${candidate.spawn.id}`);
    }
    points[index] = { x: anchor.x, y: anchor.y };
    fallbackTargets.push({ stageId: candidate.stageId, x: anchor.x, y: anchor.y, diameter });
  }
  return points as Point[];
}

function isAvailable(
  point: Readonly<Point>,
  candidate: GeneratedCandidate,
  diameter: number,
  minimumHitRadius: number,
  minimumSpacing: number,
  placed: readonly PlacedCircle[],
): boolean {
  const visualRadius = diameter / 2;
  if (!isValidTargetPlacement(
    point,
    visualRadius,
    minimumHitRadius,
    candidate.spawn.geometry,
    candidate.cleanable.exclusions,
  ) || !isValidTargetPlacement(
    point,
    visualRadius,
    minimumHitRadius,
    candidate.cleanable.geometry,
    candidate.cleanable.exclusions,
  )) return false;

  const hitRadius = Math.max(visualRadius, minimumHitRadius);
  return placed.every((other) => other.stageId !== candidate.stageId
    || distance(point, other) >= hitRadius + Math.max(other.diameter / 2, minimumHitRadius) + minimumSpacing);
}

function geometryBounds(geometry: CleanableGeometry): Readonly<{
  minimumX: number;
  maximumX: number;
  minimumY: number;
  maximumY: number;
}> {
  switch (geometry.kind) {
    case "circle":
      return {
        minimumX: geometry.center.x - geometry.radius,
        maximumX: geometry.center.x + geometry.radius,
        minimumY: geometry.center.y - geometry.radius,
        maximumY: geometry.center.y + geometry.radius,
      };
    case "ellipse": {
      const cosine = Math.cos(geometry.rotation);
      const sine = Math.sin(geometry.rotation);
      const extentX = Math.hypot(geometry.radiusX * cosine, geometry.radiusY * sine);
      const extentY = Math.hypot(geometry.radiusX * sine, geometry.radiusY * cosine);
      return {
        minimumX: geometry.center.x - extentX,
        maximumX: geometry.center.x + extentX,
        minimumY: geometry.center.y - extentY,
        maximumY: geometry.center.y + extentY,
      };
    }
    case "capsule":
      return {
        minimumX: Math.min(geometry.start.x, geometry.end.x) - geometry.radius,
        maximumX: Math.max(geometry.start.x, geometry.end.x) + geometry.radius,
        minimumY: Math.min(geometry.start.y, geometry.end.y) - geometry.radius,
        maximumY: Math.max(geometry.start.y, geometry.end.y) + geometry.radius,
      };
    case "polygon":
      return {
        minimumX: Math.min(...geometry.points.map((point) => point.x)),
        maximumX: Math.max(...geometry.points.map((point) => point.x)),
        minimumY: Math.min(...geometry.points.map((point) => point.y)),
        maximumY: Math.max(...geometry.points.map((point) => point.y)),
      };
  }
}

function randomDiameter(range: readonly [number, number], random: () => number): number {
  const [minimum, maximum] = range;
  return rounded(minimum + random() * (maximum - minimum));
}

function weightedPick<T extends Readonly<{ spawn: Readonly<{ weight: number }> }>>(
  candidates: readonly T[],
  random: () => number,
): T {
  if (candidates.length === 0) fail("Cannot select from an empty region set");
  const totalWeight = candidates.reduce((sum, candidate) => sum + candidate.spawn.weight, 0);
  let choice = random() * totalWeight;
  for (const candidate of candidates) {
    choice -= candidate.spawn.weight;
    if (choice < 0) return candidate;
  }
  return candidates[candidates.length - 1];
}

function highestCapacity(candidates: readonly GeneratedCandidate[]): GeneratedCandidate {
  if (candidates.length === 0) fail("Generated stage has no eligible region");
  return [...candidates].sort((left, right) => (
    right.spawn.capacity - left.spawn.capacity || left.key.localeCompare(right.key)
  ))[0];
}

function capacityOf(candidates: readonly GeneratedCandidate[]): number {
  return candidates.reduce((total, candidate) => total + candidate.spawn.capacity, 0);
}

function compareCandidates(left: GeneratedCandidate, right: GeneratedCandidate): number {
  return left.stageIndex - right.stageIndex || compareText(left.spawn.id, right.spawn.id);
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function candidateKey(stageId: string, spawnRegionId: string): string {
  return `${stageId}|${spawnRegionId}`;
}

function flattenTargets(
  content: ResolvedRescueContent,
  targetsByStage: ReadonlyMap<StageId, readonly TargetPlacement[]>,
): TargetPlacement[] {
  return content.stages.flatMap(({ definition }) => targetsByStage.get(definition.id) ?? []);
}

function shuffle<T>(values: T[], random: () => number): T[] {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [values[index], values[other]] = [values[other], values[index]];
  }
  return values;
}

function seededRandom(seed: RescueSeed): () => number {
  const token = seedToken(seed);
  let state = 2166136261;
  for (let index = 0; index < token.length; index += 1) {
    state ^= token.charCodeAt(index);
    state = Math.imul(state, 16777619);
  }
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function seedToken(seed: RescueSeed): string {
  if (typeof seed === "number") {
    if (!Number.isSafeInteger(seed)) fail(`Numeric rescue seed must be a safe integer: ${seed}`);
    return `number:${seed}`;
  }
  if (seed.length === 0) fail("String rescue seed must not be empty");
  return `string:${seed}`;
}

function roundedPoint(point: Point): Point {
  return { x: rounded(point.x), y: rounded(point.y) };
}

function rounded(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function fail(message: string): never {
  throw new PlacementGenerationError(message);
}
