---
name: game-qa
description: Verify Barnacle Rescue gameplay, mode behavior, persistence, responsive interaction, and MVP acceptance without overstating test coverage.
---

# Game QA

Read `docs/game/ACCEPTANCE_CRITERIA.md` and inspect configured scripts before testing. Run the available TypeScript check, lint, focused unit tests, relevant Playwright tests, and build as appropriate to the requested scope.

Prioritize deterministic tests for scraping damage/state, mood transitions, scoring, completion idempotence, level configuration, and persistence validation. Browser-test player-visible flow and mode differences. If automated pointer drag cannot establish interaction quality, record the exact manual mouse/touch check still required.

Report commands and outcomes, failures with reproduction evidence, untested criteria, and remaining risk. Never claim a check ran when it did not. User instructions override this workflow.
