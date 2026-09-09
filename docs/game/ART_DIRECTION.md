# Art Direction

## Visual language

Use a cozy 2D cartoon style with rounded forms, readable silhouettes, soft ocean blues/teals, warm highlights, and limited background noise. The turtle is expressive and sympathetic without appearing medically graphic. Barnacles need stronger value/edge contrast than the shell so their state is legible at gameplay scale.

Prototype art may be clean vector-like Pixi graphics or placeholders. Gameplay work must not wait for final assets. Prefer layered turtle parts (`body`, `eyes`, `mouth`, `flippers`) so mood and motion can combine without full-body art duplication. MVP motion may use sprite swaps, tweens, blinking, bubbles, and particles; avoid skeletal animation.

## Asset manifest

| Asset | Purpose | Approx. size | Alpha | Variants / convention |
| --- | --- | ---: | :---: | --- |
| Turtle body | Main shell/body silhouette | 1024×768 | Yes | `turtle_body_base.png` |
| Turtle eyes | Blink and emotional gaze | 256×128 sheet | Yes | `turtle_eyes_{sad,neutral,relaxed,happy,closed}.png` |
| Turtle mouth | Mood expression | 192×96 | Yes | `turtle_mouth_{sad,neutral,relaxed,happy}.png` |
| Turtle flippers | Layered motion | 512×512 each | Yes | `turtle_flipper_{frontL,frontR,rearL,rearR}.png` |
| Barnacle normal | Cleaning target | 128×128 each | Yes | `barnacle_normal_{intact,cracked,breaking}.png` |
| Barnacle hard | Higher-HP target | 128×128 each | Yes | `barnacle_hard_{intact,cracked,breaking}.png` |
| Fragments | Detachment particles | 256×256 sheet | Yes | `barnacle_fragments_{normal,hard}.png` |
| Scraper | Player tool and contact point | 256×256 | Yes | `scraper_base.png`; define blade hotspot |
| Bubble/sparkle sheet | Relief and celebration | 256×256 sheet | Yes | `fx_{bubble,sparkle}_sheet.png` |
| Ocean backdrop | Calm rescue setting | 1920×1080 | No | `background_shallow_ocean.png` |

Provide source files at 2× intended display size where practical. Trim transparent bounds consistently, document pivots/hotspots beside imported assets, and never encode gameplay hit areas from irregular transparent pixels.

## Feedback targets

Ordinary removal: scrape marks/crack cue → small target wobble → fragments and detach/fall → bubbles → turtle relief → optional score text.

Final removal target rhythm: removal at 0.0s, blink near 0.3s, happy face by 0.6s, faster flippers at 0.8s, body lift at 1.0s, bubbles/sparkles at 1.2s, celebration at 1.5s, Rescue Complete near 2.0s. Tune by feel after the mechanic works.
