# Level Design

All three MVP levels use the same rules and differ only through configuration. Placement data may be authored explicitly but must pass shared constraints.

```ts
type BarnacleType = "normal" | "hard";

type LevelConfig = {
  id: number;
  name: string;
  barnacleCount: number;
  hardBarnacleCount: number;
  normalBarnacleHp: number;
  hardBarnacleHp: number;
  barnacleSizeRange: readonly [number, number];
  timeLimitSeconds: number;
  animalHealth: number;
};
```

Zen ignores `timeLimitSeconds` and fail pressure; it does not fork the level or mechanic.

## Initial tuning targets

| Level | Barnacles | Hard | Normal / hard HP | Size range | Challenge time | Health | Intent |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1: Gentle Start | 3 | 0 | 70 / 140 | 72–96 | 75s | 100 | Teach drag scraping and feedback |
| 2: Shell Care | 5 | 1 | 85 / 170 | 62–90 | 90s | 100 | Introduce hard target and target switching |
| 3: Full Rescue | 7 | 2 | 100 / 200 | 56–84 | 105s | 100 | Test fluency without a new system |

These are playtest baselines, not promises. Tune time after measuring typical completion, targeting comfortable Level 1 completion and rising but fair Challenge pressure.

## Placement constraints

- Center each barnacle inside a designated cleanable turtle-body region.
- Keep the full visual and hit area on the turtle and away from critical facial features.
- Prevent overlap that hides state changes or makes one gesture ambiguously hit multiple targets.
- Preserve a minimum target size appropriate for touch; increase the invisible hit radius if needed without changing visual size.
- Keep targets readable against the underlying shell and distribute them so the scraper path is not obstructed by UI.

## Difficulty rules

Increase count, HP, smaller-but-accessible size, hard ratio, and timer pressure. Do not introduce level-specific code, new tools, currencies, or unrelated hazards merely to create difficulty.
