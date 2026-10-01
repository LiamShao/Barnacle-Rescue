# Barnacle Rescue MVP Specification

## Lifecycle status

The MVP baseline is frozen at M1–M9 as of 2026-09-15. M10 final QA/deployment was explicitly skipped by product direction and must not be reported as complete or verified. This document remains the product foundation for existing behavior. See [current baseline](FORMAL_DEVELOPMENT.md), [active roadmap](FORMAL_ROADMAP.md), and [documentation index](README.md). The multi-area extension is now playable in Zen only; its shared rules are defined in `MULTI_AREA_RESCUE_SPEC.md`, while multi-area Challenge remains pending.

## Product concept and target experience

Barnacle Rescue is a relaxing 2D desktop-first web game, with touch-compatible input architecture, about cleaning harmful barnacles from a rescued sea turtle. The player should see the turtle move from discomfort to relief and finish each rescue feeling calm, helpful, and rewarded.

The primary quality bar is a satisfying loop: scrape a barnacle, see it crack and detach, and receive an immediate positive turtle reaction. Prove that loop before expanding the game.

## Gameplay loop

1. The player drags the scraper across a barnacle.
2. Scraper movement intersecting the barnacle applies cleaning damage.
3. Damage advances visible cracking and breaking states.
4. At zero HP, the barnacle detaches exactly once.
5. Cleaning progress increases and the turtle gives a relief reaction.
6. The final removal triggers happiness, celebration, and Rescue Complete.

A stationary pointer and a simple click do not count as scraping.

Three configured levels contain 3, 5, and 7 barnacles, including 0, 1, and 2 hard targets. Hard barnacles have twice the HP and a gray, double-rimmed appearance. Cleaning progress counts fully detached targets, not partial HP damage. Targets crack and detach independently; the result appears after all targets detach and celebration finishes. The app opens at the main menu; Start rescue opens selection with all three rescues available. “Rescue again” resets the current level; “Next rescue” starts the next level and is absent on the final level. “Choose rescue” returns to selection and discards the current run. M9 persists completion summaries while keeping all three MVP rescues available.

Animal feedback is shared across all levels: progress determines persistent mood, each non-final detachment triggers a 1.2-second relief reaction, and the final detachment triggers a two-second celebration before the result. A short status caption accompanies facial and body animation. Replay resets mood and reactions. The selection screen offers Challenge and Zen, restoring the saved mode when valid and otherwise defaulting to Challenge. Replay, next rescue and return to selection retain the chosen mode; switching mode happens on the selection screen and starts a fresh run.

## Modes

### Challenge

Show a countdown timer, score, cleaning progress, and animal health. Earned score is `100 × removed + comboBonus - 5 × healthLost`, clamped to zero. Successful results add `10 × floor(remainingSeconds)` before clamping. Time expiry or depleted health fails the level. The implemented combo rules are defined below.

On success, grade by score as a share of a level's configured par score: S at 120% or more, A at 100–119%, B at 80–99%, otherwise C. Failed runs receive no success grade. Tune par scores through level data after playtesting rather than changing the formula per level.

M5 rules: timing starts when the scene is ready and uses elapsed monotonic time, including time spent in a background tab. Timeout takes priority if the deadline has passed before an input/removal update. Success is locked after the last target fully detaches; the two-second celebration does not consume time. Any terminal result freezes gameplay and scoring. Replay/next level start fresh; leaving a run discards it.

Dragging on bare shell accumulates movement in design-space pixels: each 80 pixels costs 10 health. Only accepted scrape movements (3–36 screen pixels per sample) count. Clicks, stationary input and movement outside the cleanable shell cost nothing. Intersecting a non-removed target, including one detaching, clears accumulated unsafe movement. Lift to travel between targets; lifting alone does not clear accumulated unsafe distance. Health loss triggers the existing hurt reaction and breaks the combo.

Consecutive removals within five seconds build a combo: the first earns no bonus, then +10, +20, and at most +30 per subsequent removal. More than five seconds or health loss breaks the chain; earned bonus remains. The HUD shows earned points (removals + combo − health penalty), clamped to zero. Only successful results add `10 × floor(remainingSeconds)` as a time bonus. Failure has no time bonus, no grade and no next-level action. Initial par scores are 750 / 950 / 1100; these and the health/combo tuning still require playtesting.

To allow the player to finish a successful gesture, a freshly detached target's hit area remains safe for 0.6 seconds in Challenge. After that, scraping the cleared patch counts as bare-shell movement.

### Zen

Use the same levels and cleaning systems without countdown pressure, failure, aggressive scoring, or combo pressure. Hide those HUD elements and emphasize ambience, subtle motion, and reactions.

M6 implements Zen using the same target configuration, damage, detachment, mood and celebration code as Challenge. It does not advance Challenge time, accumulate bare-shell damage, or record combos/scores. The HUD shows cleaning progress and animal status; result screens omit scores, bonuses and grades. Level cards hide time/health values. Idle motion and gentle relief/celebration provide the base ambience; M8 adds procedural audio feedback. M9 restores the last selected mode across reloads.

Formal-development slice 1A adds a fourth selection in Zen, **Whole Turtle Care**. Its 10 seeded targets span required “Back and flippers” and “Underside” stages. Completing the first area reveals a focused Next area action without celebration or completion saving; overall progress counts removals across both areas. A brief input-locked transition enters the underside, with matching vector fallback if its asset is missing. Final removal alone celebrates and saves success. Replay keeps the case seed; returning to selection abandons the run and selecting again creates a new seed. The original three-rescue next chain is unchanged; multi-area Challenge is not selectable yet.

M8 adds restrained procedural feedback without changing the shared cleaning rules: accepted target scrapes briefly wobble the target and play a quiet, rate-limited scrape cue; the first crack emits a ring and crack cue; detachment emits short-lived fragments and a detach cue; and final completion adds sparkles and a two-note celebration cue. A session-level sound control is available from every screen and defaults off until the player opts in. Browser autoplay policy is respected by creating or resuming audio only after a gameplay pointer gesture. Reduced-motion preference lowers particle counts and disables target wobble; final asset-backed audio and manual volume tuning remain future polish.

Local save version 2 stores sound enabled, the last selected mode, Zen completion, and the best Challenge score/grade by stable rescue ID. Valid version-1 numeric-level saves migrate through the explicit three-level identity map. Level cards show saved summaries, but all three MVP levels remain available. Failed or abandoned runs do not change records. Missing, malformed, unsupported-version, duplicate, unknown-ID, or out-of-range data falls back to safe defaults; unavailable or full browser storage never blocks gameplay. Active runs are intentionally not resumed.

## MVP scope

- One sea turtle and one shallow-ocean rescue environment
- One scraper controlled by pointer drag, with touch-compatible event handling
- Normal and hard barnacles with visible damage states
- Three configuration-driven levels
- Challenge and Zen modes
- Turtle moods, temporary reactions, and final celebration
- React menu, mode select, level select, HUD, and result flow
- Local-only persistence for settings and progress
- Unit tests plus relevant browser tests

## Main flow

Main Menu → combined Mode / Rescue Select → Game → Result → Replay / Next Rescue / Selection / Main Menu

M7 opens at a main menu with “Start rescue” and an expandable “How to play” guide. Mode and level selection share one screen. Selection, gameplay and results offer “Main menu”; leaving gameplay destroys and discards the current run. The selected mode survives navigation within the page. Returning through Start rescue creates a fresh run when a level is chosen. Focus moves to the primary action on menu/result entry. Cleaning progress exposes an accessible progressbar; Challenge metrics remain outside the canvas. Result content can scroll on small screens, and UI celebration/transition animation respects reduced-motion preferences (Pixi animal animation is unchanged).

## Non-goals

Backend services, authentication, multiplayer, shops, currency, inventory, additional animals/environments/tools, complex skeletal animation, and abstractions without an immediate MVP use.

## Success criteria

The original one-target vertical slice has been implemented and extended into the three-rescue baseline described above. Preserve that complete loop during formal development: readable damage, unique removal, progress and reaction updates, terminal-state locking, usable navigation, and safe persistence. Current regression and future multi-area acceptance are maintained in [ACCEPTANCE_CRITERIA.md](ACCEPTANCE_CRITERIA.md); touch compatibility is not a claim of completed real-device acceptance.
