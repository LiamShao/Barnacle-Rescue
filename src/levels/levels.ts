import type { BarnacleConfig } from "../domain/barnacle";

type Placement = {
  x: number;
  y: number;
  diameter: number;
  type: BarnacleConfig["type"];
};

export type LevelConfig = {
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
  placements: readonly Placement[];
};

export const levels: readonly LevelConfig[] = [
  {
    id: 1, name: "Gentle Start", description: "Three easy targets. Find your scraping rhythm.",
    barnacleCount: 3, hardBarnacleCount: 0, normalBarnacleHp: 70, hardBarnacleHp: 140,
    barnacleSizeRange: [72, 96], timeLimitSeconds: 75, animalHealth: 100, parScore: 750,
    placements: [
      { x: -110, y: -30, diameter: 96, type: "normal" },
      { x: 0, y: 45, diameter: 84, type: "normal" },
      { x: 110, y: -30, diameter: 88, type: "normal" },
    ],
  },
  {
    id: 2, name: "Shell Care", description: "Five targets, including one tougher shell.",
    barnacleCount: 5, hardBarnacleCount: 1, normalBarnacleHp: 85, hardBarnacleHp: 170,
    barnacleSizeRange: [62, 90], timeLimitSeconds: 90, animalHealth: 100, parScore: 950,
    placements: [
      { x: -120, y: -55, diameter: 78, type: "normal" },
      { x: 120, y: -55, diameter: 74, type: "normal" },
      { x: -120, y: 55, diameter: 70, type: "normal" },
      { x: 120, y: 55, diameter: 66, type: "normal" },
      { x: 0, y: 0, diameter: 90, type: "hard" },
    ],
  },
  {
    id: 3, name: "Full Rescue", description: "Seven targets. Give this turtle a complete clean.",
    barnacleCount: 7, hardBarnacleCount: 2, normalBarnacleHp: 100, hardBarnacleHp: 200,
    barnacleSizeRange: [56, 84], timeLimitSeconds: 105, animalHealth: 100, parScore: 1100,
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

export function levelBarnacles(level: LevelConfig): BarnacleConfig[] {
  return level.placements.map((placement, index) => ({
    id: `${level.id}-${index + 1}`,
    type: placement.type,
    x: placement.x,
    y: placement.y,
    size: placement.diameter / 2,
    maxHp: placement.type === "hard" ? level.hardBarnacleHp : level.normalBarnacleHp,
  }));
}
