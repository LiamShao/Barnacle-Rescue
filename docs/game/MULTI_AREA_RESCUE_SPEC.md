# Multi-Area Rescue Behavior Specification

## Status and scope

This document approves the shared player-visible behavior for `FD-101`. It is the behavior source of truth for multi-area rescue flow and the compatibility work in FD1–FD2; `TURTLE_BODY_REGION_MAP.md` supplies the concrete views, regions, tuning, and copy for the first rescue. Neither specification changes the frozen M1–M9 rescues by itself or authorizes new mechanics, optional-stage UI, free area selection, or active-run persistence.

## Player-visible model

A **Rescue** is one continuous care session selected from the rescue screen. It has one animal, one environment, one mode, one generated case seed, and one or more ordered stages. Challenge time, health, score, combo, overall progress, and animal mood belong to the whole rescue rather than resetting between areas.

A **Stage** is one required step in that rescue, presented to the player as a named care area such as “Shell” or “Left flipper.” A stage is complete after every target assigned to it is removed. Completing a non-final stage reveals the next-area action; it does not celebrate, show results, or record completion.

A **BodyView** is an authored visual perspective of the animal, such as dorsal or underside. It determines what the player sees and where interaction is rendered. A stage uses one body view, and more than one stage may reuse a view. A body view is presentation, not a progress unit, and changing it never resets rescue state.

A **CleanableRegion** is a named safe body surface within a body view. It defines where targets may be placed and where bare-body scraping may count as unsafe in Challenge. Regions are authored independently of texture pixels and can contain exclusions such as eyes, mouth, wounds, silhouette edges, or UI-obscured space. Region names may support status and accessibility copy, but players select stages rather than individual regions.

## Area order and completion

- Stages follow a configured, guided linear order. The player cleans the current stage and then uses a clear “Next area” action; there is no free area picker and no backward area navigation in the first slice.
- Every stage in the generated run is required. Optional stages and a “Skip area” action are outside the first slice. If optional content is added later, inclusion must be decided before the run starts so the progress denominator cannot change mid-run.
- Current-area progress counts removed targets in the active stage. Overall rescue progress is `removed targets across all stages / total targets across all stages`; stages are not equally weighted.
- Persistent animal mood derives from overall rescue progress. Non-final removals keep the existing relief behavior. A non-final stage completion may add status copy but must not trigger the final celebration.
- The final required target in the final required stage locks success exactly once. Celebration then runs before Rescue Complete, as in the current single-stage flow.
- A stage with no target is invalid configuration and must be rejected before the rescue becomes playable rather than silently auto-completing.

## Stage transition behavior

After the final target in a non-final stage detaches, that stage becomes complete exactly once, scraping input stops, and “Next area” becomes the primary focused action. The completed view remains visible while the player chooses to continue.

In Challenge, the rescue clock continues while the next-area action is available. Activating it starts a non-interactive view transition: gameplay input is blocked and the countdown pauses until the next view is ready for interaction. Score and health do not change during that transition. The five-second combo window still uses monotonic elapsed time and is not extended by the countdown pause, so a sufficiently long transition can end the chain without removing bonus already earned.

In Zen, the same stage and transition rules apply without time, health, score, failure, or combo pressure. Both modes preserve removed targets, overall progress, mood, and all whole-rescue state when the next view begins. Late input, feedback, or asset loading from the prior view must not alter the new view.

If a Challenge deadline or health failure is reached while the completed-stage action is waiting, failure takes priority and the whole run ends. A paused non-interactive transition cannot itself cause timeout. Final success remains locked on the final detachment, so its celebration does not consume Challenge time.

## Replay, retry, and abandonment

- Starting a rescue from selection creates a fresh seed and a fresh run. “Next rescue” also creates a fresh seed for the newly selected rescue.
- “Rescue again” after success and retry after failure rebuild every stage from the same seed. This presents the same case layout with fresh HP, targets, timer, health, score, mood, and reactions, allowing a fair Challenge retry.
- Returning to rescue selection or the main menu abandons the complete run, including every completed stage. No partial completion, score, or active seed is saved.
- Reloading or closing the page also abandons the run. Active seeds and layouts are not persisted. Selecting a rescue afterward creates a fresh seed.
- Completion persistence is written only after the final required stage succeeds. Failure, abandonment, or a completed intermediate stage never changes saved completion summaries.

## State transitions

```text
playing stage N
├── non-final stage cleared → awaiting next area → transitioning → playing stage N+1
├── final stage cleared     → celebrating → rescue result
├── Challenge failure       → failed result
└── leave or reload         → discarded

successful/failed result → replay or retry with same seed → playing stage 1
selection                 → start with fresh seed          → playing stage 1
```

Removal, stage completion, transition activation, rescue completion, and persistence writes must each be idempotent.

## Acceptance criteria

- Given a rescue has two required stages, when every target in the first stage is removed, then that stage is marked complete once, overall progress remains below 100%, and no final celebration or result appears.
- Given a non-final stage is complete, when the next-area action appears, then it identifies the next area, receives primary focus, and repeated activation cannot start multiple transitions.
- Given the player has not activated the next-area action in Challenge, when time expires or health is depleted, then the rescue fails without recording completion.
- Given an active view transition in Challenge, when wall time passes before the next view is interactive, then the countdown does not decrease, health and score do not change, and the combo deadline receives no extra grace.
- Given the next stage becomes interactive, when its view is shown, then prior removals, overall progress, animal mood, Challenge state, and the rescue seed are preserved while temporary input and feedback from the prior view are inactive.
- Given any required stage remains incomplete, when progress is presented, then overall progress counts removed targets across the full rescue and cannot reach 100%.
- Given the final required target in the final required stage detaches, when completion feedback runs, then success locks once, the countdown no longer advances, celebration occurs once, and only then does the result appear.
- Given a completed or failed generated rescue, when the player chooses replay or retry, then all runtime state resets and the same seed produces the same case layout.
- Given the player abandons a run and later starts that rescue from selection, then the abandoned stages are not restored and a fresh seed creates a new case.
- Given a stage definition has no target or a generated layout is invalid, when the rescue is prepared, then play does not begin with a silently completed or unreachable area and a usable error or fallback path is provided.

## Concrete first rescue

FD-201 fixes the first slice in `TURTLE_BODY_REGION_MAP.md`: **Whole Turtle Care** has an ordered dorsal “Back and flippers” stage followed by a ventral “Underside” stage, with 10 seeded targets across exactly seven eligible body regions. That content specification and its approved transition copy refine this shared behavior without changing its timing, persistence, or completion rules.

## Deferred decisions

Free area selection, backward area review, optional/skippable stages, seed sharing, a player-visible case code, active-run resume, and persistence of generated layouts require later product decisions. Additional animals, views beyond dorsal and ventral, and new target mechanics also remain outside the first slice.
