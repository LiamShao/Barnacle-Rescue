# MVP Acceptance Criteria

## Lifecycle status

The accepted development baseline contains M1–M9. M10 final QA/deployment was skipped by explicit product direction on 2026-09-15, so the project has entered formal development without a final QA or deployment sign-off. The verification policy below remains regression coverage for all subsequent work.

## M1: first playable vertical slice

- Given the development app starts, when the game route loads, then a sea turtle, one barnacle, and a scraper are visible without critical runtime errors.
- Given mouse or touch input begins on the game viewport, when the pointer moves, then the scraper follows the active pointer and safely handles release/cancel.
- Given the scraper blade moves continuously through the barnacle hit area, then HP decreases according to configured movement-based damage.
- Given the pointer clicks or remains stationary over the barnacle, then it does not remove the barnacle as if scraped.
- Given HP crosses its cracking threshold, then the barnacle visibly changes from intact to cracked.
- Given HP reaches zero, then breaking/detachment occurs once, progress reaches 100%, and the turtle reacts positively.
- Given the only barnacle is removed, then celebration plays and Rescue Complete appears.
- Given the slice implementation is complete, then configured typecheck and relevant unit/browser tests pass.

## Complete MVP behavior

Current implemented scope: M1–M9 core scraping, independent normal/hard targets, animal mood/reactions, three configured levels, Challenge, Zen, the main-menu/navigation flow, procedural gameplay feedback/audio, and local settings/completion persistence. Choose a mode and any level, replay it, advance after success, or return to selection/home. Challenge shows countdown, health, earned score and combo; expiry/zero health fail without a grade. Successful completion adds the time bonus and grades against configured par score. Zen shares cleaning and reactions without timing, health loss, failure, scoring or grading. Asset-backed audio/final feedback tuning remain formal-development work; final QA/deployment were skipped rather than completed.

- Given a configured normal or hard barnacle, when scraped, then its own HP/tuning drives the same intact → cracked → breaking → removed lifecycle.
- Given any of the three level configurations, when a run starts, then count, type mix, HP, size, timer, health, and valid placements come from configuration rather than component branches.
- Given removal changes progress across a mood threshold, when the temporary relief ends, then the turtle returns to the newly derived mood.
- Given all targets are removed, then completion and progress are recorded only once.
- Given Challenge mode, when play proceeds, then timer, score, progress, and health are visible; expiry/depleted health can fail; successful completion produces a deterministic grade.
- Given Zen mode, when the same level is played, then scraping behavior is unchanged while timer, failure pressure, aggressive score, and combo pressure are absent.
- Given a result, when Replay or Next Level is selected, then a fresh valid run starts with no stale timers/reactions.
- Given valid local progress/settings exist, when the app reloads, then they restore; given invalid or old data, then safe defaults load without crashing.
- Given desktop and representative touch viewport sizes, when playing and navigating, then controls remain reachable and the gameplay area does not sit under the HUD.
- Given accepted scraping, cracking, detachment, and final completion events, then restrained visual/audio feedback fires with those events without changing damage, input, or completion rules.
- Given sound is disabled, when navigating or continuing the current run, then cues remain muted and gameplay progress is not reset.
- Given reduced motion is preferred, when gameplay feedback fires, then particle counts are reduced and target wobble is omitted.

## Verification policy

M9 deterministic tests validate defaults, valid round trips, malformed/old/out-of-range data, unavailable storage, Zen completion and Challenge best-result retention. Browser coverage completes a rescue, reloads, and verifies restored sound/mode settings and the visible completion summary; invalid and old payloads restore defaults without preventing navigation. Active run state is not persisted.

M8 browser coverage verifies that the sound control retains its session state across screens and can change during a run without remounting the canvas or resetting progress. Existing removal/replay coverage guards against feedback changing completion behavior or leaking a second canvas across runs. Particle timing, synthesized cue quality, actual mute audibility, reduced-motion feel and device autoplay behavior still require manual inspection because canvas pixels and audio output are not asserted by the browser suite.

M7 browser coverage verifies initial main-menu focus, expandable instructions, absence of a game scene while in menus, accessible cleaning progress, return from an active run and successful result, retained mode and fresh progress after returning. Desktop and 320px layouts are covered. Earlier milestone descriptions refer to historical entry flows; the current entry is Main Menu → combined Mode/Level Select → Game → Result.

M6 browser coverage exercises keyboard mode selection, Zen after simulated elapsed time beyond the Challenge limit and sustained bare-shell scraping, all three Zen levels, score-free results, replay, mode retention, and transitions from Zen to Challenge and failed Challenge back to Zen at desktop and 320px widths. Existing Challenge tests remain regression coverage. Real touch feel and ambience still need manual playtesting.

M5 checks cover elapsed-time expiry and terminal-state locking, unsafe movement accumulation and target-hit reset, health failure, unique removal counting, combo expiry/cap/interruption, score clamping, time bonus and grade thresholds. Browser checks exercise both failure paths, replay after timeout, success grading and the existing multi-level flows.

M4 coverage validates configuration counts, durability, placement containment and separation, and fresh run state. Browser tests exercise selection, all three levels in sequence, next-level boundaries, final-level replay and mid-run navigation at 1280px and 320px widths. Screenshots support layout inspection; automated completion does not establish difficulty balance or real touch feel.

M3 adds deterministic mood threshold, relief restart/expiry, hurt priority, and celebration-lock checks. Browser coverage checks initial mood, return to neutral/relaxed after relief, celebration before the result, and mood reset on replay at desktop and narrow widths. Real mouse/touch playtesting is still needed to assess animation feel and legibility; narrow-width mouse automation does not certify touch interaction.

Keep barnacle damage/state, mood derivation, scoring, level completion, and persistence validation deterministic and unit tested. Use Playwright for app flow, visible state transitions, mode differences, and pointer interaction where reliable. Document a manual drag/touch check when browser automation cannot establish interaction feel. Never mark an item verified unless its check was executed.

## Explicitly deferred

Additional animals/environments/tools, backend, authentication, multiplayer, economy/shop/inventory, and skeletal animation are not required for MVP acceptance.
