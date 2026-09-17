# Formal Development Baseline

## Status and intent

Formal development begins from the frozen M1–M9 MVP behavior on 2026-09-15. M10 final QA/deployment was intentionally skipped. This transition does not certify deployment readiness, real-device touch feel, production audio quality, or final visual quality.

The scraping loop remains the product foundation: drag across a target, see readable damage and detachment, receive an immediate turtle reaction, and finish with a calm rescue result. Existing Challenge, Zen, navigation, level configuration, accessibility semantics, and versioned local persistence are regression constraints unless a later product decision explicitly changes them.

## Development rules

- Keep each increment as a playable end-to-end slice with observable acceptance criteria.
- Keep React responsible for screens, controls, accessibility, and navigation; keep PixiJS responsible for the interactive rescue scene and transient feedback.
- Keep levels configuration-driven and keep persistent animal mood separate from temporary reactions.
- Do not add backend services, accounts, multiplayer, shops, currency, or inventory without a separate product decision.
- Continue running configured typecheck, lint, unit, build, and relevant E2E checks for every implementation slice even though the M10 milestone was skipped.
- Record manual-only risks honestly; skipping M10 does not convert unexecuted checks into verified behavior.

## Inherited risks

- Real mouse and touch feel has not received a documented device playtest pass.
- Procedural audio needs listening, volume, and device-autoplay tuning before it can be considered production audio.
- Current turtle, barnacles, scraper, and environment are vector-like prototype graphics rather than final authored assets.
- Parallel headless Chromium has occasionally emitted transient Pixi WebGL context/shader warnings even when the complete browser suite passes.
- No deployment target, hosting configuration, release checklist, or production monitoring is configured.

## D1: production-quality first rescue

D1 is the default first formal-development slice. It upgrades “Gentle Start” into the production reference rescue without changing its mechanics or adding content breadth.

Player-visible goals:

- Replace or wrap the prototype turtle, barnacles, scraper, and shallow-ocean presentation with an asset-backed visual pipeline following `ART_DIRECTION.md`.
- Preserve readable intact, cracked, breaking, and removed target states at desktop and narrow sizes.
- Preserve mood, relief, hurt, celebration, reduced-motion behavior, and input clarity.
- Replace synthesized cues only when approved audio assets exist; the sound-off default and control remain available.
- Keep Shell Care and Full Rescue functional through the same asset and configuration paths, even if Gentle Start receives the first complete production pass.

Acceptance criteria:

- Given Gentle Start in either mode, when the scene loads, then production assets render without changing configured target positions or hit areas.
- Given scraping crosses each damage threshold, when feedback plays, then target state remains immediately legible and damage/removal still fires exactly once.
- Given the scene is replayed, changed, or left, when a new scene begins, then no visual/audio effect or stale asset state leaks into the new run.
- Given desktop and 320px layouts, when the full rescue is played, then the turtle, targets, scraper, HUD, status, and instructions remain visible and reachable.
- Given an asset fails to load, when the scene initializes, then the player receives a usable fallback rather than an empty rescue area.
- Given D1 implementation is complete, then configured typecheck, lint, unit, build, and relevant browser checks pass; manual visual/audio/touch checks are reported separately if executed.

### D1 implementation status — 2026-09-16

The first asset-backed pass is implemented across all three rescues, with Gentle Start as the reference. The shallow-ocean backdrop, turtle body, dedicated normal and hard target states, and scraper load through one Pixi path; target positions, hit areas, damage, reactions, and modes still use the frozen gameplay rules. A failed asset request leaves the original vector scene playable. The dedicated hard target added on 2026-09-17 replaces the earlier tinted-normal treatment, and authored cracked variants now appear at the same deterministic HP threshold while preserving the procedural breaking/detachment behavior.

Automated verification covers typecheck, lint, 37 deterministic unit tests, production build, desktop/320px gameplay flows, all-level completion, replay/navigation, explicit asset-load fallback, and all four barnacle type/state assets loading without mechanics drift. Desktop and 320px browser screenshots were visually reviewed for target/HUD/instruction visibility. Real-device touch feel, audio listening/autoplay behavior, and final authored breaking/facial sprite variants remain manual or later-polish risks.

## Later product decisions

The planned constrained random distribution across animal body regions, multi-area views, environment expansion, and additional animals are tracked in `FORMAL_ROADMAP.md`. Each roadmap slice still requires its player-visible behavior and acceptance criteria to be confirmed before implementation. Additional tools, progression changes, online features, monetization, and release infrastructure are not implicitly authorized by entering formal development.
