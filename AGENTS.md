# Barnacle Rescue repository guidance

- Treat `docs/game/MVP_SPEC.md` as the product source of truth and keep related game docs synchronized with observable behavior.
- Build and verify the smallest end-to-end vertical slice before adding breadth. The scraping interaction has highest priority.
- Keep levels configuration-driven. Keep persistent animal mood separate from temporary reactions.
- React owns application UI and navigation; PixiJS owns interactive game rendering and mechanics.
- The MVP has no backend, accounts, multiplayer, shop, currency, or inventory.
- Preserve repository conventions and run configured typecheck, lint, unit, and relevant E2E checks after implementation.
- User instructions override these workflow defaults.
