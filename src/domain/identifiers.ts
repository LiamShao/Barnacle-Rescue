declare const identifierBrand: unique symbol;

type StableIdentifier<Kind extends string> = string & { readonly [identifierBrand]: Kind };

export type AnimalId = StableIdentifier<"animal">;
export type EnvironmentId = StableIdentifier<"environment">;
export type RescueId = StableIdentifier<"rescue">;
export type StageId = StableIdentifier<"stage">;
export type BodyViewId = StableIdentifier<"body-view">;
export type CleanableRegionId = StableIdentifier<"cleanable-region">;
export type SpawnRegionId = StableIdentifier<"spawn-region">;
export type TargetId = StableIdentifier<"target">;

const STABLE_KEY = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

export function animalId(key: string): AnimalId {
  return scopedId("animal", key) as AnimalId;
}

export function environmentId(key: string): EnvironmentId {
  return scopedId("environment", key) as EnvironmentId;
}

export function rescueId(key: string): RescueId {
  return scopedId("rescue", key) as RescueId;
}

export function stageId(rescue: RescueId, key: string): StageId {
  return childId(rescue, "stage", key) as StageId;
}

export function bodyViewId(animal: AnimalId, key: string): BodyViewId {
  return childId(animal, "view", key) as BodyViewId;
}

export function cleanableRegionId(view: BodyViewId, key: string): CleanableRegionId {
  return childId(view, "region", key) as CleanableRegionId;
}

export function spawnRegionId(view: BodyViewId, key: string): SpawnRegionId {
  return childId(view, "spawn", key) as SpawnRegionId;
}

export function authoredTargetId(rescue: RescueId, key: string): TargetId {
  return childId(rescue, "target/authored", key) as TargetId;
}

export function generatedTargetId(
  rescue: RescueId,
  seed: string | number,
  generationOrder: number,
): TargetId {
  if (!Number.isSafeInteger(generationOrder) || generationOrder < 0) {
    throw new Error(`Target generation order must be a non-negative safe integer: ${generationOrder}`);
  }
  const seedToken = typeof seed === "number" ? numericSeed(seed) : stringSeed(seed);
  return `${rescue}/target/generated/${seedToken}/${generationOrder}` as TargetId;
}

export function assertUniqueTargetIds<T extends Readonly<{ id: TargetId }>>(targets: readonly T[]): void {
  const seen = new Set<TargetId>();
  for (const target of targets) {
    if (seen.has(target.id)) throw new Error(`Duplicate target ID in rescue layout: ${target.id}`);
    seen.add(target.id);
  }
}

function scopedId(scope: string, key: string): string {
  return `${scope}/${validatedKey(key)}`;
}

function childId(parent: string, scope: string, key: string): string {
  return `${parent}/${scope}/${validatedKey(key)}`;
}

function validatedKey(key: string): string {
  if (!STABLE_KEY.test(key)) {
    throw new Error(`Stable ID keys must be lowercase kebab-case: ${key}`);
  }
  return key;
}

function numericSeed(seed: number): string {
  if (!Number.isSafeInteger(seed)) throw new Error(`Numeric rescue seeds must be safe integers: ${seed}`);
  return `n-${seed}`;
}

function stringSeed(seed: string): string {
  if (seed.length === 0) throw new Error("String rescue seeds must not be empty");
  return `s-${encodeURIComponent(seed)}`;
}
