import type { BarnacleConfig } from "../domain/barnacle";
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
  type ResolvedRescueContent,
} from "./rescueDefinitions";

type AuthoredRescue = Readonly<{
  legacyLevelId: number;
  key: string;
  name: string;
  description: string;
  normalHp: number;
  hardHp: number;
  diameterRange: readonly [number, number];
  timeLimitSeconds: number;
  animalHealth: number;
  parScore: number;
  placements: readonly Readonly<{
    x: number;
    y: number;
    diameter: number;
    type: BarnacleConfig["type"];
  }>[];
}>;

const authoredRescues: readonly AuthoredRescue[] = [
  {
    legacyLevelId: 1,
    key: "gentle-start",
    name: "Gentle Start",
    description: "Three easy targets. Find your scraping rhythm.",
    normalHp: 70,
    hardHp: 140,
    diameterRange: [72, 96],
    timeLimitSeconds: 75,
    animalHealth: 100,
    parScore: 750,
    placements: [
      { x: -110, y: -30, diameter: 96, type: "normal" },
      { x: 0, y: 45, diameter: 84, type: "normal" },
      { x: 110, y: -30, diameter: 88, type: "normal" },
    ],
  },
  {
    legacyLevelId: 2,
    key: "shell-care",
    name: "Shell Care",
    description: "Five targets, including one tougher shell.",
    normalHp: 85,
    hardHp: 170,
    diameterRange: [62, 90],
    timeLimitSeconds: 90,
    animalHealth: 100,
    parScore: 950,
    placements: [
      { x: -120, y: -55, diameter: 78, type: "normal" },
      { x: 120, y: -55, diameter: 74, type: "normal" },
      { x: -120, y: 55, diameter: 70, type: "normal" },
      { x: 120, y: 55, diameter: 66, type: "normal" },
      { x: 0, y: 0, diameter: 90, type: "hard" },
    ],
  },
  {
    legacyLevelId: 3,
    key: "full-rescue",
    name: "Full Rescue",
    description: "Seven targets. Give this turtle a complete clean.",
    normalHp: 100,
    hardHp: 200,
    diameterRange: [56, 84],
    timeLimitSeconds: 105,
    animalHealth: 100,
    parScore: 1100,
    placements: [
      { x: -130, y: -55, diameter: 68, type: "normal" },
      { x: 0, y: -88, diameter: 62, type: "normal" },
      { x: 130, y: -55, diameter: 72, type: "hard" },
      { x: -130, y: 55, diameter: 72, type: "hard" },
      { x: 0, y: 88, diameter: 56, type: "normal" },
      { x: 130, y: 55, diameter: 64, type: "normal" },
      { x: 0, y: 0, diameter: 84, type: "normal" },
    ],
  },
];

const seaTurtleId = animalId("sea-turtle");
const dorsalViewId = bodyViewId(seaTurtleId, "dorsal");
const shellRegionId = cleanableRegionId(dorsalViewId, "shell");
const shellSpawnId = spawnRegionId(dorsalViewId, "shell");
const shallowOceanId = environmentId("shallow-ocean");

export const animals: readonly AnimalDefinition[] = [{
  id: seaTurtleId,
  name: "Sea turtle",
  bodyViews: [{
    id: dorsalViewId,
    name: "Shell",
    asset: { src: "/assets/game/turtle_body_base_v2.png", fallback: "vector" },
    designSize: { width: 820, height: 540 },
    cleanableRegions: [{
      id: shellRegionId,
      name: "Shell",
      geometry: { kind: "ellipse", center: { x: 0, y: 0 }, radiusX: 235, radiusY: 145, rotation: 0 },
      exclusions: [],
    }],
    spawnRegions: [{
      id: shellSpawnId,
      cleanableRegionId: shellRegionId,
      geometry: { kind: "ellipse", center: { x: 0, y: 0 }, radiusX: 235, radiusY: 145, rotation: 0 },
      capacity: 7,
      weight: 1,
      fallbackAnchors: authoredRescues[2].placements.map(({ x, y }) => ({ x, y })),
    }],
  }],
}];

export const environments: readonly EnvironmentDefinition[] = [{
  id: shallowOceanId,
  name: "Shallow ocean",
  background: { src: "/assets/game/background_shallow_ocean.png", fallback: "vector" },
}];

function toDefinition(authored: AuthoredRescue): RescueDefinition {
  const id = rescueId(authored.key);
  return {
    id,
    name: authored.name,
    description: authored.description,
    animalId: seaTurtleId,
    environmentId: shallowOceanId,
    stages: [{
      id: stageId(id, "shell"),
      name: "Shell",
      bodyViewId: dorsalViewId,
      placement: {
        kind: "fixed",
        targets: authored.placements.map((placement, index) => ({
          id: authoredTargetId(id, `target-${index + 1}`),
          spawnRegionId: shellSpawnId,
          ...placement,
        })),
      },
    }],
    spawnProfile: {
      targetCount: authored.placements.length,
      hardTargetCount: authored.placements.filter((placement) => placement.type === "hard").length,
      diameterRange: authored.diameterRange,
      minimumAffectedRegions: 1,
      maximumAffectedRegions: 1,
      minimumTargetSpacing: 2,
      maximumPlacementAttemptsPerTarget: 20,
    },
    durability: { normalHp: authored.normalHp, hardHp: authored.hardHp },
    challenge: {
      timeLimitSeconds: authored.timeLimitSeconds,
      animalHealth: authored.animalHealth,
      parScore: authored.parScore,
    },
  };
}

const definitions = authoredRescues.map(toDefinition);

export const rescueCatalog: RescueCatalog = { animals, environments, rescues: definitions };

export type ConfiguredRescue = Readonly<{
  legacyLevelId: number;
  content: ResolvedRescueContent;
}>;

export const rescues: readonly ConfiguredRescue[] = authoredRescues.map((authored, index) => ({
  legacyLevelId: authored.legacyLevelId,
  content: resolveRescueContent(rescueCatalog, definitions[index].id),
}));

export function rescueBarnacles(rescue: RescueDefinition): BarnacleConfig[] {
  return rescue.stages.flatMap((stage) => {
    if (stage.placement.kind !== "fixed") {
      throw new Error(`Rescue ${rescue.id} requires a generated layout before play`);
    }
    return stage.placement.targets.map((placement) => ({
      id: placement.id,
      type: placement.type,
      x: placement.x,
      y: placement.y,
      size: placement.diameter / 2,
      maxHp: placement.type === "hard" ? rescue.durability.hardHp : rescue.durability.normalHp,
    }));
  });
}

/** Derived compatibility view for v1 persistence labels and browser interaction helpers. */
export type LevelConfig = Readonly<{
  id: number;
  name: string;
  description: string;
  barnacleCount: number;
  hardBarnacleCount: number;
  normalBarnacleHp: number;
  hardBarnacleHp: number;
  barnacleSizeRange: readonly [number, number];
  timeLimitSeconds: number;
  animalHealth: number;
  parScore: number;
  placements: readonly Readonly<{ x: number; y: number; diameter: number; type: BarnacleConfig["type"] }>[];
}>;

export const levels: readonly LevelConfig[] = rescues.map(({ legacyLevelId, content }) => {
  const rescue = content.rescue;
  const placements = rescue.stages.flatMap((stage) => stage.placement.kind === "fixed" ? stage.placement.targets : []);
  return {
    id: legacyLevelId,
    name: rescue.name,
    description: rescue.description,
    barnacleCount: rescue.spawnProfile.targetCount,
    hardBarnacleCount: rescue.spawnProfile.hardTargetCount,
    normalBarnacleHp: rescue.durability.normalHp,
    hardBarnacleHp: rescue.durability.hardHp,
    barnacleSizeRange: rescue.spawnProfile.diameterRange,
    timeLimitSeconds: rescue.challenge.timeLimitSeconds,
    animalHealth: rescue.challenge.animalHealth,
    parScore: rescue.challenge.parScore,
    placements,
  };
});

export function levelBarnacles(level: LevelConfig): BarnacleConfig[] {
  const rescue = rescues.find((candidate) => candidate.legacyLevelId === level.id)?.content.rescue;
  if (!rescue) throw new Error(`Unknown compatibility level: ${level.id}`);
  return rescueBarnacles(rescue);
}
