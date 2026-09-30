import { Container, Graphics, Sprite, Texture } from "pixi.js";
import type { AnimalState } from "../domain/animal";

export type TurtlePresentation = "dorsal" | "ventral";

type AnimatedFlipper = Readonly<{ view: Graphics; side: -1 | 1; baseRotation: number }>;

const COLORS = {
  outline: 0x247360,
  skin: 0x64b982,
  dorsalShell: 0x287c68,
  dorsalScute: 0x58aa76,
  ventralRim: 0x8cae68,
  ventralPlastron: 0xe8d98a,
  ventralSeam: 0x9f9b62,
} as const;

function capsule(
  start: Readonly<{ x: number; y: number }>,
  end: Readonly<{ x: number; y: number }>,
  radius: number,
  color: number,
): Graphics {
  const length = Math.hypot(end.x - start.x, end.y - start.y);
  const view = new Graphics().roundRect(-radius, -radius, length + radius * 2, radius * 2, radius)
    .fill(color)
    .stroke({ color: COLORS.outline, width: 4 });
  view.position.set(start.x, start.y);
  view.rotation = Math.atan2(end.y - start.y, end.x - start.x);
  return view;
}

/** Local design coordinates keep face and flipper animation independent of hit areas. */
export class TurtleView extends Container {
  readonly presentation: TurtlePresentation;

  private readonly asset = new Sprite();
  private readonly body = new Graphics();
  private readonly head = new Container();
  private readonly headBase = new Graphics();
  private readonly face = new Graphics();
  private readonly bubbles = new Graphics();
  private readonly fallbackExtras: Graphics[] = [];
  private readonly flippers: AnimatedFlipper[];

  constructor(presentation: TurtlePresentation = "dorsal") {
    super();
    this.presentation = presentation;
    this.flippers = presentation === "ventral" ? this.createVentralFallback() : this.createDorsalFallback();

    this.asset.anchor.set(0.5);
    this.asset.width = 700;
    this.asset.height = 466;
    this.asset.visible = false;
    this.head.addChild(this.headBase, this.face);
    this.addChildAt(this.asset, 0);
    this.addChild(this.body, this.head, this.bubbles);
  }

  get usesRasterAsset(): boolean {
    return this.asset.visible;
  }

  useAsset(texture: Texture): void {
    this.asset.texture = texture;
    this.asset.visible = true;
    this.body.visible = false;
    this.headBase.visible = false;
    for (const { view } of this.flippers) view.visible = false;
    for (const view of this.fallbackExtras) view.visible = false;
  }

  animate(state: AnimalState, clock: number): void {
    const celebrating = state.reaction === "celebrate";
    const relief = state.reaction === "relief";
    const hurt = state.reaction === "hurt";
    const time = state.elapsed;
    const lift = relief ? Math.sin(Math.PI * Math.min(time / 1.2, 1)) * 8 : 0;
    this.head.y = -lift + (hurt ? Math.sin(time * 30) * 5 : Math.sin(clock * 1.8) * 1.5);
    this.body.scale.y = 1 + Math.sin(clock * 1.8) * 0.003;
    for (const { view, side, baseRotation } of this.flippers) {
      const speed = celebrating && time >= 0.8 ? 9 : state.mood === "sad" ? 1.3 : 2.2;
      view.rotation = baseRotation + side * Math.sin(clock * speed) * (celebrating ? 0.16 : 0.045);
    }
    const blink = clock % 4.2 < 0.16 || (celebrating && time >= 0.25 && time < 0.45);
    const softEyes = relief || state.mood === "relaxed" || state.mood === "happy";
    const assetFace = this.asset.visible;
    const eyeX = assetFace ? 230 : 301;
    const eyeY = assetFace ? -2 : -32;
    this.face.clear();
    if (blink || softEyes || hurt) {
      this.face.moveTo(eyeX - 9, eyeY).quadraticCurveTo(eyeX, softEyes ? eyeY - 9 : eyeY + 2, eyeX + 9, eyeY)
        .stroke({ color: 0x173d43, width: 4 });
    } else {
      this.face.circle(eyeX, eyeY, 7).fill(0x173d43);
      if (state.mood === "sad") this.face.moveTo(eyeX - 12, eyeY - 15).lineTo(eyeX + 7, eyeY - 8).stroke({ color: 0x173d43, width: 4 });
    }
    const curve = hurt || (state.mood === "sad" && !relief) ? -13 : state.mood === "neutral" && !relief ? 6 : 25;
    const mouthStartX = assetFace ? 226 : 303;
    const mouthY = assetFace ? 17 : 7;
    const mouthWidth = assetFace ? 32 : 40;
    this.face.moveTo(mouthStartX, mouthY).quadraticCurveTo(mouthStartX + mouthWidth * 0.58, assetFace ? curve + 12 : curve, mouthStartX + mouthWidth, mouthY - 3).stroke({ color: 0x173d43, width: 4 });
    this.bubbles.clear();
    if (relief || (celebrating && time >= 1.2)) {
      const phase = relief ? time / 1.2 : (time - 1.2) / 0.8;
      for (let index = 0; index < (celebrating ? 9 : 4); index += 1) {
        const x = 220 + Math.sin(index * 2.4) * (celebrating ? 160 : 65);
        const y = -65 - phase * 95 - index * 8;
        this.bubbles.circle(x, y, 5 + index % 3 * 3).stroke({ color: 0xf0fff4, width: 2, alpha: Math.max(0, 1 - phase) });
      }
    }
  }

  private createDorsalFallback(): AnimatedFlipper[] {
    const flippers = ([-1, 1] as const).flatMap((side) => [-168, 145].map((x) => {
      const view = new Graphics().ellipse(0, 0, 92, 31).fill(COLORS.skin);
      view.position.set(x, side * 150);
      this.addChild(view);
      return { view, side, baseRotation: 0 };
    }));
    this.body.ellipse(0, 0, 275, 178).fill(COLORS.dorsalShell)
      .ellipse(0, 0, 235, 145).fill(COLORS.dorsalScute)
      .ellipse(0, 0, 190, 112).stroke({ color: COLORS.outline, width: 6 });
    this.headBase.ellipse(274, -18, 75, 62).fill(COLORS.skin);
    return flippers;
  }

  private createVentralFallback(): AnimatedFlipper[] {
    const definitions = [
      { start: { x: 70, y: 95 }, end: { x: 130, y: 185 }, radius: 56, side: 1 as const },
      { start: { x: 70, y: -95 }, end: { x: 130, y: -185 }, radius: 56, side: -1 as const },
      { start: { x: -180, y: 100 }, end: { x: -258, y: 150 }, radius: 50, side: 1 as const },
      { start: { x: -180, y: -100 }, end: { x: -258, y: -150 }, radius: 50, side: -1 as const },
    ];
    const flippers = definitions.map(({ start, end, radius, side }) => {
      const view = capsule(start, end, radius, COLORS.skin);
      this.addChild(view);
      return { view, side, baseRotation: view.rotation };
    });

    // Tail base and plastron mirror the approved cleanable silhouette but remain presentation-only.
    const tail = capsule({ x: -205, y: 0 }, { x: -285, y: 0 }, 52, COLORS.skin);
    this.addChild(tail);
    this.fallbackExtras.push(tail);
    this.body.ellipse(-20, 0, 225, 140).fill(COLORS.ventralRim).stroke({ color: COLORS.outline, width: 5 })
      .ellipse(-20, 0, 198, 118).fill(COLORS.ventralPlastron)
      .moveTo(-20, -118).lineTo(-20, 118)
      .moveTo(-192, -58).quadraticCurveTo(-20, -18, 153, -58)
      .moveTo(-192, 58).quadraticCurveTo(-20, 18, 153, 58)
      .stroke({ color: COLORS.ventralSeam, width: 4 });
    this.headBase.roundRect(67, -58, 206, 116, 58).fill(COLORS.skin)
      .ellipse(274, -5, 75, 62).fill(COLORS.skin);
    return flippers;
  }
}
