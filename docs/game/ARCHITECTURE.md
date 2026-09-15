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

M9 uses a small deterministic adapter in `src/state/persistence.ts` rather than adding a state library solely for persistence. React owns the loaded save and writes complete version-1 snapshots after setting changes or successful results. Validation accepts only known level IDs and exact setting/result primitives; any invalid or unsupported payload becomes the default save. Challenge retains the highest score and its grade, Zen records completion, and active scene state is never serialized.

M8 keeps low-frequency transient particles and target wobble local to each Pixi scene. Each run owns and destroys its Pixi Application, world, input and game state. A single page-lifetime Web Audio context is created or resumed only after an opted-in gameplay pointer gesture; individual cues remain short-lived and rate-limited. React owns the session-level sound toggle and updates the live scene without remounting it. The app root does not use React StrictMode because its development-only effect replay is not useful for the imperative renderer lifecycle. Reduced-motion preference lowers particle density and omits target wobble; persistence of the sound choice belongs to M9.

M7 adds a React-owned main-menu state before the combined mode/level screen. Returning home clears the selected level, unmounts the viewport and preserves the selected mode. No game scene runs behind a menu. Native details/summary provide instructions; the HUD exposes progressbar semantics and results remain scrollable within the rescue card.

M6 passes a `GameMode` from React through the viewport into each new scene. Zen gates Challenge time, unsafe-shell penalties and score recording at the scene boundary; shared target damage, removal, progress and animal state remain unchanged. React conditionally renders mode-specific selection text, HUD and result details. Mode changes occur outside gameplay, after destroying the old scene.

M5 uses React-local navigation and session summaries with stable callbacks at the viewport boundary. Each scene receives an immutable `LevelConfig` and creates fresh target and Challenge state. Deterministic Challenge rules live in `src/domain/challenge.ts`; the scene supplies elapsed monotonic time before ticks and input, and publishes HUD changes only at displayed-second or status/score/health/combo changes. Selecting/replaying/advancing remounts the scene; leaving gameplay destroys it. Zustand remains deferred until state sharing requires it.

M0 bootstrap → M1 one interactive barnacle → M2 barnacle system → M3 animal reactions → M4 three levels → M5 Challenge → M6 Zen → M7 shell/HUD/results → M8 juice/audio → M9 persistence. M10 QA/deployment was explicitly skipped on 2026-09-15; formal development now follows `FORMAL_DEVELOPMENT.md` without treating M10 as complete.
