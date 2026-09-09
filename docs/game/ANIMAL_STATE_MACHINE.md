# Sea Turtle State Machine

Mood and reaction are independent dimensions. Mood persists from cleaning progress; reaction temporarily overrides or layers animation, then returns to the current mood. Never use a reaction to store progress.

```ts
type AnimalMood = "sad" | "neutral" | "relaxed" | "happy";
type AnimalReaction = "idle" | "relief" | "hurt" | "celebrate";
```

## Mood derivation

Derive mood from normalized cleaning progress and clamp it to 0–100%:

| Progress | Mood |
| --- | --- |
| 0% to <25% | sad |
| 25% to <60% | neutral |
| 60% to <90% | relaxed |
| 90% to <100% | happy |
| 100% | happy, with celebrate reaction |

Mood transitions are monotonic during the MVP because removed barnacles do not return during a run.

## Reactions and transitions

- Start each run with `reaction: idle` and mood derived from zero progress.
- Non-final removal triggers `relief`; after a short configured duration, return to `idle` without changing the derived mood.
- Harmful input or health loss triggers `hurt`; after its duration, return to `idle`. Hurt may interrupt relief.
- Final removal sets mood to `happy` and triggers `celebrate`. Celebration locks out ordinary relief/hurt transitions and ends only when the level enters the rescued/result state.
- Restart/cancel clears timers and restores state from the new run; stale callbacks must not mutate it.

If multiple non-final removals arrive during relief, restart/extend one relief reaction rather than queueing an unbounded list.

## Observable animation

Idle motion combines mood-specific face/pose with subtle breathing, flipper motion, and blinking. Relief adds a small lift/soft bounce and bubbles. Hurt uses a brief recoil without harsh imagery. Celebrate uses the stronger timed sequence in `ART_DIRECTION.md`.

## Acceptance examples

- Given progress below 25%, when a non-final barnacle is removed, then relief plays and returns to sad idle.
- Given progress crosses 60%, when relief ends, then the visible idle pose is relaxed.
- Given the last barnacle is removed, then celebrate plays once and ordinary reactions cannot replace it.
