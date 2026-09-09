---
name: level-design
description: Create, tune, or review Barnacle Rescue's three configuration-driven levels and their placement and difficulty curve.
---

# Level Design

Read `docs/game/LEVEL_DESIGN.md`, `docs/game/MVP_SPEC.md`, and affected acceptance criteria.

Keep counts, type mix, HP, size, timer, health, and placement data in `LevelConfig`; all levels must share gameplay systems. Enforce readable, reachable, non-overlapping placements on cleanable turtle regions. Tune difficulty through existing parameters rather than level-specific mechanics.

When implementing, test configuration validity and run configured project checks. State whether tuning is code-verified or playtested. User instructions override this workflow.
