# Level Design

All three MVP rescues use the same rules and differ only through configuration. FD-105 represents them as one-stage `RescueDefinition` entries sharing one sea-turtle dorsal view and shallow-ocean environment. Placement data remains explicitly authored and passes shared constraints. A derived numeric compatibility view preserves save-version-1 IDs and browser interaction helpers until FD-107 migrates persistence; it is not the runtime content source.

```ts
type BarnacleType = "normal" | "hard";

type RescueDefinition = {
  id: RescueId;
  name: string;
  animalId: AnimalId;
  environmentId: EnvironmentId;
  stages: readonly RescueStage[];
  spawnProfile: SpawnProfile;
  durability: { normalHp: number; hardHp: number };
  challenge: { timeLimitSeconds: number; animalHealth: number; parScore: number };
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

M4 introduced these values; FD-105 now exposes them from `src/levels/levels.ts` through `RescueDefinition`. Size ranges refer to diameters in the 820 × 540 design space; domain `size` is the radius. Placements are offsets from the turtle center and use stable rescue-scoped target IDs. Tests verify one-stage resolution, counts, type mix, unique IDs, increasing total HP, unchanged authored coordinates, size ranges, configured-geometry containment, and non-overlapping hit circles at desktop and 320/390-pixel page widths. Hit radius has a 12-pixel minimum for small screens. This is code-verified tuning, not a completed touch or difficulty playtest.

All three levels are available from the selection screen. Successful results offer replay, next rescue (levels 1–2), and selection. Level 3 has a final-rescue message and no next button. Failed runs offer replay and selection, without a grade. Returning to selection discards the current run. M5 enables the configured time limit and health in Challenge; unlocking and persistence remain deferred. Initial par scores for grades are 750 / 950 / 1100 for levels 1 / 2 / 3, pending playtesting.

## Placement constraints

M6 exposes the same three configurations in both modes. Zen hides the time/health values and skips their mechanics. Mode selection does not change placements, sizes, HP or target counts. Replay and next-level navigation preserve the mode.

- Center each barnacle inside a designated cleanable turtle-body region.
- Keep the full visual and hit area on the turtle and away from critical facial features.
- Prevent overlap that hides state changes or makes one gesture ambiguously hit multiple targets.
- Preserve a minimum target size appropriate for touch; increase the invisible hit radius if needed without changing visual size.
- Keep targets readable against the underlying shell and distribute them so the scraper path is not obstructed by UI.

## Difficulty rules

Increase count, HP, smaller-but-accessible size, hard ratio, and timer pressure. Do not introduce level-specific code, new tools, currencies, or unrelated hazards merely to create difficulty.

## Formal-development constrained random placement

The frozen MVP levels retain their authored shell placements. Formal-development rescues will be able to generate barnacles across any animal-specific eligible body region, including back or shell, head/neck, individual limbs or flippers, and tail. Random placement is constrained content generation, not arbitrary placement over image pixels.

Each animal view defines named cleanable regions, spawn regions, exclusion regions, capacity, selection weight, minimum target spacing, and deterministic fallback anchors. Head regions must exclude eyes, mouth, nostrils, wounds, silhouette edges, and any area where scraping would be visually unsafe or hard to control. A target must be fully contained inside its spawn region, outside every exclusion, reachable at supported touch sizes, and non-overlapping with every other target.

Cleanable and spawn geometry uses explicit design-coordinate circles, rotated ellipses, oriented capsules, or simple polygons. Region boundaries count as cleanable, while touching an exclusion boundary invalidates a target placement. Placement containment uses the larger of the target's visual radius and configured minimum hit radius, ensuring that the entire reachable touch footprint fits safely. Each spawn region carries its own independent reference, capacity, selection weight, and fallback anchors; the concrete turtle body-region map remains an FD-201 content task.

Each rescue defines a target count, normal/hard mix, size range, eligible region set, and minimum/maximum number of affected regions. Generation uses an injectable seed. The same content definition and seed must produce the same selected regions, target types, sizes, coordinates, and IDs. Different seeds may vary the distribution without changing configured totals or violating difficulty and safety constraints.

The generator uses bounded sampling attempts. If sampling cannot place a valid target, it uses authored deterministic fallback anchors or rejects the invalid rescue configuration before gameplay begins; it must never loop indefinitely or silently place an unreachable target. Automated coverage exercises known seeds for every eligible region and edge case. Per `MULTI_AREA_RESCUE_SPEC.md`, replay and failure retry reuse the current seed for a comparable case, while starting from selection or advancing to another rescue creates a fresh seed.
