import { Container, Graphics } from "pixi.js";
import type { AnimalState } from "../domain/animal";

/** Local design coordinates keep face and flipper animation independent of hit areas. */
export class TurtleView extends Container {
  private readonly shell = new Graphics();
  private readonly head = new Container();
  private readonly face = new Graphics();
  private readonly bubbles = new Graphics();
  private readonly flippers = [-1, 1].flatMap((side) => [-168, 145].map((x) => {
    const view = new Graphics().ellipse(0, 0, 92, 31).fill(0x64b982);
    view.position.set(x, side * 150);
    this.addChild(view);
    return { view, side };
  }));

  constructor() {
    super();
    this.shell.ellipse(0, 0, 275, 178).fill(0x287c68)
      .ellipse(0, 0, 235, 145).fill(0x58aa76)
      .ellipse(0, 0, 190, 112).stroke({ color: 0x247360, width: 6 });
    this.head.addChild(new Graphics().ellipse(274, -18, 75, 62).fill(0x64b982), this.face);
    this.addChild(this.shell, this.head, this.bubbles);
  }

  animate(state: AnimalState, clock: number): void {
    const celebrating = state.reaction === "celebrate";
    const relief = state.reaction === "relief";
    const hurt = state.reaction === "hurt";
    const time = state.elapsed;
    const lift = relief ? Math.sin(Math.PI * Math.min(time / 1.2, 1)) * 8 : 0;
    this.head.y = -lift + (hurt ? Math.sin(time * 30) * 5 : Math.sin(clock * 1.8) * 1.5);
    this.shell.scale.y = 1 + Math.sin(clock * 1.8) * 0.003;
    for (const { view, side } of this.flippers) {
      const speed = celebrating && time >= 0.8 ? 9 : state.mood === "sad" ? 1.3 : 2.2;
      view.rotation = side * Math.sin(clock * speed) * (celebrating ? 0.16 : 0.045);
    }
    const blink = clock % 4.2 < 0.16 || (celebrating && time >= 0.25 && time < 0.45);
    const softEyes = relief || state.mood === "relaxed" || state.mood === "happy";
    this.face.clear();
    if (blink || softEyes || hurt) {
      this.face.moveTo(292, -32).quadraticCurveTo(301, softEyes ? -41 : -30, 310, -32)
        .stroke({ color: 0x173d43, width: 4 });
    } else {
      this.face.circle(301, -32, 7).fill(0x173d43);
      if (state.mood === "sad") this.face.moveTo(289, -47).lineTo(308, -40).stroke({ color: 0x173d43, width: 4 });
    }
    const curve = hurt || (state.mood === "sad" && !relief) ? -13 : state.mood === "neutral" && !relief ? 6 : 25;
    this.face.moveTo(303, 7).quadraticCurveTo(326, curve, 343, 4).stroke({ color: 0x173d43, width: 4 });
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
}
