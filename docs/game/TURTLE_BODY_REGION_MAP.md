# Sea Turtle Body-Region and View Map

## Status and authority

This document approves the concrete content plan for `FD-201` and remains the content source of truth for Whole Turtle Care. Slice 1A now exposes the validated generated rescue in Zen, including both views, next-area controls, total progress, same-seed replay and final completion saving. Multi-area Challenge and real-device acceptance are still pending; current verification is recorded in `ACCEPTANCE_CRITERIA.md`.

The first slice uses the existing normal and hard barnacle mechanics only. It does not add wounds, tools, optional areas, free view selection, or a third body view.

## Coordinate and view contract

Both views use the existing 820 × 540 design space with origin at the turtle pivot, positive x toward the head, and positive y toward the bottom of the screen. Geometry is authoritative and independent of texture alpha.

The integrated full-body dorsal and ventral views both use viewport anchor `(0.5, 0.5)`. The frozen shell-only view retains `(0.5, 0.55)`. Presentation and anchors are explicit view configuration; a ResizeObserver keeps renderer size, target coordinates, and pointer conversion aligned when React's area panel changes the canvas container.

- `animal/sea-turtle/view/dorsal` remains the frozen shell-only compatibility view for Gentle Start, Shell Care, and Full Rescue.
- `animal/sea-turtle/view/dorsal-full-body` reuses the existing head-right raster, pivot, size, and vector presentation while adding the multi-area region map below. Keeping a separate view definition prevents the three frozen rescues from gaining new bare-body penalty surfaces. Animal-left appears at negative y and animal-right at positive y. The current 1024 × 682 texture remains centered and displayed at 700 × 466 design units.
- `animal/sea-turtle/view/ventral` is a new head-right underside view for FD-202. It uses the same pivot and silhouette envelope so a view change does not move the interaction frame. Because the animal is rolled to show its underside, animal-left appears at positive y and animal-right at negative y.
- All new cleanable surfaces stay inside x `[-337, 273]` and y `[-241, 241]`, leaving at least 29 design units of vertical and 73 horizontal canvas margin. React-owned HUD and controls remain outside the Pixi interaction surface, so no UI-relative geometry exclusion is needed.
- A region may be visible and cleanable without being eligible for target placement in this rescue. Scraping any configured cleanable surface without contacting a target retains the existing Challenge health rule. Pixels outside the cleanable union, including transparent space, are neutral.

## Region visibility and first-slice eligibility

| Anatomical region | Dorsal view | Ventral view | Eligible target surface in this rescue |
| --- | --- | --- | --- |
| Shell / back | Fully visible | Not visible | Dorsal `shell-back` |
| Head / neck | Neck base visible; facial features visible | Throat and facial underside visible | Dorsal `neck-base`; face excluded in both views |
| Front-left flipper | Fully visible at screen top | Visible at screen bottom | Dorsal `front-left-flipper` only |
| Front-right flipper | Fully visible at screen bottom | Visible at screen top | Dorsal `front-right-flipper` only |
| Rear-left flipper | Visible at screen top | Visible at screen bottom | Dorsal `rear-left-flipper` only |
| Rear-right flipper | Visible at screen bottom | Visible at screen top | Dorsal `rear-right-flipper` only |
| Tail | Not distinct enough in the existing texture | Tail base must be clearly authored | Ventral `tail-base` only |
| Plastron / underside | Not visible | Fully visible | Ventral `plastron` |
| Side surfaces | Only silhouette edges | Only silhouette edges | Excluded; no side view in the first slice |

Ventral flippers and throat remain cleanable for consistent bare-body feedback, but they do not expose spawn regions to the underside stage. This prevents the same physical flipper or neck from receiving a second target after it was already presented in the dorsal stage.

## Cleanable geometry

Geometry values are in design coordinates. Capsule notation is `start → end, radius`; ellipse notation is `center, radiusX × radiusY`, with rotation `0` throughout this map. The player-facing left/right names always refer to the animal, not the screen.

### Dorsal view

| Region suffix | Cleanable geometry | Exclusions |
| --- | --- | --- |
| `shell-back` | ellipse `(-30, 0), 195 × 140` | none |
| `neck-base` | capsule `(125, 0) → (215, 0), 58` | face ellipse `(244, 5), 38 × 32` |
| `front-left-flipper` | capsule `(70, -95) → (130, -185), 56` | none |
| `front-right-flipper` | capsule `(70, 95) → (130, 185), 56` | none |
| `rear-left-flipper` | capsule `(-180, -100) → (-258, -150), 50` | none |
| `rear-right-flipper` | capsule `(-180, 100) → (-258, 150), 50` | none |

The dorsal face ellipse covers the eye, mouth, nostril area, and their safety margin. The indistinct dorsal tail has no cleanable or spawn geometry, so transparent or ambiguous pixels cannot cause a health penalty.

### Ventral view

| Region suffix | Cleanable geometry | Exclusions | Target eligibility |
| --- | --- | --- | --- |
| `plastron` | ellipse `(-20, 0), 225 × 140` | none | eligible |
| `throat` | capsule `(125, 0) → (215, 0), 58` | face ellipse `(244, 5), 38 × 32` | excluded |
| `front-left-flipper` | capsule `(70, 95) → (130, 185), 56` | none | excluded |
| `front-right-flipper` | capsule `(70, -95) → (130, -185), 56` | none | excluded |
| `rear-left-flipper` | capsule `(-180, 100) → (-258, 150), 50` | none | excluded |
| `rear-right-flipper` | capsule `(-180, -100) → (-258, -150), 50` | none | excluded |
| `tail-base` | capsule `(-205, 0) → (-285, 0), 52` | none | eligible |

FD-202 must make the ventral tail base, plastron, throat, and all four flippers visually agree with these bounds. The face exclusion remains non-interactive for placement even if future art changes facial detail.

## Eligible spawn regions

Spawn geometry is deliberately inset from cleanable and silhouette edges. Fallback anchors are ordered and must remain valid for the largest target footprint: 68 visual diameter, 36 minimum hit radius, and 10 units of same-stage spacing.

| View / spawn suffix | Spawn geometry | Capacity | Weight | Fallback anchors |
| --- | --- | ---: | ---: | --- |
| Dorsal `shell-back` | ellipse `(-30, 0), 150 × 95` | 2 | 5 | `(-85, -35)`, `(35, 35)` |
| Dorsal `neck-base` | capsule `(155, 0) → (175, 0), 46` | 1 | 1 | `(165, 0)` |
| Dorsal `front-left-flipper` | capsule `(88, -120) → (116, -164), 46` | 1 | 3 | `(102, -142)` |
| Dorsal `front-right-flipper` | capsule `(88, 120) → (116, 164), 46` | 1 | 3 | `(102, 142)` |
| Dorsal `rear-left-flipper` | capsule `(-198, -116) → (-233, -138), 43` | 1 | 2 | `(-216, -127)` |
| Dorsal `rear-right-flipper` | capsule `(-198, 116) → (-233, 138), 43` | 1 | 2 | `(-216, 127)` |
| Ventral `plastron` | ellipse `(-20, 0), 165 × 100` | 3 | 5 | `(-100, -35)`, `(15, 45)`, `(75, -35)` |
| Ventral `tail-base` | capsule `(-232, 0) → (-255, 0), 42` | 1 | 1 | `(-247, 0)` |

Weights affect selection and extra-target allocation; they are not percentages. Shell/back and plastron are high-capacity anchor regions, front flippers are more common than the smaller rear flippers, and neck/tail remain occasional without becoming unreachable.

## Reference rescue configuration

The new rescue key is `whole-turtle-care`, with player-facing title **Whole Turtle Care** and description **Clean 10 barnacles across the turtle's back and underside.** It uses the existing sea turtle and shallow-ocean environment.

The stages are ordered and required:

1. `back-and-flippers` uses `dorsal-full-body` and the six dorsal spawn regions above.
2. `underside` uses the ventral view and the two ventral spawn regions above.

| Setting | Approved value |
| --- | ---: |
| Total targets | 10 |
| Normal / hard mix | 8 / 2 |
| Diameter range | 52–68 |
| Normal / hard HP | 100 / 200 |
| Minimum / maximum affected regions | 7 / 7 |
| Minimum target spacing | 10 |
| Minimum hit radius | 36 |
| Maximum placement attempts per target | 60 |
| Challenge time | 150 seconds |
| Challenge health | 100 |
| Challenge par score | 1700 |

The eight eligible regions have total capacity 11. Selecting exactly seven regions for ten targets makes shell/back and plastron mandatory because omitting either leaves insufficient capacity. Exactly one of the six capacity-one regions is absent from a run. The resulting stage allocation is therefore always 6–7 dorsal targets and 3–4 ventral targets, without adding stage-specific allocation rules to the shared generator. Every one of the eight eligible regions must appear across the FD-211 validation seed corpus.

The two hard targets are assigned rescue-wide by the existing seeded type shuffle. The first slice does not guarantee one hard target per stage and does not add a new target type.

## Player-facing stage and transition copy

| Moment | Visible copy |
| --- | --- |
| Stage 1 label | `Area 1 of 2 · Back and flippers` |
| Stage 1 instruction | `Scrape the barnacles from the back and flippers.` |
| Stage 1 complete heading | `Back and flippers clear` |
| Stage 1 complete support | `One more area to check underneath.` |
| Primary action | `Next area: Underside` |
| Non-interactive transition status | `Turning the turtle gently…` |
| Stage 2 label | `Area 2 of 2 · Underside` |
| Stage 2 instruction | `Finish the rescue by cleaning the underside.` |
| Stage 2 arrival status | `Underside ready. Keep scraping.` |

The primary action receives focus when stage 1 becomes complete. The transition status is announced once through the React-owned status region; animation alone must not carry the state change. The result retains the existing Rescue Complete copy and appears only after stage 2's final target and celebration.

## Edge rules

- Preparation fails before play if the seed cannot produce exactly 10 targets, exactly two hard targets, seven affected regions, a 6–7 / 3–4 stage split, or valid geometry and spacing.
- A missing ventral raster asset uses the complete FD-202 vector fallback with the same pivot and geometry. It must not silently reuse the dorsal art for underside interaction.
- The stage-1 completed view remains visible while the next-area action is available. Targets never move between views, and a region excluded from a stage cannot receive a target there.
- Replay or retry keeps the seed and reproduces the omitted region, allocation, types, sizes, and coordinates. Starting from selection creates a new seed under the shared multi-area behavior contract.
- Challenge and Zen use identical view, region, target, HP, and size configuration. Only the existing mode pressure differs.

## Acceptance criteria

- Given the reference rescue is prepared from any accepted seed, when its layout is validated, then it contains 10 targets, two hard targets, exactly seven affected regions, 6–7 dorsal targets, and 3–4 ventral targets.
- Given any generated target, when its maximum hit footprint is checked, then it is fully inside its spawn and cleanable geometry, outside the facial exclusion, separated from same-stage targets by at least 10 design units, and reachable with a 36-unit hit radius.
- Given a validation corpus of deterministic seeds, when region coverage is measured, then all eight eligible spawn regions appear at least once and neither side of a paired flipper is starved by weighting.
- Given the dorsal stage is active, when the player sees or scrapes the turtle, then targets can appear on shell/back, neck base, and each independently named flipper, but not on facial features or the indistinct dorsal tail.
- Given the underside stage is active, when the player sees or scrapes the turtle, then targets can appear only on plastron and tail base; visible throat and flippers remain cleanable but target-free.
- Given stage 1 is completed, when transition UI appears, then the approved next-area copy is visible, the action receives focus, and no completion result or final celebration appears.
- Given the view transition is active, when the ventral art or fallback becomes interactive, then it preserves the configured 820 × 540 pivot, announces the approved status, and exposes only ventral geometry.
- Given the final underside target is removed, when celebration finishes, then the existing Rescue Complete result appears once with whole-rescue progress at 100%.
