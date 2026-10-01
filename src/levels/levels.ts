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
  type BodyViewDefinition,
  type EnvironmentDefinition,
  type RescueCatalog,
  type RescueDefinition,
  type ResolvedRescueContent,
} from "./rescueDefinitions";
import { assertValidRescueCatalog } from "./rescueValidation";

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
const dorsalFullBodyViewId = bodyViewId(seaTurtleId, "dorsal-full-body");
const dorsalFullBodyRegionIds = {
  shellBack: cleanableRegionId(dorsalFullBodyViewId, "shell-back"),
  neckBase: cleanableRegionId(dorsalFullBodyViewId, "neck-base"),
  frontLeftFlipper: cleanableRegionId(dorsalFullBodyViewId, "front-left-flipper"),
  frontRightFlipper: cleanableRegionId(dorsalFullBodyViewId, "front-right-flipper"),
  rearLeftFlipper: cleanableRegionId(dorsalFullBodyViewId, "rear-left-flipper"),
  rearRightFlipper: cleanableRegionId(dorsalFullBodyViewId, "rear-right-flipper"),
} as const;
const dorsalFullBodySpawnIds = {
  shellBack: spawnRegionId(dorsalFullBodyViewId, "shell-back"),
  neckBase: spawnRegionId(dorsalFullBodyViewId, "neck-base"),
  frontLeftFlipper: spawnRegionId(dorsalFullBodyViewId, "front-left-flipper"),
  frontRightFlipper: spawnRegionId(dorsalFullBodyViewId, "front-right-flipper"),
  rearLeftFlipper: spawnRegionId(dorsalFullBodyViewId, "rear-left-flipper"),
  rearRightFlipper: spawnRegionId(dorsalFullBodyViewId, "rear-right-flipper"),
} as const;
const ventralViewId = bodyViewId(seaTurtleId, "ventral");
const ventralRegionIds = {
  plastron: cleanableRegionId(ventralViewId, "plastron"),
  throat: cleanableRegionId(ventralViewId, "throat"),
  frontLeftFlipper: cleanableRegionId(ventralViewId, "front-left-flipper"),
  frontRightFlipper: cleanableRegionId(ventralViewId, "front-right-flipper"),
  rearLeftFlipper: cleanableRegionId(ventralViewId, "rear-left-flipper"),
  rearRightFlipper: cleanableRegionId(ventralViewId, "rear-right-flipper"),
  tailBase: cleanableRegionId(ventralViewId, "tail-base"),
} as const;
const ventralSpawnIds = {
  plastron: spawnRegionId(ventralViewId, "plastron"),
  tailBase: spawnRegionId(ventralViewId, "tail-base"),
} as const;
const shallowOceanId = environmentId("shallow-ocean");

const dorsalCompatibilityView: BodyViewDefinition = {
  id: dorsalViewId,
  name: "Shell",
  presentation: "dorsal",
  viewportAnchor: { x: 0.5, y: 0.55 },
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
};

const dorsalFullBodyView: BodyViewDefinition = {
  id: dorsalFullBodyViewId,
  name: "Back and flippers",
  presentation: "dorsal",
  viewportAnchor: { x: 0.5, y: 0.5 },
  asset: { src: "/assets/game/turtle_body_base_v2.png", fallback: "vector" },
  designSize: { width: 820, height: 540 },
  cleanableRegions: [
    {
      id: dorsalFullBodyRegionIds.shellBack,
      name: "Shell and back",
      geometry: { kind: "ellipse", center: { x: -30, y: 0 }, radiusX: 195, radiusY: 140, rotation: 0 },
      exclusions: [],
    },
    {
      id: dorsalFullBodyRegionIds.neckBase,
      name: "Neck base",
      geometry: { kind: "capsule", start: { x: 125, y: 0 }, end: { x: 215, y: 0 }, radius: 58 },
      exclusions: [{ kind: "ellipse", center: { x: 244, y: 5 }, radiusX: 38, radiusY: 32, rotation: 0 }],
    },
    {
      id: dorsalFullBodyRegionIds.frontLeftFlipper,
      name: "Front-left flipper",
      geometry: { kind: "capsule", start: { x: 70, y: -95 }, end: { x: 130, y: -185 }, radius: 56 },
      exclusions: [],
    },
    {
      id: dorsalFullBodyRegionIds.frontRightFlipper,
      name: "Front-right flipper",
      geometry: { kind: "capsule", start: { x: 70, y: 95 }, end: { x: 130, y: 185 }, radius: 56 },
      exclusions: [],
    },
    {
      id: dorsalFullBodyRegionIds.rearLeftFlipper,
      name: "Rear-left flipper",
      geometry: { kind: "capsule", start: { x: -180, y: -100 }, end: { x: -258, y: -150 }, radius: 50 },
      exclusions: [],
    },
    {
      id: dorsalFullBodyRegionIds.rearRightFlipper,
      name: "Rear-right flipper",
      geometry: { kind: "capsule", start: { x: -180, y: 100 }, end: { x: -258, y: 150 }, radius: 50 },
      exclusions: [],
    },
  ],
  spawnRegions: [
    {
      id: dorsalFullBodySpawnIds.shellBack,
      cleanableRegionId: dorsalFullBodyRegionIds.shellBack,
      geometry: { kind: "ellipse", center: { x: -30, y: 0 }, radiusX: 150, radiusY: 95, rotation: 0 },
      capacity: 2,
      weight: 5,
      fallbackAnchors: [{ x: -85, y: -35 }, { x: 35, y: 35 }],
    },
    {
      id: dorsalFullBodySpawnIds.neckBase,
      cleanableRegionId: dorsalFullBodyRegionIds.neckBase,
      geometry: { kind: "capsule", start: { x: 155, y: 0 }, end: { x: 175, y: 0 }, radius: 46 },
      capacity: 1,
      weight: 1,
      fallbackAnchors: [{ x: 165, y: 0 }],
    },
    {
      id: dorsalFullBodySpawnIds.frontLeftFlipper,
      cleanableRegionId: dorsalFullBodyRegionIds.frontLeftFlipper,
      geometry: { kind: "capsule", start: { x: 88, y: -120 }, end: { x: 116, y: -164 }, radius: 46 },
      capacity: 1,
      weight: 3,
      fallbackAnchors: [{ x: 102, y: -142 }],
    },
    {
      id: dorsalFullBodySpawnIds.frontRightFlipper,
      cleanableRegionId: dorsalFullBodyRegionIds.frontRightFlipper,
      geometry: { kind: "capsule", start: { x: 88, y: 120 }, end: { x: 116, y: 164 }, radius: 46 },
      capacity: 1,
      weight: 3,
      fallbackAnchors: [{ x: 102, y: 142 }],
    },
    {
      id: dorsalFullBodySpawnIds.rearLeftFlipper,
      cleanableRegionId: dorsalFullBodyRegionIds.rearLeftFlipper,
      geometry: { kind: "capsule", start: { x: -198, y: -116 }, end: { x: -233, y: -138 }, radius: 43 },
      capacity: 1,
      weight: 2,
      fallbackAnchors: [{ x: -216, y: -127 }],
    },
    {
      id: dorsalFullBodySpawnIds.rearRightFlipper,
      cleanableRegionId: dorsalFullBodyRegionIds.rearRightFlipper,
      geometry: { kind: "capsule", start: { x: -198, y: 116 }, end: { x: -233, y: 138 }, radius: 43 },
      capacity: 1,
      weight: 2,
      fallbackAnchors: [{ x: -216, y: 127 }],
    },
  ],
};

const ventralView: BodyViewDefinition = {
  id: ventralViewId,
  name: "Underside",
  presentation: "ventral",
  viewportAnchor: { x: 0.5, y: 0.5 },
  asset: { src: "/assets/game/turtle_body_ventral_v4.png", fallback: "vector" },
  designSize: { width: 820, height: 540 },
  cleanableRegions: [
    {
      id: ventralRegionIds.plastron,
      name: "Plastron",
      geometry: { kind: "ellipse", center: { x: -20, y: 0 }, radiusX: 225, radiusY: 140, rotation: 0 },
      exclusions: [],
    },
    {
      id: ventralRegionIds.throat,
      name: "Throat",
      geometry: { kind: "capsule", start: { x: 125, y: 0 }, end: { x: 215, y: 0 }, radius: 58 },
      exclusions: [{ kind: "ellipse", center: { x: 244, y: 5 }, radiusX: 38, radiusY: 32, rotation: 0 }],
    },
    {
      id: ventralRegionIds.frontLeftFlipper,
      name: "Front-left flipper",
      geometry: { kind: "capsule", start: { x: 70, y: 95 }, end: { x: 130, y: 185 }, radius: 56 },
      exclusions: [],
    },
    {
      id: ventralRegionIds.frontRightFlipper,
      name: "Front-right flipper",
      geometry: { kind: "capsule", start: { x: 70, y: -95 }, end: { x: 130, y: -185 }, radius: 56 },
      exclusions: [],
    },
    {
      id: ventralRegionIds.rearLeftFlipper,
      name: "Rear-left flipper",
      geometry: { kind: "capsule", start: { x: -180, y: 100 }, end: { x: -258, y: 150 }, radius: 50 },
      exclusions: [],
    },
    {
      id: ventralRegionIds.rearRightFlipper,
      name: "Rear-right flipper",
      geometry: { kind: "capsule", start: { x: -180, y: -100 }, end: { x: -258, y: -150 }, radius: 50 },
      exclusions: [],
    },
    {
      id: ventralRegionIds.tailBase,
      name: "Tail base",
      geometry: { kind: "capsule", start: { x: -205, y: 0 }, end: { x: -285, y: 0 }, radius: 52 },
      exclusions: [],
    },
  ],
  spawnRegions: [
    {
      id: ventralSpawnIds.plastron,
      cleanableRegionId: ventralRegionIds.plastron,
      geometry: { kind: "ellipse", center: { x: -20, y: 0 }, radiusX: 165, radiusY: 100, rotation: 0 },
      capacity: 3,
      weight: 5,
      fallbackAnchors: [{ x: -100, y: -35 }, { x: 15, y: 45 }, { x: 75, y: -35 }],
    },
    {
      id: ventralSpawnIds.tailBase,
      cleanableRegionId: ventralRegionIds.tailBase,
      geometry: { kind: "capsule", start: { x: -232, y: 0 }, end: { x: -255, y: 0 }, radius: 42 },
      capacity: 1,
      weight: 1,
      fallbackAnchors: [{ x: -247, y: 0 }],
    },
  ],
};

export const animals: readonly AnimalDefinition[] = [{
  id: seaTurtleId,
  name: "Sea turtle",
  bodyViews: [dorsalCompatibilityView, dorsalFullBodyView, ventralView],
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
      minimumTargetHitRadius: 36,
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
const wholeTurtleCareId = rescueId("whole-turtle-care");
export const wholeTurtleCareDefinition: RescueDefinition = {
  id: wholeTurtleCareId,
  name: "Whole Turtle Care",
  description: "Clean 10 barnacles across the turtle's back and underside.",
  animalId: seaTurtleId,
  environmentId: shallowOceanId,
  stages: [
    {
      id: stageId(wholeTurtleCareId, "back-and-flippers"),
      name: "Back and flippers",
      bodyViewId: dorsalFullBodyViewId,
      copy: {
        instruction: "Scrape the barnacles from the back and flippers.",
        completionSupport: "One more area to check underneath.",
        transitionStatus: "Turning the turtle gently…",
      },
      placement: { kind: "generated", spawnRegionIds: Object.values(dorsalFullBodySpawnIds) },
    },
    {
      id: stageId(wholeTurtleCareId, "underside"),
      name: "Underside",
      bodyViewId: ventralViewId,
      copy: {
        instruction: "Finish the rescue by cleaning the underside.",
        arrivalStatus: "Underside ready. Keep scraping.",
      },
      placement: { kind: "generated", spawnRegionIds: Object.values(ventralSpawnIds) },
    },
  ],
  spawnProfile: {
    targetCount: 10,
    hardTargetCount: 2,
    diameterRange: [52, 68],
    minimumAffectedRegions: 7,
    maximumAffectedRegions: 7,
    minimumTargetSpacing: 10,
    minimumTargetHitRadius: 36,
    maximumPlacementAttemptsPerTarget: 60,
  },
  durability: { normalHp: 100, hardHp: 200 },
  challenge: { timeLimitSeconds: 150, animalHealth: 100, parScore: 1700 },
};

export const rescueCatalog: RescueCatalog = {
  animals,
  environments,
  rescues: [...definitions, wholeTurtleCareDefinition],
};
assertValidRescueCatalog(rescueCatalog);
export const wholeTurtleCare = resolveRescueContent(rescueCatalog, wholeTurtleCareId);

export type ConfiguredRescue = Readonly<{
  legacyLevelId: number;
  content: ResolvedRescueContent;
}>;

export const rescues: readonly ConfiguredRescue[] = authoredRescues.map((authored, index) => ({
  legacyLevelId: authored.legacyLevelId,
  content: resolveRescueContent(rescueCatalog, definitions[index].id),
}));

export type PlayableRescue = Readonly<{
  content: ResolvedRescueContent;
  legacyLevelId?: number;
  modes: readonly ("zen" | "challenge")[];
  nextRescueId?: RescueDefinition["id"];
}>;

/** Keep the frozen three-rescue next chain; the new care case is selected separately. */
export const playableRescues: readonly PlayableRescue[] = [
  ...rescues.map((rescue, index) => ({
    ...rescue,
    modes: ["challenge", "zen"] as const,
    nextRescueId: rescues[index + 1]?.content.rescue.id,
  })),
  { content: wholeTurtleCare, modes: ["zen"] },
];

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
