# Barnacle Rescue MVP Specification

## Product concept and target experience

Barnacle Rescue is a relaxing 2D desktop-first web game, with touch-compatible input architecture, about cleaning harmful barnacles from a rescued sea turtle. The player should see the turtle move from discomfort to relief and finish each rescue feeling calm, helpful, and rewarded.

The primary quality bar is a satisfying loop: scrape a barnacle, see it crack and detach, and receive an immediate positive turtle reaction. Prove that loop before expanding the game.

## Gameplay loop

1. The player drags the scraper across a barnacle.
2. Scraper movement intersecting the barnacle applies cleaning damage.
3. Damage advances visible cracking and breaking states.
4. At zero HP, the barnacle detaches exactly once.
5. Cleaning progress increases and the turtle gives a relief reaction.
6. The final removal triggers happiness, celebration, and Rescue Complete.

A stationary pointer and a simple click do not count as scraping.

## Modes

### Challenge

Show a countdown timer, score, cleaning progress, and animal health. Use the initial tunable formula `100 × removed + 10 × remainingSeconds + comboBonus - 5 × healthLost`, clamped to zero. Begin with a modest movement-based combo bonus; omit it from M1 if it distracts from scraping quality. Time expiry or depleted health may fail the level.

On success, grade by score as a share of a level's configured par score: S at 120% or more, A at 100–119%, B at 80–99%, otherwise C. Failed runs receive no success grade. Tune par scores through level data after playtesting rather than changing the formula per level.

### Zen

Use the same levels and cleaning systems without countdown pressure, failure, aggressive scoring, or combo pressure. Hide those HUD elements and emphasize ambience, subtle motion, and reactions.

## MVP scope

- One sea turtle and one shallow-ocean rescue environment
- One scraper controlled by pointer drag, with touch-compatible event handling
- Normal and hard barnacles with visible damage states
- Three configuration-driven levels
- Challenge and Zen modes
- Turtle moods, temporary reactions, and final celebration
- React menu, mode select, level select, HUD, and result flow
- Local-only persistence for settings and progress
- Unit tests plus relevant browser tests

## Main flow

Main Menu → Mode Select → Level Select → Game → Result → Replay / Next Level

## Non-goals

Backend services, authentication, multiplayer, shops, currency, inventory, additional animals/environments/tools, complex skeletal animation, and abstractions without an immediate MVP use.

## Success criteria

The app runs without critical runtime errors; one turtle, scraper, and barnacle form a playable drag-to-scrape slice; damage is visible; removal updates progress and reaction state; the last barnacle completes the rescue; input design can support mouse and touch; and relevant typecheck/tests pass. Menus, content breadth, scoring depth, audio, and final art follow this vertical slice.
