import type { Barnacle } from "../domain/barnacle";
import type { CleanableGeometry, Point } from "../domain/geometry";
import {
  assertUniqueTargetIds,
  type AnimalId,
  type BodyViewId,
  type CleanableRegionId,
  type EnvironmentId,
  type RescueId,
  type SpawnRegionId,
  type StageId,
  type TargetId,
} from "../domain/identifiers";

export type AssetReference = Readonly<{
  src: string;
  fallback: "vector";
}>;

export type CleanableRegion<TGeometry = CleanableGeometry> = Readonly<{
  id: CleanableRegionId;
  name: string;
  geometry: TGeometry;
  exclusions: readonly TGeometry[];
}>;

export type SpawnRegion<TGeometry = CleanableGeometry> = Readonly<{
  id: SpawnRegionId;
  cleanableRegionId: CleanableRegionId;
  geometry: TGeometry;
  capacity: number;
  weight: number;
  fallbackAnchors: readonly Readonly<Point>[];
}>;

export type BodyViewDefinition<TGeometry = CleanableGeometry> = Readonly<{
  id: BodyViewId;
  name: string;
  asset: AssetReference;
  presentation?: "dorsal" | "ventral";
  viewportAnchor?: Readonly<{ x: number; y: number }>;
  designSize: Readonly<{ width: number; height: number }>;
  cleanableRegions: readonly CleanableRegion<TGeometry>[];
  spawnRegions: readonly SpawnRegion<TGeometry>[];
}>;

export type AnimalDefinition<TGeometry = CleanableGeometry> = Readonly<{
  id: AnimalId;
  name: string;
  bodyViews: readonly BodyViewDefinition<TGeometry>[];
}>;

export type EnvironmentDefinition = Readonly<{
  id: EnvironmentId;
  name: string;
  background: AssetReference;
}>;

export type SpawnProfile = Readonly<{
  targetCount: number;
  hardTargetCount: number;
  diameterRange: readonly [minimum: number, maximum: number];
  minimumAffectedRegions: number;
  maximumAffectedRegions: number;
  minimumTargetSpacing: number;
  minimumTargetHitRadius: number;
  maximumPlacementAttemptsPerTarget: number;
}>;

/** Immutable case layout; mutable HP and damage state belong to the run domain. */
export type TargetPlacement = Readonly<{
  id: TargetId;
  stageId: StageId;
  bodyViewId: BodyViewId;
  spawnRegionId: SpawnRegionId;
  type: Barnacle["type"];
  x: number;
  y: number;
  diameter: number;
}>;

export type FixedTargetPlacement = Readonly<
  Omit<TargetPlacement, "stageId" | "bodyViewId">
>;

export type RescueStage = Readonly<{
  id: StageId;
  name: string;
  bodyViewId: BodyViewId;
  copy?: Readonly<{
    instruction: string;
    completionSupport?: string;
    transitionStatus?: string;
    arrivalStatus?: string;
  }>;
  placement:
    | Readonly<{ kind: "fixed"; targets: readonly FixedTargetPlacement[] }>
    | Readonly<{ kind: "generated"; spawnRegionIds: readonly SpawnRegionId[] }>;
}>;

export type RescueDefinition = Readonly<{
  id: RescueId;
  name: string;
  description: string;
  animalId: AnimalId;
  environmentId: EnvironmentId;
  stages: readonly RescueStage[];
  spawnProfile: SpawnProfile;
  durability: Readonly<{ normalHp: number; hardHp: number }>;
  challenge: Readonly<{
    timeLimitSeconds: number;
    animalHealth: number;
    parScore: number;
  }>;
}>;

export type RescueCatalog<TGeometry = CleanableGeometry> = Readonly<{
  animals: readonly AnimalDefinition<TGeometry>[];
  environments: readonly EnvironmentDefinition[];
  rescues: readonly RescueDefinition[];
}>;

export type ResolvedRescueContent<TGeometry = CleanableGeometry> = Readonly<{
  rescue: RescueDefinition;
  animal: AnimalDefinition<TGeometry>;
  environment: EnvironmentDefinition;
  stages: readonly Readonly<{
    definition: RescueStage;
    bodyView: BodyViewDefinition<TGeometry>;
  }>[];
}>;

/** Resolves only the animal/environment pairing explicitly named by a rescue. */
export function resolveRescueContent<TGeometry>(
  catalog: RescueCatalog<TGeometry>,
  requestedRescueId: RescueId,
): ResolvedRescueContent<TGeometry> {
  const rescue = catalog.rescues.find((candidate) => candidate.id === requestedRescueId);
  if (!rescue) throw new Error(`Unknown rescue definition: ${requestedRescueId}`);

  const animal = catalog.animals.find((candidate) => candidate.id === rescue.animalId);
  if (!animal) throw new Error(`Rescue ${rescue.id} references unknown animal: ${rescue.animalId}`);

  const environment = catalog.environments.find((candidate) => candidate.id === rescue.environmentId);
  if (!environment) {
    throw new Error(`Rescue ${rescue.id} references unknown environment: ${rescue.environmentId}`);
  }

  const stages = rescue.stages.map((definition) => {
    const bodyView = animal.bodyViews.find((candidate) => candidate.id === definition.bodyViewId);
    if (!bodyView) {
      throw new Error(`Stage ${definition.id} references unknown view on animal ${animal.id}: ${definition.bodyViewId}`);
    }
    return { definition, bodyView };
  });

  assertUniqueTargetIds(rescue.stages.flatMap((stage) => stage.placement.kind === "fixed"
    ? stage.placement.targets
    : []));

  return { rescue, animal, environment, stages };
}
