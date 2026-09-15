# Barnacle Rescue MVP Specification

## Lifecycle status

The MVP baseline is frozen at M1–M9 as of 2026-09-15. M10 final QA/deployment was explicitly skipped by product direction and must not be reported as complete or verified. Formal development continues from the observable behavior in this document; post-MVP scope and delivery slices are tracked in `FORMAL_DEVELOPMENT.md`.

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

Animal feedback is shared across all levels: progress determines persistent mood, each non-final detachment triggers a 1.2-second relief reaction, and the final detachment triggers a two-second celebration before the result. A short status caption accompanies facial and body animation. Replay resets mood and reactions. The selection screen offers Challenge and Zen, defaulting to Challenge on page load. Replay, next rescue and return to selection retain the chosen mode; switching mode happens on the selection screen and starts a fresh run.

## Modes

### Challenge

Show a countdown timer, score, cleaning progress, and animal health. Use the initial tunable formula `100 × removed + 10 × remainingSeconds + comboBonus - 5 × healthLost`, clamped to zero. Begin with a modest movement-based combo bonus; omit it from M1 if it distracts from scraping quality. Time expiry or depleted health may fail the level.

On success, grade by score as a share of a level's configured par score: S at 120% or more, A at 100–119%, B at 80–99%, otherwise C. Failed runs receive no success grade. Tune par scores through level data after playtesting rather than changing the formula per level.

M5 rules: timing starts when the scene is ready and uses elapsed monotonic time, including time spent in a background tab. Timeout takes priority if the deadline has passed before an input/removal update. Success is locked after the last target fully detaches; the two-second celebration does not consume time. Any terminal result freezes gameplay and scoring. Replay/next level start fresh; leaving a run discards it.

Dragging on bare shell accumulates movement in design-space pixels: each 80 pixels costs 10 health. Only accepted scrape movements (3–36 screen pixels per sample) count. Clicks, stationary input and movement outside the cleanable shell cost nothing. Intersecting a non-removed target, including one detaching, clears accumulated unsafe movement. Lift to travel between targets; lifting alone does not clear accumulated unsafe distance. Health loss triggers the existing hurt reaction and breaks the combo.

Consecutive removals within five seconds build a combo: the first earns no bonus, then +10, +20, and at most +30 per subsequent removal. More than five seconds or health loss breaks the chain; earned bonus remains. The HUD shows earned points (removals + combo − health penalty), clamped to zero. Only successful results add `10 × floor(remainingSeconds)` as a time bonus. Failure has no time bonus, no grade and no next-level action. Initial par scores are 750 / 950 / 1100; these and the health/combo tuning still require playtesting.

To allow the player to finish a successful gesture, a freshly detached target's hit area remains safe for 0.6 seconds in Challenge. After that, scraping the cleared patch counts as bare-shell movement.

### Zen

Use the same levels and cleaning systems without countdown pressure, failure, aggressive scoring, or combo pressure. Hide those HUD elements and emphasize ambience, subtle motion, and reactions.

M6 implements Zen using the same target configuration, damage, detachment, mood and celebration code as Challenge. It does not advance Challenge time, accumulate bare-shell damage, or record combos/scores. The HUD shows cleaning progress and animal status; result screens omit scores, bonuses and grades. Level cards hide time/health values. Idle motion and gentle relief/celebration provide the base ambience; M8 adds procedural audio feedback. M9 restores the last selected mode across reloads.

M8 adds restrained procedural feedback without changing the shared cleaning rules: accepted target scrapes briefly wobble the target and play a quiet, rate-limited scrape cue; the first crack emits a ring and crack cue; detachment emits short-lived fragments and a detach cue; and final completion adds sparkles and a two-note celebration cue. A session-level sound control is available from every screen and defaults off until the player opts in. Browser autoplay policy is respected by creating or resuming audio only after a gameplay pointer gesture. Reduced-motion preference lowers particle counts and disables target wobble; final asset-backed audio and manual volume tuning remain future polish.

M9 stores one versioned local save containing sound enabled, the last selected mode, Zen completion by level, and the best Challenge score and grade by level. Level cards show the saved summaries, but all three MVP levels remain available. Failed or abandoned runs do not change completion records. Missing, malformed, unsupported-version, duplicate, or out-of-range data falls back to safe defaults; unavailable or full browser storage never blocks gameplay. Active runs are intentionally not resumed.

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

Main Menu → Mode Select → Level Select → Game → Result → Replay / Next Level

M7 opens at a main menu with “Start rescue” and an expandable “How to play” guide. Mode and level selection share one screen. Selection, gameplay and results offer “Main menu”; leaving gameplay destroys and discards the current run. The selected mode survives navigation within the page. Returning through Start rescue creates a fresh run when a level is chosen. Focus moves to the primary action on menu/result entry. Cleaning progress exposes an accessible progressbar; Challenge metrics remain outside the canvas. Result content can scroll on small screens, and UI celebration/transition animation respects reduced-motion preferences (Pixi animal animation is unchanged).

## Non-goals

Backend services, authentication, multiplayer, shops, currency, inventory, additional animals/environments/tools, complex skeletal animation, and abstractions without an immediate MVP use.

## Success criteria

The app runs without critical runtime errors; one turtle, scraper, and barnacle form a playable drag-to-scrape slice; damage is visible; removal updates progress and reaction state; the last barnacle completes the rescue; input design can support mouse and touch; and relevant typecheck/tests pass. Menus, content breadth, scoring depth, audio, and final art follow this vertical slice.
