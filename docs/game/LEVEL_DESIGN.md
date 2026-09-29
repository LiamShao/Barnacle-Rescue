# Level Design

All three MVP rescues use the same rules and differ only through configuration. FD-105 represents them as one-stage `RescueDefinition` entries sharing one sea-turtle dorsal view and shallow-ocean environment. Placement data remains explicitly authored and passes shared constraints. FD-107 moves persistence to stable rescue IDs; the derived numeric compatibility view remains only for player-facing rescue numbering and browser interaction helpers, and is not the runtime content source.

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

M4 introduced these values; FD-105 now exposes them from `src/levels/levels.ts` through `RescueDefinition`. Size ranges refer to diameters in the 820 × 540 design space; domain `size` is the radius. Placements are offsets from the turtle center and use stable rescue-scoped target IDs. FD-108 validates the complete authored catalog before it is exposed and tests one-stage resolution, counts, type mix, unique/scoped IDs, tuning, unchanged coordinates, configured-geometry containment, capacity, and non-overlapping hit circles at desktop and 320/390-pixel page widths. Hit radius has a 12-pixel minimum for small screens. This is code-verified tuning, not a completed touch or difficulty playtest.

All three levels are available from the selection screen. Successful results offer replay, next rescue (levels 1–2), and selection. Level 3 has a final-rescue message and no next button. Failed runs offer replay and selection, without a grade. Returning to selection discards the current run. M5 enables the configured time limit and health in Challenge; FD-106 derives bare-body penalty surfaces from the active view's configured cleanable regions and exclusions rather than scene constants. Completion summaries persist by stable rescue ID; unlocking remains deferred. Initial par scores for grades are 750 / 950 / 1100 for levels 1 / 2 / 3, pending playtesting.

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

Cleanable and spawn geometry uses explicit design-coordinate circles, rotated ellipses, oriented capsules, or simple polygons. Region boundaries count as cleanable, while touching an exclusion boundary invalidates a target placement. Placement containment uses the larger of the target's visual radius and configured minimum hit radius, ensuring that the entire reachable touch footprint fits safely. Each spawn region carries its own independent reference, capacity, selection weight, and fallback anchors. FD-201 fixes the first concrete values in `TURTLE_BODY_REGION_MAP.md`; texture alpha remains presentation-only.

Each rescue defines a target count, normal/hard mix, size range, eligible region set, minimum/maximum number of affected regions, minimum spacing, design-space minimum hit radius, and bounded attempt count. The current compatibility value of 36 design pixels preserves roughly the existing 12-screen-pixel minimum at the narrowest supported layout. Generation uses an injectable typed seed. The same content definition and seed produces the same selected regions, target types, sizes, coordinates, and IDs; numeric and string seeds are distinct. Different seeds may vary the distribution without changing configured totals or violating difficulty and safety constraints.

FD-109 implements this domain without changing the three fixed MVP layouts. It selects weighted regions while covering each generated stage, allocates exact totals within capacity, then samples fully contained positions outside exclusions. If any target in a region exhausts its attempts, that region's sampled batch is discarded and rebuilt largest-first from authored fallback anchors; an impossible layout raises a typed preparation error. Automated coverage exercises 40 seeds across circle, rotated ellipse, capsule, and polygon regions, plus forced fallback and failure. Per `MULTI_AREA_RESCUE_SPEC.md`, replay and failure retry reuse the current seed for a comparable case, while starting from selection or advancing to another rescue creates a fresh seed once FD2 integrates generated runs.

## FD-201 reference rescue tuning

**Whole Turtle Care** is the first generated, multi-stage tuning target. It uses 10 targets (8 normal, 2 hard), 52–68 design-unit diameters, 100 / 200 HP, 10 units of spacing, a 36-unit minimum hit radius, and exactly seven affected regions. Dorsal capacity is seven and ventral capacity is four, so the fixed total guarantees 6–7 targets on “Back and flippers” and 3–4 on “Underside.” Challenge begins at 150 seconds and 100 health with a provisional 1700 par score. These values are an authored baseline for FD2 implementation and playtesting, not a claim of completed difficulty validation.
