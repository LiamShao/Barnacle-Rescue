---
name: animal-reaction
description: Implement or tune the sea turtle's persistent moods, temporary reactions, idle motion, relief, hurt, and rescue celebration.
---

# Animal Reaction

Read `docs/game/ANIMAL_STATE_MACHINE.md` and `docs/game/ART_DIRECTION.md`.

Keep progress-derived mood separate from temporary reaction. Ensure reactions return to the current mood, stale timers cannot mutate a new run, and celebration cannot be displaced by ordinary reactions. Communicate emotion through lightweight face and body motion; avoid skeletal-animation systems before MVP unless explicitly justified.

Verify deterministic transition logic separately from rendering and exercise the visible sequence when practical. User instructions override this workflow.
