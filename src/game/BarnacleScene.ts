import { Application, Container, Graphics } from "pixi.js";
import { createBarnacle, damageBarnacle, finishDetachment, type Barnacle } from "../domain/barnacle";
import { distance, segmentIntersectsCircle, type Point } from "../domain/geometry";

type SceneCallbacks = {
  onDamage: (remainingPercent: number) => void;
  onComplete: () => void;
};

const MIN_SCRAPE_DISTANCE = 3;
const MAX_SAMPLED_DISTANCE = 36;
const DAMAGE_PER_PIXEL = 0.72;
const DETACH_SECONDS = 0.42;

export class BarnacleScene {
  private readonly app = new Application();
  private readonly world = new Container();
  private readonly background = new Graphics();
  private readonly turtle = new Graphics();
  private readonly barnacleView = new Graphics();
  private readonly scraper = new Graphics();
  private barnacle: Barnacle = createBarnacle();
  private target: Point = { x: 0, y: 0 };
  private targetRadius = 42;
  private activePointer: number | null = null;
  private previousPoint: Point | null = null;
  private detachElapsed = 0;
  private celebrationElapsed = 0;
  private completed = false;
  private destroyed = false;
  private initialized = false;

  constructor(
    private readonly host: HTMLDivElement,
    private readonly callbacks: SceneCallbacks,
  ) {}

  async start(): Promise<void> {
    await this.app.init({ resizeTo: this.host, antialias: true, backgroundAlpha: 0, resolution: window.devicePixelRatio });
    this.initialized = true;
    if (this.destroyed) {
      this.app.destroy(true);
      return;
    }

    this.app.canvas.setAttribute("aria-label", "Sea turtle rescue area");
    this.app.canvas.setAttribute("role", "application");
    this.app.canvas.style.touchAction = "none";
    this.host.appendChild(this.app.canvas);
    this.app.stage.addChild(this.world);
    this.world.addChild(this.background, this.turtle, this.barnacleView, this.scraper);
    this.drawScraper();
    this.layout();

    this.app.canvas.addEventListener("pointerdown", this.onPointerDown);
    this.app.canvas.addEventListener("pointermove", this.onPointerMove);
    this.app.canvas.addEventListener("pointerup", this.onPointerEnd);
    this.app.canvas.addEventListener("pointercancel", this.onPointerEnd);
    this.app.canvas.addEventListener("lostpointercapture", this.onPointerEnd);
    window.addEventListener("resize", this.layout);
    this.app.ticker.add(this.tick);
  }

  destroy(): void {
    this.destroyed = true;
    window.removeEventListener("resize", this.layout);
    if (!this.initialized) return;
    const canvas = this.app.canvas;
    canvas.removeEventListener("pointerdown", this.onPointerDown);
    canvas.removeEventListener("pointermove", this.onPointerMove);
    canvas.removeEventListener("pointerup", this.onPointerEnd);
    canvas.removeEventListener("pointercancel", this.onPointerEnd);
    canvas.removeEventListener("lostpointercapture", this.onPointerEnd);
    this.app.destroy(true, { children: true });
  }

  private readonly layout = (): void => {
    const width = this.app.screen.width;
    const height = this.app.screen.height;
    if (!width || !height) return;

    this.background.clear().rect(0, 0, width, height).fill({ color: 0x8bd4d5 });
    this.background.circle(width * 0.15, height * 0.22, 70).fill({ color: 0xbce9df, alpha: 0.34 });
    this.background.circle(width * 0.86, height * 0.72, 110).fill({ color: 0x4eb5b5, alpha: 0.25 });

    const turtleScale = Math.min(width / 820, height / 540);
    const cx = width * 0.5;
    const cy = height * 0.55;
    this.turtle.clear();
    this.turtle.ellipse(cx, cy, 275 * turtleScale, 178 * turtleScale).fill({ color: 0x287c68 });
    this.turtle.ellipse(cx, cy, 235 * turtleScale, 145 * turtleScale).fill({ color: 0x58aa76 });
    this.turtle.ellipse(cx, cy, 190 * turtleScale, 112 * turtleScale).stroke({ color: 0x247360, width: 6 });
    this.turtle.ellipse(cx + 274 * turtleScale, cy - 18 * turtleScale, 75 * turtleScale, 62 * turtleScale).fill({ color: 0x64b982 });
    this.turtle.circle(cx + 301 * turtleScale, cy - 32 * turtleScale, 7 * turtleScale).fill({ color: 0x173d43 });
    this.turtle.moveTo(cx + 303 * turtleScale, cy + 7 * turtleScale)
      .quadraticCurveTo(cx + 326 * turtleScale, cy + 23 * turtleScale, cx + 343 * turtleScale, cy + 4 * turtleScale)
      .stroke({ color: 0x173d43, width: 4 * turtleScale });
    this.turtle.ellipse(cx - 168 * turtleScale, cy - 147 * turtleScale, 95 * turtleScale, 32 * turtleScale).fill({ color: 0x64b982 });
    this.turtle.ellipse(cx - 168 * turtleScale, cy + 147 * turtleScale, 95 * turtleScale, 32 * turtleScale).fill({ color: 0x64b982 });
    this.turtle.ellipse(cx + 145 * turtleScale, cy - 153 * turtleScale, 90 * turtleScale, 30 * turtleScale).fill({ color: 0x64b982 });
    this.turtle.ellipse(cx + 145 * turtleScale, cy + 153 * turtleScale, 90 * turtleScale, 30 * turtleScale).fill({ color: 0x64b982 });

    this.target = { x: cx + 10 * turtleScale, y: cy - 6 * turtleScale };
    this.targetRadius = 44 * turtleScale;
    this.drawBarnacle();
  };

  private drawBarnacle(): void {
    this.barnacleView.clear();
    if (this.barnacle.state === "removed") return;

    const scale = this.barnacle.state === "breaking" ? Math.max(0, 1 - this.detachElapsed / DETACH_SECONDS) : 1;
    const radius = this.targetRadius * scale;
    this.barnacleView.circle(this.target.x, this.target.y, radius).fill({ color: 0xf3d09a }).stroke({ color: 0x8b5b4b, width: 5 });
    this.barnacleView.circle(this.target.x, this.target.y, radius * 0.48).fill({ color: 0x6e4944 });

    if (this.barnacle.state === "cracked" || this.barnacle.state === "breaking") {
      this.barnacleView.moveTo(this.target.x - radius * 0.62, this.target.y - radius * 0.25)
        .lineTo(this.target.x - radius * 0.18, this.target.y + radius * 0.04)
        .lineTo(this.target.x - radius * 0.38, this.target.y + radius * 0.55)
        .moveTo(this.target.x + radius * 0.48, this.target.y - radius * 0.62)
        .lineTo(this.target.x + radius * 0.1, this.target.y - radius * 0.08)
        .lineTo(this.target.x + radius * 0.6, this.target.y + radius * 0.28)
        .stroke({ color: 0x613e3b, width: 4 });
    }
  }

  private drawScraper(): void {
    this.scraper.clear();
    this.scraper.roundRect(-7, -2, 14, 72, 7).fill({ color: 0xf8b85c }).stroke({ color: 0x8e552d, width: 3 });
    this.scraper.roundRect(-28, -11, 56, 18, 4).fill({ color: 0xd9eef0 }).stroke({ color: 0x436b74, width: 3 });
    this.scraper.visible = false;
  }

  private pointFromEvent(event: PointerEvent): Point {
    const rect = this.app.canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * this.app.screen.width,
      y: ((event.clientY - rect.top) / rect.height) * this.app.screen.height,
    };
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (this.activePointer !== null || this.completed) return;
    this.activePointer = event.pointerId;
    this.previousPoint = this.pointFromEvent(event);
    this.scraper.position.copyFrom(this.previousPoint);
    this.scraper.visible = true;
    this.app.canvas.setPointerCapture(event.pointerId);
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointer || !this.previousPoint || this.barnacle.state === "removed") return;
    const point = this.pointFromEvent(event);
    this.scraper.position.copyFrom(point);
    const movement = distance(this.previousPoint, point);

    if (
      movement >= MIN_SCRAPE_DISTANCE &&
      movement <= MAX_SAMPLED_DISTANCE &&
      segmentIntersectsCircle(this.previousPoint, point, this.target, this.targetRadius)
    ) {
      const result = damageBarnacle(this.barnacle, movement * DAMAGE_PER_PIXEL);
      if (result.barnacle !== this.barnacle) {
        this.barnacle = result.barnacle;
        this.callbacks.onDamage(Math.round((this.barnacle.hp / this.barnacle.maxHp) * 100));
        this.drawBarnacle();
      }
    }
    this.previousPoint = point;
  };

  private readonly onPointerEnd = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointer) return;
    this.activePointer = null;
    this.previousPoint = null;
    this.scraper.visible = false;
  };

  private readonly tick = (ticker: { deltaMS: number }): void => {
    if (this.completed) {
      this.celebrationElapsed += ticker.deltaMS / 1000;
      this.turtle.y = -8 - Math.sin(this.celebrationElapsed * 7) * 7;
      return;
    }
    if (this.barnacle.state !== "breaking") return;
    this.detachElapsed += ticker.deltaMS / 1000;
    this.barnacleView.y += ticker.deltaMS * 0.06;
    this.drawBarnacle();

    if (this.detachElapsed >= DETACH_SECONDS && !this.completed) {
      this.barnacle = finishDetachment(this.barnacle);
      this.completed = true;
      this.barnacleView.visible = false;
      this.callbacks.onComplete();
    }
  };
}
