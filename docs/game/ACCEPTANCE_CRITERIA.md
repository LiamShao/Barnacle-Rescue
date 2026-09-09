# MVP Acceptance Criteria

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

- Given a configured normal or hard barnacle, when scraped, then its own HP/tuning drives the same intact → cracked → breaking → removed lifecycle.
- Given any of the three level configurations, when a run starts, then count, type mix, HP, size, timer, health, and valid placements come from configuration rather than component branches.
- Given removal changes progress across a mood threshold, when the temporary relief ends, then the turtle returns to the newly derived mood.
- Given all targets are removed, then completion and progress are recorded only once.
- Given Challenge mode, when play proceeds, then timer, score, progress, and health are visible; expiry/depleted health can fail; successful completion produces a deterministic grade.
- Given Zen mode, when the same level is played, then scraping behavior is unchanged while timer, failure pressure, aggressive score, and combo pressure are absent.
- Given a result, when Replay or Next Level is selected, then a fresh valid run starts with no stale timers/reactions.
- Given valid local progress/settings exist, when the app reloads, then they restore; given invalid or old data, then safe defaults load without crashing.
- Given desktop and representative touch viewport sizes, when playing and navigating, then controls remain reachable and the gameplay area does not sit under the HUD.

## Verification policy

Keep barnacle damage/state, mood derivation, scoring, level completion, and persistence validation deterministic and unit tested. Use Playwright for app flow, visible state transitions, mode differences, and pointer interaction where reliable. Document a manual drag/touch check when browser automation cannot establish interaction feel. Never mark an item verified unless its check was executed.

## Explicitly deferred

Additional animals/environments/tools, backend, authentication, multiplayer, economy/shop/inventory, and skeletal animation are not required for MVP acceptance.
