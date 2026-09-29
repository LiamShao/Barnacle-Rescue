# Architecture

## Default stack

Because the repository begins empty, use React, TypeScript, Vite, PixiJS, Zustand, localStorage, Vitest, and Playwright. M8 uses small synthesized Web Audio cues so the prototype remains asset-free; introduce Howler.js only when imported clips, mixing, or broader audio controls justify it. Introduce each dependency only when its milestone needs it.

## Ownership boundary

```text
React application
├── Main Menu / Mode Select / Level Select
├── HUD / Result Modal
└── GameViewport lifecycle boundary
    └── PixiJS scene, input, hit detection, animation, particles
```

React owns routes/screens, accessible controls, overlays, and ordinary CSS layout. PixiJS owns the turtle scene, scraper, barnacle visuals, pointer sampling, collision, and gameplay feedback. Do not mirror frame-by-frame render state through React.

D1 keeps an immediately playable vector scene as the loading and error fallback, then asynchronously applies raster textures for the ocean, turtle, targets, and scraper. Texture dimensions and transparency are presentation-only: configured design coordinates, circular target hit areas, scraper sampling, and all domain state remain unchanged. Procedural face/reaction and damage overlays sit above the raster bases.

## State and data

- Keep immutable level definitions in configuration, separate from per-run state.
- Keep barnacle HP/state and animal mood/reaction in deterministic game-domain logic that can be unit tested without rendering.
- Use Zustand for cross-boundary session state such as selected mode/level, progress, score, health, timer status, and result. Keep transient pointer/particle state local to the game layer.
- Emit domain events such as `barnacleDamaged`, `barnacleRemoved`, `animalReacted`, and `rescueCompleted`; make completion/removal idempotent.
- Persist only versioned settings and unlocked/completed level summaries in localStorage. Validate reads and recover to defaults from invalid data.

The core target entity begins with this deliberately small contract:

```ts
type BarnacleType = "normal" | "hard";
type BarnacleState = "intact" | "cracked" | "breaking" | "removed";

type Barnacle = {
  id: string;
  type: BarnacleType;
  x: number;
  y: number;
  size: number;
  hp: number;
  maxHp: number;
  state: BarnacleState;
};
```

Derive `cracked` from an HP threshold, enter `breaking` once at zero HP, then mark `removed` after detachment feedback. Removed targets cannot take damage or update progress again.

### Formal-development content contracts

FD-102 introduces immutable definitions in `src/levels/rescueDefinitions.ts`. A `RescueDefinition` explicitly selects one `AnimalDefinition` and one `EnvironmentDefinition`, so supported pairings come from authored rescues rather than an animal/environment Cartesian product. Ordered `RescueStage` entries reference body views owned by that animal. Each stage declares either authored fixed targets for MVP compatibility or eligible spawn regions for later seeded generation.

`BodyViewDefinition` owns cleanable and spawn regions. FD-103 supplies its default `CleanableGeometry` union: circle, rotated ellipse, oriented capsule, or polygon, all in authored design coordinates. Deterministic helpers test points, full circular target footprints, exclusion overlap, and the larger of visual or configured minimum hit radius. Geometry is never inferred from texture alpha. `SpawnProfile` holds rescue-wide count, affected-region limits, size/spacing, minimum hit radius, and bounded-attempt tuning. `TargetPlacement` represents an immutable generated or authored case layout and deliberately excludes mutable HP, damage state, progress, and reactions; those remain per-run domain state. The resolver checks direct rescue, animal, environment, and body-view references; FD-108 adds complete authored compatibility validation, and FD-109 validates seeded output during generation.

FD-104 uses branded, scoped string identifiers from `src/domain/identifiers.ts`. Rescue, animal, and environment keys are explicit authored kebab-case values; stage IDs are scoped by rescue, views by animal, and cleanable/spawn regions by view. Labels and array positions never define content identity. Authored target IDs are rescue-scoped. Generated target IDs use only rescue ID, typed seed, and rescue-global generation order, never display coordinates. Reusing a seed reproduces IDs, and duplicate target IDs are rejected across all fixed stages before content resolves. The existing unique-removal ledger therefore remains idempotent across stage boundaries. Full configuration validation and seeded generation remain assigned to FD-108 and FD-109 respectively.

FD-105 migrates Gentle Start, Shell Care, and Full Rescue to explicit, fixed-placement, one-stage definitions. React selects a `ConfiguredRescue`, resolves its declared animal/environment/view content, and passes that resolved content through `GameViewport` to the Pixi scene. Scene target creation, Challenge tuning, turtle asset, and background asset come from this path without rescue- or animal-specific branches. The numeric level projection is derived from the same definitions only for save-version-1 compatibility and browser test coordinates; FD-107 will replace its persistence role.

FD-106 removes the scene's hard-coded shell ellipse from Challenge health logic. Accepted pointer samples are transformed from screen space into the active body view's design coordinates, then tested against the union of configured cleanable regions with exclusions removed. Target contact continues to reset unsafe-distance accumulation; samples outside configured surfaces contribute no bare-body distance.

FD-107 introduces save version 2. Completion entries use stable `RescueId` values rather than numeric compatibility IDs. Loading validates the complete payload against the configured rescue identity map; a valid version-1 payload migrates its settings, Zen completion, and best Challenge result through the explicit legacy-level-to-rescue mapping and is rewritten as version 2 when storage permits. Invalid, unknown, duplicate, or unsupported data falls back atomically to defaults, and no active-run state is serialized.

```ts
type SaveDataV2 = {
  version: 2;
  settings: { soundEnabled: boolean; mode: "challenge" | "zen" };
  completions: Array<{
    rescueId: RescueId;
    zenCompleted: boolean;
    challengeBest: { score: number; grade: "S" | "A" | "B" | "C" } | null;
  }>;
};
```

FD-108 validates the authored catalog once before resolved rescues are exported. The validator checks identifier uniqueness and scope, cross-references, geometry and exclusions, positive tuning, fallback anchors, fixed target totals and hard mix, size bounds, region capacity, containment, and hit-area separation. Generated stages are limited here to structural region-reference validation; target allocation and seeded output validation belong to FD-109. Existing domain and persistence tests remain the source of truth for progress/completion idempotence and save migration, while the complete browser suite guards observable desktop and narrow behavior.

FD-109 adds the pure `generateRescueLayout` preparation boundary. It accepts resolved content plus a typed seed and returns immutable `TargetPlacement` data for every stage. Fixed targets pass through unchanged. Generated stages use deterministic weighted region selection, exact capacity/type allocation, geometry-bounded sampling, configured touch radius and spacing, and finite authored-anchor fallback. Target IDs depend only on rescue, typed seed, and global generation order. An impossible definition or seed/layout combination raises `PlacementGenerationError` before scene creation. The generator does not own HP, damage, progress, reactions, navigation, or active-run persistence, and player-flow integration remains deferred to FD2.

FD-201 provides the first concrete consumer contract in `TURTLE_BODY_REGION_MAP.md` without changing runtime code. **Whole Turtle Care** uses a `dorsal-full-body` definition that reuses the existing dorsal art, plus a new ventral view, two ordered generated stages, and eight eligible spawn regions. The separate dorsal definition preserves the shell-only cleanable surface and Challenge behavior of the three frozen rescues. Ten targets across exactly seven regions use capacity constraints to guarantee a 6–7 dorsal / 3–4 ventral split without adding stage quota fields to `RescueStage` or special cases to the generator. Visible but target-ineligible ventral throat/flipper surfaces remain cleanable for consistent Challenge feedback. FD-202 owns the new asset/fallback; FD-203 onward own run and UI integration.

## Input and timing

Use Pointer Events so mouse, pen, and touch share one path. Capture the active pointer during a scrape. Damage depends on sampled movement intersecting a barnacle, with distance/time caps to avoid event-rate exploits and large pointer jumps. Game timers use elapsed time rather than render-frame counts.

## Suggested source shape

```text
src/
├── app/             React screens and navigation
├── game/            Pixi scene, input, rendering, feedback
├── domain/          deterministic entities, rules, events
├── levels/          LevelConfig data
├── state/           Zustand stores and persistence adapter
└── styles/          application CSS
```

This is a starting boundary, not a reason to create unused files or layers.

## Delivery order

M9 introduced a small deterministic adapter in `src/state/persistence.ts` rather than adding a state library solely for persistence. FD-107 now makes React consume and write complete version-2 snapshots keyed by stable rescue IDs, with strict version-1 migration. Challenge retains the highest score and its grade, Zen records completion, and active scene state is never serialized.

M8 keeps low-frequency transient particles and target wobble local to each Pixi scene. Each run owns and destroys its Pixi Application, world, input and game state. A single page-lifetime Web Audio context is created or resumed only after an opted-in gameplay pointer gesture; individual cues remain short-lived and rate-limited. React owns the session-level sound toggle and updates the live scene without remounting it. The app root does not use React StrictMode because its development-only effect replay is not useful for the imperative renderer lifecycle. Reduced-motion preference lowers particle density and omits target wobble; persistence of the sound choice belongs to M9.

M7 adds a React-owned main-menu state before the combined mode/level screen. Returning home clears the selected level, unmounts the viewport and preserves the selected mode. No game scene runs behind a menu. Native details/summary provide instructions; the HUD exposes progressbar semantics and results remain scrollable within the rescue card.

M6 passes a `GameMode` from React through the viewport into each new scene. Zen gates Challenge time, unsafe-shell penalties and score recording at the scene boundary; shared target damage, removal, progress and animal state remain unchanged. React conditionally renders mode-specific selection text, HUD and result details. Mode changes occur outside gameplay, after destroying the old scene.

M5 uses React-local navigation and session summaries with stable callbacks at the viewport boundary. Each scene receives an immutable `LevelConfig` and creates fresh target and Challenge state. Deterministic Challenge rules live in `src/domain/challenge.ts`; the scene supplies elapsed monotonic time before ticks and input, and publishes HUD changes only at displayed-second or status/score/health/combo changes. Selecting/replaying/advancing remounts the scene; leaving gameplay destroys it. Zustand remains deferred until state sharing requires it.

M0 bootstrap → M1 one interactive barnacle → M2 barnacle system → M3 animal reactions → M4 three levels → M5 Challenge → M6 Zen → M7 shell/HUD/results → M8 juice/audio → M9 persistence. M10 QA/deployment was explicitly skipped on 2026-09-15; formal development now follows `FORMAL_DEVELOPMENT.md` without treating M10 as complete.
