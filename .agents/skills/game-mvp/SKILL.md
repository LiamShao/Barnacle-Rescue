---
name: game-mvp
description: Orchestrate incremental Barnacle Rescue MVP work or assess MVP progress, prioritizing the smallest playable vertical slice.
---

# Game MVP

Read `docs/game/MVP_SPEC.md` and `docs/game/ACCEPTANCE_CRITERIA.md`, inspect the repository state, and select the smallest incomplete vertical slice. Implement and verify only that slice unless the user requests broader work.

Keep work aligned with the milestone order in `docs/game/ARCHITECTURE.md`. Update affected documentation when behavior or architecture changes. After implementation run configured typecheck, lint, relevant unit tests, and relevant E2E tests.

Report completed behavior, checks actually run, known limitations, remaining MVP gaps, and the next smallest valuable step. User instructions override this workflow.
