# Formal Development Roadmap

## Status

This roadmap begins after the frozen M1–M9 MVP baseline. M10 remains explicitly skipped and must not be represented as completed. `FORMAL_DEVELOPMENT.md` defines the inherited baseline and current D1 status; this document tracks planned formal-development work.

Last planned: 2026-09-17.

## Product direction

Formal development expands Barnacle Rescue along three independent, configuration-driven dimensions:

- multiple cleanable body areas within one rescue;
- constrained random barnacle distribution across eligible body areas;
- multiple ocean environments;
- multiple rescued animals.

The recommended first implementation uses discrete authored 2D views rather than free 3D rotation. A rescue may move between views such as dorsal, side, flipper, or underside while preserving one continuous run. Within those views, barnacles may appear on any configured eligible region, including shell/back, limbs or flippers, head/neck, and tail. React owns area navigation and accessible status. PixiJS owns the active view, cleanable geometry, generated targets, input, animation, and transient feedback.

Default planning assumptions, to be confirmed by `FD-101` before implementation:

- body areas follow a guided linear order;
- every configured stage is required unless explicitly marked optional in a later product decision;
- each run layout is generated from a seed; automated checks may inject a known seed, while replay/retry seed reuse remains an explicit decision in `FD-101`;
- total target count and normal/hard mix remain rescue-configured even when affected regions and coordinates vary;
- random placement uses authored spawn regions and exclusions rather than arbitrary texture pixels;
- overall progress counts removed targets across all required stages;
- animal mood derives from overall rescue progress;
- Challenge timing pauses during non-interactive view transitions only;
- active runs are not persisted;
- the first public shape remains a local-only single-player web game without accounts, multiplayer, shops, currency, or inventory.

## Delivery rules

- Deliver one playable end-to-end slice at a time.
- Preserve current scraping, Challenge, Zen, accessibility, navigation, and persistence behavior while compatibility work is underway.
- Keep target state and rescue completion deterministic and independently unit tested.
- Define cleanable geometry explicitly; never derive gameplay collision from texture alpha.
- Keep random generation reproducible from a seed and validate every generated target before the run becomes playable.
- Treat head, limb, tail, shell, and other body regions as independently eligible content regions with explicit capacities and exclusions.
- Keep animal mood separate from temporary relief, hurt, and celebration reactions.
- Keep environments presentational until a separate specification authorizes environment-specific mechanics.
- Do not mark manual touch, visual, audio, or device checks as verified unless they were executed.
- Every implementation task must update affected documentation and run configured typecheck, lint, unit, build, and relevant E2E checks.

## Task sizing

- `S`: small, isolated change with limited integration risk.
- `M`: multi-file change with deterministic tests or one UI integration boundary.
- `L`: end-to-end slice crossing domain, React, PixiJS, persistence, or content assets.

## FD0: close the current production-reference slice

- [x] **FD-001 — Review and close the intact/cracked target asset slice (`S`)**
  - Confirm normal and hard targets remain distinguishable at actual desktop and narrow gameplay sizes.
  - Keep the current procedural breaking scale-down unless a playtest demonstrates a readability gap.
  - Verify the asset-failure vector fallback remains playable.
  - Record the current code, asset, test, and documentation changes as one formal-development slice.

- [x] **FD-002 — Record unresolved D1 manual risks (`S`)**
  - Record real-device mouse and touch coverage that has and has not been executed.
  - Keep production audio listening and autoplay behavior open until manually tested.
  - Keep authored breaking sprites and final animal facial layers as optional polish rather than assumed blockers.

### FD0 exit criteria

- The working baseline is reviewable and internally consistent.
- No unexecuted manual check is described as verified.
- The next architecture slice starts from a known passing baseline.

### FD0 completion status — 2026-09-17

Normal and hard intact/cracked target assets were reviewed in the 1280px and 320px gameplay layouts. Type color and silhouette remain distinguishable; authored cracks are clear at desktop size and retain visible damage texture at narrow size. The asset-failure fallback, target removal rules, three-level flow, replay, modes, persistence, responsive layouts, typecheck, lint, deterministic tests, and production build were rechecked during closure.

Real-device touch feel, production audio listening/autoplay behavior, and optional breaking/facial asset polish remain explicitly unverified or deferred. A parallel headless Chromium run reproduced the known transient Pixi WebGL context-creation failure in one 320px test; that test passed immediately when rerun alone, and the serial full-suite result is recorded with the closure verification.

## FD1: multi-area specification and compatibility foundation

- [ ] **FD-101 — Approve the multi-area rescue behavior specification (`S`)**
  - Define `Rescue`, `Stage`, `BodyView`, and `CleanableRegion` in player-visible terms.
  - Confirm guided versus freely selectable area order.
  - Confirm required and optional area behavior.
  - Confirm overall progress, transition timing, completion, replay, and abandonment rules.
  - Confirm whether replay/retry reuses the current seed or generates a new case, especially for Challenge fairness.

- [ ] **FD-102 — Define configuration contracts (`M`, depends on FD-101)**
  - Define `RescueDefinition`, `RescueStage`, `AnimalDefinition`, `BodyViewDefinition`, `EnvironmentDefinition`, `SpawnRegion`, `SpawnProfile`, and generated `TargetPlacement`.
  - Keep immutable content definitions separate from per-run state.
  - Make valid animal/environment combinations explicit instead of generating a Cartesian product.

- [ ] **FD-103 — Define cleanable geometry primitives (`M`, depends on FD-101)**
  - Support deterministic ellipse, circle, capsule, and polygon regions as needed.
  - Support exclusion regions for eyes, mouth, wounds, UI-obscured areas, and other unsafe surfaces.
  - Define containment and minimum touch-target validation.
  - Give shell/back, each limb or flipper, head/neck, tail, and future animal-specific parts independent region IDs, capacities, and spawn weights.

- [ ] **FD-104 — Define globally stable identifiers (`S`, depends on FD-102)**
  - Give rescues, stages, views, regions, and targets stable IDs independent of display names and array positions.
  - Guarantee target uniqueness across the complete rescue.
  - Keep removal and completion idempotent across stage changes.
  - Derive generated target IDs deterministically from rescue seed and generation order without using display coordinates as identity.

- [ ] **FD-105 — Adapt the three current levels to one-stage rescues (`M`, depends on FD-102–104)**
  - Represent Gentle Start, Shell Care, and Full Rescue through the new configuration path.
  - Preserve their existing target count, HP, placement, score, time, result, and persistence behavior.
  - Avoid branching on a specific level or animal in the scene.
  - Keep their frozen authored placements through an explicit fixed-placement compatibility mode until random distribution ships in FD2.

- [ ] **FD-106 — Replace the hard-coded shell ellipse with configured geometry (`M`, depends on FD-103 and FD-105)**
  - Use the configured cleanable region for bare-body health penalties.
  - Keep water and space outside the animal harmless.
  - Keep accepted target contact clearing accumulated unsafe movement.

- [ ] **FD-107 — Specify save version 2 and migration (`M`, depends on FD-102 and FD-104)**
  - Move persisted completion identity from numeric level IDs to stable rescue IDs.
  - Preserve valid MVP Zen completions and Challenge best scores/grades.
  - Fall back safely for malformed, unsupported, duplicate, or unknown data.
  - Continue excluding active run state.

- [ ] **FD-108 — Add compatibility regression coverage (`M`, depends on FD-105–107)**
  - Unit-test configuration validation, geometry, stable IDs, progress, completion, and save migration.
  - Run the existing desktop and narrow browser flows without observable behavior changes.

- [ ] **FD-109 — Implement the seeded constrained-placement domain (`L`, depends on FD-102–104)**
  - Select affected regions from configured eligibility, capacity, weight, and minimum/maximum affected-region rules.
  - Allocate the configured total target count and normal/hard mix across selected regions.
  - Sample positions inside authored spawn geometry and outside every exclusion region.
  - Enforce full target containment, minimum spacing, touch reachability, and non-overlap across region boundaries.
  - Use bounded attempts and deterministic fallback anchors so generation cannot hang or produce an unplayable run.
  - Guarantee the same definition and seed produce the same region selection, positions, types, sizes, and IDs.

### FD1 exit criteria

- All three existing rescues run through the new definitions as one-stage rescues.
- Current player-visible behavior remains unchanged.
- The scene no longer assumes one specific turtle-shell ellipse.
- Persistence has a deterministic migration path before new rescue IDs ship.
- Seeded placement is deterministic, validated, and available without changing the frozen MVP layouts.

## FD2: first randomized multi-area vertical slice

The recommended reference content is one sea turtle rescue whose barnacles are distributed across eligible shell/back, head/neck, four limb/flipper, and tail regions visible in an authored dorsal view, plus one side or underside view when needed to reach a second dimension. A particular run does not need to use every region, but every configured eligible region must be reachable across validated seeds.

- [ ] **FD-201 — Specify the turtle body-region and view map (`S`, depends on FD-101 and FD-103)**
  - Define shell/back, head/neck, each front and rear flipper, tail, and any side/underside regions as explicit eligible or excluded areas.
  - Choose which regions are visible in the existing dorsal view and which require another authored view.
  - Define target count, type mix, sizes, region capacities, spawn weights, minimum affected regions, exclusions, and transition copy.
  - Use only existing normal and hard target mechanics in the first slice.

- [ ] **FD-202 — Produce the second-view asset set and fallback (`M`, depends on FD-201)**
  - Provide the animal base art needed for the selected view.
  - Reuse the current target asset/state pipeline.
  - Provide a complete vector fallback if the new view asset fails.
  - Document pivots, design-space bounds, and cleanable geometry independently of texture alpha.
  - Ensure head, limb/flipper, and tail targets remain visually separated from facial features and silhouette edges.

- [ ] **FD-203 — Implement deterministic multi-stage run state (`M`, depends on FD1)**
  - Generate the run layout from its seed and track active stage, completed stages, per-target state, current-stage progress, and overall progress.
  - Keep target removal and stage/rescue completion idempotent.
  - Reset every stage on replay and discard every stage on abandonment.

- [ ] **FD-204 — Implement PixiJS view lifecycle (`L`, depends on FD-202 and FD-203)**
  - Render only the active body view.
  - Destroy or safely reuse input, particles, target views, and transient animation during transitions.
  - Prevent late asset promises from mutating a newer view or run.
  - Preload the next view only when it does not delay the playable current view.

- [ ] **FD-205 — Implement React area navigation (`M`, depends on FD-203)**
  - Display the current area and overall rescue progress.
  - Reveal a clear next-area action after the current required stage is complete.
  - Move focus to the appropriate primary action after stage completion and view entry.
  - Prevent repeated activation while a transition is in progress.

- [ ] **FD-206 — Carry animal mood and reactions across views (`M`, depends on FD-203 and FD-204)**
  - Derive persistent mood from overall rescue progress.
  - Use relief for non-final removals and stage completion.
  - Trigger celebration only after the final required target in the final required stage.
  - Prevent stale reactions from the prior view from updating the new view.

- [ ] **FD-207 — Carry Challenge state across views (`M`, depends on FD-203–205)**
  - Keep score, combo, health, and total elapsed time continuous.
  - Pause time only during a non-interactive authored transition.
  - Prevent transition duration from extending the combo window unless explicitly specified.
  - Award the final time bonus and grade once, after total rescue completion.

- [ ] **FD-208 — Carry Zen state across views (`S`, depends on FD-203–206)**
  - Use identical target damage, removal, mood, and completion rules.
  - Keep timer, failure, health loss, score, and combo pressure absent.

- [ ] **FD-209 — Update results and persistence (`M`, depends on FD-203 and FD-107)**
  - Record success only after all required stages complete.
  - Allow the result to summarize completed body areas without exposing implementation details.
  - Keep failed or abandoned multi-stage runs from changing completion records.
  - Do not persist an active seed or generated layout unless a later decision explicitly adds run resumption.

- [ ] **FD-210 — Add multi-stage deterministic tests (`M`, depends on FD-203 and FD-206–209)**
  - Cover stage completion without rescue completion.
  - Cover overall progress and mood thresholds across stages.
  - Cover the final completion lock, replay reset, transition timing, and unique target counting.
  - Cover Challenge and Zen differences.
  - Cover seed reproducibility, different-seed variation, region capacity, exclusions, containment, spacing, type mix, bounded failure, and deterministic fallback anchors.

- [ ] **FD-211 — Add two-area browser coverage (`L`, depends on FD-204–209)**
  - Complete the first area without showing the final result.
  - Change views and retain overall state.
  - Complete the second area and celebrate exactly once.
  - Cover replay, abandonment, mode retention, asset fallback, desktop, and narrow layouts.
  - Exercise seeds that place targets on shell/back, head/neck, front and rear flippers, and tail without relying on random chance in the test.

- [ ] **FD-212 — Run documented real-device input checks (`M`, depends on FD-211)**
  - Test at least one mouse-driven desktop browser and one touch device.
  - Check scrape distance, accidental bare-body damage, view controls, HUD obstruction, and orientation changes.
  - Record devices, browsers, observations, and unresolved issues.

### FD2 observable acceptance criteria

- Given a rescue starts with a known seed, when its layout is generated repeatedly, then affected regions, target types, sizes, coordinates, and IDs are identical.
- Given two validated different seeds, when their layouts are generated, then they may affect different eligible regions while preserving configured count, type mix, safety, and difficulty bounds.
- Given head, limb/flipper, tail, and shell regions are eligible, when many validated seeds are exercised, then every eligible region can receive a target and no excluded facial or unsafe region ever does.
- Given placement cannot satisfy every constraint through sampling, when the bounded attempt limit is reached, then deterministic fallback anchors produce a valid layout or reject the configuration before gameplay begins.
- Given the rescue contains shell and flipper stages, when the shell is fully cleaned, then the shell is marked complete without showing the final result.
- Given the player enters another body view, when they return to a completed view, then removed targets do not return.
- Given any required stage remains incomplete, when the current stage finishes, then overall progress remains below 100%.
- Given the last required target is removed, then celebration and total rescue completion occur exactly once.
- Given a view transition occurs in Challenge, then health, score, combo state, and total run time remain consistent with the specified transition rules.
- Given replay is selected, then every stage, target, timer, score, health value, mood, and reaction is fresh.
- Given a view asset fails, then the affected view remains playable through its fallback.

### FD2 exit criteria

- One continuous rescue includes at least two body areas.
- Barnacles can appear across configured shell/back, head/neck, limb/flipper, and tail regions rather than only on the back.
- Layout variation is seeded, constrained, reproducible, and always playable.
- Both Challenge and Zen complete correctly.
- Desktop and narrow automated flows pass.
- Real-device checks are reported honestly and separately.

## FD3: environment expansion

- [ ] **FD-301 — Extract the current shallow-ocean environment definition (`M`, depends on FD1)**
  - Move background, palette, ambient particles, and ambience identity behind `EnvironmentDefinition`.
  - Keep target, animal, and rescue state outside the environment definition.

- [ ] **FD-302 — Specify a second environment (`S`, depends on FD-301)**
  - Prefer a seagrass bed or supervised rescue-pool setting for the first comparison.
  - Define presentation, ambience, foreground constraints, reduced-motion behavior, and fallback.
  - Do not introduce environment-specific gameplay in this slice.

- [ ] **FD-303 — Produce and integrate the second environment (`M`, depends on FD-302)**
  - Add background, restrained ambient motion, and ambience/audio configuration.
  - Keep targets and cleanable geometry readable against the new palette.

- [ ] **FD-304 — Create one explicit rescue using the new environment (`M`, depends on FD-303)**
  - Reuse an existing animal and the multi-area system.
  - Declare the animal/environment pairing explicitly.

- [ ] **FD-305 — Verify environment lifecycle and performance (`M`, depends on FD-303 and FD-304)**
  - Cover loading fallback, replay, rescue switching, reduced motion, resource cleanup, mobile memory, and frame stability.

### FD3 exit criteria

- The same animal can be rescued in two environments without duplicated mechanics code.
- Environment changes remain presentational and configuration-driven.

## FD4: second rescued animal

- [ ] **FD-401 — Select the second animal and care scenario (`M`)**
  - Validate that the body shape supports multiple readable cleaning areas.
  - Review the basic ecological and rescue-care framing before presenting barnacle removal as beneficial.
  - Define how the second animal differs from a turtle beyond a texture swap.

- [ ] **FD-402 — Specify the second animal's views and regions (`M`, depends on FD-401)**
  - Define at least two body views with their own cleanable and exclusion geometry.
  - Define mood poses and relief, hurt, and celebration presentation for each relevant view.
  - Do not reuse the turtle shell ellipse as a hidden assumption.
  - Define species-specific eligible regions, capacities, weights, exclusions, and fallback anchors for constrained random placement.

- [ ] **FD-403 — Introduce an animal-view rendering contract (`M`, depends on FD-402)**
  - Map shared domain mood/reaction state to animal-specific presentation.
  - Keep animation-frame state in PixiJS and persistent domain state outside the renderer.
  - Preserve a usable fallback for every required view.

- [ ] **FD-404 — Produce the second animal asset set (`L`, depends on FD-402 and FD-403)**
  - Create body-view bases, required expression layers, pivots, and documented bounds.
  - Reuse shared target assets unless the specification authorizes a new target behavior.

- [ ] **FD-405 — Create the second animal's first rescue (`L`, depends on FD-404)**
  - Use one existing environment and at least two body areas.
  - Avoid introducing a new tool, economy, or progression system in the same slice.

- [ ] **FD-406 — Balance and verify the second animal (`M`, depends on FD-405)**
  - Tune target count, HP, size, timing, and par score through configuration.
  - Cover persistence, result summaries, desktop, narrow, reduced motion, and real touch.

### FD4 exit criteria

- The second animal has distinct body geometry, views, and reactions while sharing the same rescue-domain rules.
- No level-specific or animal-specific branch is required in target damage and completion logic.

## FD5: content production and release capability

- [ ] **FD-501 — Add deterministic content validation (`M`)**
  - Reject duplicate IDs, missing references, impossible target counts, insufficient region capacity, invalid spawn/exclusion geometry, unreachable fallback anchors, overlapping targets, and missing required assets.

- [ ] **FD-502 — Add development-only geometry overlays (`M`)**
  - Visualize cleanable regions, spawn regions, exclusions, fallback anchors, generated target hit circles, IDs, seed, pivots, and design-space bounds.
  - Keep overlays unavailable in production builds.

- [ ] **FD-503 — Write the content authoring guide (`S`, depends on FD-501 and FD-502)**
  - Document how to add an environment, animal, body view, rescue, stage, and target placement.
  - Include validation, asset naming, fallback, test, and manual-review requirements.

- [ ] **FD-504 — Establish asset and performance budgets (`M`)**
  - Set budgets for initial load, one active view, transition latency, texture memory, and mobile frame stability.
  - Define preload and eviction rules from measured behavior.

- [ ] **FD-505 — Establish the formal release workflow (`L`)**
  - Choose a deployment target and supported browser/device matrix.
  - Add repeatable deployment, error monitoring, release checks, rollback guidance, and known-issue reporting.

## Critical path

Execute the next architecture work in this order:

1. `FD-001` — close the current asset slice.
2. `FD-101` — approve observable multi-area behavior.
3. `FD-102`–`FD-104` — define content contracts, geometry, random-spawn regions, and stable IDs.
4. `FD-105`–`FD-109` — migrate current rescues without behavior changes and prove seeded constrained placement.
5. `FD-201`–`FD-212` — deliver the seeded randomized multi-area turtle slice.
6. `FD3` — prove environment reuse.
7. `FD4` — prove animal reuse.
8. `FD5` — improve content throughput and release capability after the model is proven.

## Global definition of done

A task is complete only when all applicable items are true:

- observable behavior and edge cases are documented;
- configuration remains data-driven;
- generated content is reproducible from a seed and valid across its supported seed test set;
- domain rules are deterministic and unit tested;
- relevant React/PixiJS boundaries remain intact;
- persistence changes include validation and migration behavior;
- typecheck, lint, unit, build, and relevant E2E checks actually pass;
- desktop and narrow layouts are covered when UI or gameplay changes;
- touch, audio, visual feel, and device behavior are reported as manual checks when automation cannot establish them;
- affected game documents match shipped behavior;
- known limitations and the next smallest valuable slice are recorded.
