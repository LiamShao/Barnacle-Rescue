---
name: gameplay-core
description: Implement or improve Barnacle Rescue pointer scraping, collision, barnacle damage states, removal, progress, and core gameplay events.
---

# Gameplay Core

Read `docs/game/MVP_SPEC.md`, `docs/game/ARCHITECTURE.md`, and relevant criteria in `docs/game/ACCEPTANCE_CRITERIA.md`.

Keep Pointer Events, scraper movement, hit detection, movement-based damage, barnacle HP/state, removal, progress, and domain events responsive and independently testable. Scraping must require a gesture rather than a click or stationary pointer. Make removal/completion idempotent, keep frame-level state out of React, and preserve touch compatibility.

Implement the smallest requested mechanic, then run configured typecheck, lint, focused unit tests, and relevant browser tests. Report checks and any manual interaction validation still needed. User instructions override this workflow.
