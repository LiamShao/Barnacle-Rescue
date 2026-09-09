# Architecture

## Default stack

Because the repository begins empty, use React, TypeScript, Vite, PixiJS, Zustand, Howler.js, localStorage, Vitest, and Playwright. Introduce each dependency only when its milestone needs it.

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

M0 bootstrap → M1 one interactive barnacle → M2 barnacle system → M3 animal reactions → M4 three levels → M5 Challenge → M6 Zen → M7 shell/HUD/results → M8 juice/audio → M9 persistence → M10 QA/deployment.
