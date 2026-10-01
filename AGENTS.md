# Barnacle Rescue repository guidance

## Documentation and current scope

- Start with `docs/game/README.md` for document ownership, `FORMAL_DEVELOPMENT.md` for the current code baseline, and `FORMAL_ROADMAP.md` for active priorities. Paths in this section are relative to `docs/game/` unless fully qualified.
- Keep `MVP_SPEC.md` as the product foundation for the existing three rescues and shared scraping/mode rules. Approved multi-area behavior belongs to `MULTI_AREA_RESCUE_SPEC.md`; the first rescue's views, geometry, tuning, and copy belong to `TURTLE_BODY_REGION_MAP.md`.
- Distinguish player-visible behavior, implemented but unintegrated capabilities, and planned work. Inspect code before reporting completion; specifications and passing domain tests alone do not prove a playable flow.
- Use `docs/game/archive/` only for historical context, not current execution order. M10 final QA/deployment remains historically skipped; formal release readiness requires its own verification.
- Update the owning specification when rules change, the baseline and acceptance criteria when observable behavior changes, and the roadmap plus actual verification records when a slice completes. Avoid duplicating detailed rules across documents.

## Development priorities

- Build and verify the smallest end-to-end playable slice before adding breadth; scraping quality remains the foundation.
- Follow the active roadmap rather than restarting completed milestones. Zen multi-area flow now consumes FD-201–203 through the scene/UI; Whole Turtle Care is Zen-only until multi-stage Challenge is verified.
- Continue from the latest roadmap and verification records: preserve the recovered browser baseline and Zen slice, then deliver Challenge carryover and automated/real-device acceptance before environment or animal expansion.
- Reuse the existing content contracts, geometry, stable identifiers, catalog validation, seeded generator, and `RescueRun` domain. Do not rebuild completed foundations or expose an incomplete mode as a finished rescue.

## Architecture and product constraints

- Keep rescues, stages, views, cleanable/spawn regions, tuning, and supported animal/environment pairings configuration-driven. Gameplay geometry is authored independently of texture alpha.
- React owns application UI, navigation, accessibility, and low-frequency summaries; PixiJS owns interactive rendering, pointer input, animation, and transient feedback. Keep deterministic gameplay rules in the domain/state layer and avoid duplicate HP/progress ledgers during `RescueRun` integration.
- Keep persistent animal mood separate from temporary reactions. Multi-stage mood derives from overall target-weighted progress; only the final required stage can trigger final celebration and rescue completion.
- Preserve seeded layout reproducibility: selection/next rescue starts a fresh seed, while generated-case replay/retry retains the seed and resets runtime state. Active runs, seeds, and layouts are not persisted.
- Preserve valid local-save migration and the three existing rescues. Keep current rescue identities separate from legacy numeric migration mappings when adding content; record completion only after whole-rescue success.
- Guard scene/view teardown, pointer state, and asynchronous asset callbacks against stale updates. Every required view needs a usable matching fallback.
- Keep the game local-only and single-player. Backend, accounts, multiplayer, shop, currency, inventory, and other scope expansions require an explicit product decision.
- Use the installed stack and repository conventions; do not introduce a state/audio library solely because historical docs suggested it.

## Verification and reporting

- After implementation, run configured typecheck, lint, unit tests, build, and relevant E2E checks. Cross-boundary gameplay/navigation/persistence changes require the complete browser regression suite; `pnpm test:e2e --workers=1` is available for a serial graphics baseline.
- Test deterministic rules and edge cases in unit tests; use browser checks for player flows and lifecycle, and screenshot/manual inspection for visual alignment. Report failures, warnings, and reruns accurately; an isolated rerun passing is not a full-suite pass.
- Narrow-screen mouse automation does not certify real touch, audio, animation feel, or device performance. Record the devices, browsers, actions, results, and unresolved issues for manual checks actually performed.
- For documentation-only changes, check local links and `git diff --check`; rerun gameplay checks only if needed to establish or investigate the documented baseline.
- User instructions override these workflow defaults.
