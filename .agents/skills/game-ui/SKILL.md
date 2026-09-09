---
name: game-ui
description: Build or refine Barnacle Rescue's React menus, mode and level selection, HUD, responsive layout, and result flow.
---

# Game UI

Read `docs/game/MVP_SPEC.md`, `docs/game/ARCHITECTURE.md`, and `docs/game/ART_DIRECTION.md`.

React owns navigation, accessible controls, HUD, and overlays; PixiJS owns interactive game mechanics. Keep the presentation cozy, marine, soft, readable, and game-like rather than dashboard-like. Challenge exposes timer/score/health/progress; Zen removes pressure UI while sharing gameplay.

Implement the smallest requested screen or flow and verify relevant responsive, keyboard, mode, and browser behavior with configured checks. User instructions override this workflow.
