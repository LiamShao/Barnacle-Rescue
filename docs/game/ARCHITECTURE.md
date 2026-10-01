# Architecture

Updated: 2026-10-01. This document describes the actual code and distinguishes the pending multi-stage integration. Historical milestone details are retained in [the roadmap archive](archive/FORMAL_ROADMAP_2026-09-30.md).

## Current stack and ownership

React, TypeScript, Vite, PixiJS, localStorage, Vitest and Playwright are installed. Audio uses synthesized Web Audio cues. Zustand and Howler.js are not installed; introduce a library only when a demonstrated need warrants it.

React owns menus, mode/rescue selection, HUD, accessible status, result UI, settings and navigation. Pixi owns interactive rendering, pointer sampling, collision, animation and transient feedback. Do not publish frame-by-frame renderer state through React.

| Boundary | Current responsibility |
| --- | --- |
| `src/App.tsx` | Selected playable rescue, prepared session/seed, stage summaries, accessible next-area UI, settings, result and final completion writes |
| `src/game/GameViewport.tsx` | One scene per run, Next area command, low-frequency callbacks, initialization error recovery and live sound setting |
| `src/game/BarnacleScene.ts` | Runtime `RescueRun`, active target views, pointer input, view transitions, Challenge/animal state, ticker, textures and feedback |
| `src/game/TurtleView.ts` | Dorsal/ventral presentation, raster base, complete vector fallback and procedural expression layers |
| `src/domain/` | Deterministic barnacle lifecycle, mood/reactions, geometry, identities and Challenge rules |
| `src/levels/` | Immutable content catalog, resolution, validation, fixed compatibility projection and seeded generation |
| `src/state/persistence.ts` | Strict versioned settings/completion adapter and v1-to-v2 migration |
| `src/state/rescueRun.ts` | Deterministic multi-stage target/HP/progress domain consumed by the scene; low-frequency summary projection |
| `src/state/rescueSession.ts` | Prepares a fresh whole-rescue run before mounting; default fresh UUID seed or explicit retained replay seed; rejects unfinished multi-area Challenge |

## Content and layout

`RescueDefinition` explicitly references one animal/environment pair and ordered stages. Stages reference animal-owned body views and fixed targets or eligible generated spawn regions. Definitions are separate from mutable run state.

Body views own authored circle, rotated ellipse, capsule or polygon cleanable/spawn geometry with exclusions. Collision never comes from texture alpha. IDs are branded and scoped: rescue/stage/view/region/target identity is independent of labels, array positions and coordinates. Generated target IDs use rescue, typed seed and rescue-global generation order.

`rescueCatalog` is validated before resolved content is exported. `rescues` and the numeric `levels` projection retain the three frozen fixed rescues for compatibility and browser helpers. `playableRescues` adds Zen-only `wholeTurtleCare`, optional legacy identity, mode eligibility and explicit next-rescue references. The original three-rescue next chain is preserved. All four IDs are valid save identities independently of the selected mode.

`generateRescueLayout(content, seed)` produces immutable placements. It preserves fixed layouts, selects weighted regions within capacity, allocates exact count/type totals, checks full target/hit footprints and spacing, samples with bounded attempts, and uses deterministic authored-anchor fallback. Preparation errors are caught before mounting and provide a recoverable selection-screen message. The scene consumes prepared runs for both fixed and generated content; `rescueBarnacles()` remains a compatibility helper, not the scene state source.

## Rendering, input and lifecycle

Each mounted run owns its Pixi Application, world, targets, input and transient effects. Navigation/replay destroys the old scene. The vector scene is usable before asynchronous raster loading; failed texture loading keeps the fallback. Asset dimensions affect presentation only, with configured coordinates and hit geometry remaining authoritative.

The scene attaches its complete display tree to the application before awaiting renderer initialization. Destruction is idempotent; cancellation while initialization is pending waits for initialization to settle, then destroys the renderer and all children without publishing gameplay callbacks. Initialization rejection releases the owned display tree. Run teardown uses `{ removeView: true }` rather than the boolean `true`, preserving Pixi's page-level resource pools while releasing the run's WebGL context. Active pointer capture is released before renderer destruction.

Pointer Events share mouse/pen/touch handling and capture the active pointer. Accepted movement samples intersect target circles; stationary input and large jumps do not behave as scraping. Generated stages use the larger of visual radius, configured design-space minimum radius scaled into scene coordinates, and 12 screen pixels. Fixed stages retain their original visual-radius/12px rule. Body-view presentation and viewport anchor are configured; full-body views use a centered anchor while the frozen view retains its prior vertical offset.

Current single-stage Challenge uses monotonic elapsed time, including background-tab time, and configured active-view cleanable regions. Zen multi-area transitions retain one Pixi Application, block input for 0.45 seconds (one ticker update with reduced motion), activate the next view's playable vector fallback, and then load its raster asynchronously. A view epoch and destruction flag protect all texture application. Old targets, particles and temporary reactions are cleared while overall mood remains. A ResizeObserver resizes the renderer and relays layout updates when the React area panel changes its container.

One page-lifetime Web Audio context is created/resumed after an opted-in gameplay gesture. React updates sound without remounting the scene. Reduced-motion lowers particle density and disables target wobble. The app root currently omits StrictMode because of the imperative renderer's development effect lifecycle.

## Persistence

Save version 2 contains settings and completion summaries keyed by stable `RescueId`. A valid v1 numeric payload migrates through the explicit legacy mapping and is rewritten when storage permits. Invalid/unknown/duplicate/unsupported payloads recover atomically to defaults; storage failures do not block play. Challenge keeps the highest score and grade, Zen records completion. Active targets, stages, seeds and layouts are never serialized.

`SaveIdentity` now requires a stable rescue ID and permits an optional legacy numeric ID. Current IDs are indexed independently from the v1 mapping, so Whole Turtle Care has no invented legacy number. The existing v2 schema can store its Zen success without a version bump.

## Integrated Zen flow and remaining Challenge work

`RescueRun` owns immutable prepared placements and fresh per-target barnacle state, active/completed stages, removal-based progress, and idempotent transition/completion flags. Its path is `playing → awaiting-next-stage → transitioning → playing/complete`. Replay retains the seed and reconstructs fresh state; abandonment retains nothing. It does not currently own Challenge failure, reactions or celebration timing.

Slice 1A integration boundary:

- React retains the prepared session and seed across the run; scene-local runtime run and animal state survive view changes. Replay prepares fresh state from the retained seed; selection/next rescue prepares a fresh seed.
- Pixi consumes only the active stage and updates the run through deterministic operations. Each target view's barnacle getter reads current run state, avoiding a second HP/progress ledger.
- React receives stage/overall summaries and issues the next-area action through the viewport handle. Focus moves to Next area on intermediate completion and to the area heading on view entry.
- Asset callbacks carry view/run identity checks; input and transient feedback are cleared before activating a new view. Each missing asset uses the corresponding view's fallback.
- Multi-stage Challenge is blocked at selection and preparation until 1B separates countdown consumption from monotonic combo time and verifies carryover/failure. Waiting for Next area will consume countdown; view switching will pause countdown but not combo expiry.
- Domain `complete` is not the same as result presentation: the coordinator handles final success/failure, celebration and unique completion writes.

Approved behavior is in [MULTI_AREA_RESCUE_SPEC](MULTI_AREA_RESCUE_SPEC.md); concrete geometry/art contracts are in [TURTLE_BODY_REGION_MAP](TURTLE_BODY_REGION_MAP.md). Execute according to [FORMAL_ROADMAP](FORMAL_ROADMAP.md), preserving the three existing rescues as regression constraints.
