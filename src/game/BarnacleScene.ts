import { Application, Container, Graphics } from "pixi.js";
import { createBarnacle, damageBarnacle, finishDetachment, isRescueComplete, rescueProgress } from "../domain/barnacle";
import { levelBarnacles, type LevelConfig } from "../levels/levels";
import { distance, segmentIntersectsCircle, type Point } from "../domain/geometry";
import { advanceAnimal, animalAfterRemoval, celebrationFinished, createAnimal, reactAnimal, type AnimalState } from "../domain/animal";
import { advanceChallenge, challengeScore, createChallenge, recordRemoval, scrapeShell, type ChallengeState } from "../domain/challenge";
import { TurtleView } from "./TurtleView";
import type { GameMode } from "../domain/mode";
import { AudioFeedback } from "./AudioFeedback";

type SceneCallbacks = {
  onDamage: (remainingPercent: number) => void;
  onComplete: (challenge: ChallengeState) => void;
  onAnimalChange: (state: AnimalState) => void;
  onChallengeChange: (state: ChallengeState) => void;
};

const MIN_SCRAPE_DISTANCE = 3;
const MAX_SAMPLED_DISTANCE = 36;
const DAMAGE_PER_PIXEL = 0.72;
const DETACH_SECONDS = 0.42;

type FeedbackParticle = {
  view: Graphics;
  age: number;
  lifetime: number;
  velocity: Point;
  gravity: number;
  spin: number;
};

export class BarnacleScene {
  private readonly app = new Application();
  private readonly world = new Container();
  private readonly background = new Graphics();
  private readonly turtle = new TurtleView();
  private readonly effects = new Container();
  private readonly audio = new AudioFeedback();
  private readonly particles: FeedbackParticle[] = [];
  private readonly reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  private animal = createAnimal();
  private clock = 0;
  private turtleCenterY = 0;
  private readonly targets;
  private createTargets(level: LevelConfig) {
    return levelBarnacles(level).map((config) => ({
    barnacle: createBarnacle(config),
    view: new Graphics(),
    point: { x: 0, y: 0 },
    radius: 42,
    detachElapsed: 0,
    protectedUntil: 0,
    wobbleElapsed: 0,
    }));
  }
  private readonly scraper = new Graphics();
  private activePointer: number | null = null;
  private previousPoint: Point | null = null;
  private completed = false;
  private destroyed = false;
  private initialized = false;
  private challenge: ChallengeState;
  private lastTime = 0;
  private lastSummary = "";

  constructor(
    private readonly host: HTMLDivElement,
    private readonly callbacks: SceneCallbacks,
    level: LevelConfig,
    private readonly mode: GameMode,
  ) {
    this.targets = this.createTargets(level);
    this.challenge = createChallenge(level);
  }

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
    this.world.addChild(this.background, this.turtle, ...this.targets.map((target) => target.view), this.effects, this.scraper);
    this.drawScraper();
    this.layout();
    this.callbacks.onAnimalChange(this.animal);
    this.lastTime = performance.now();
    this.publishChallenge();

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
    this.audio.destroy();
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

  setSoundEnabled(enabled: boolean): void {
    this.audio.setEnabled(enabled);
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
    this.turtleCenterY = cy;
    this.turtle.position.set(cx, cy);
    this.turtle.scale.set(turtleScale);
    this.turtle.animate(this.animal, this.clock);

    for (const target of this.targets) {
      target.point = { x: cx + target.barnacle.x * turtleScale, y: cy + target.barnacle.y * turtleScale };
      target.radius = target.barnacle.size * turtleScale;
      this.drawBarnacle(target);
    }
  };

  private drawBarnacle(target: (typeof this.targets)[number]): void {
    const { barnacle, view, point } = target;
    view.clear();
    if (barnacle.state === "removed") return;

    const scale = barnacle.state === "breaking" ? Math.max(0, 1 - target.detachElapsed / DETACH_SECONDS) : 1;
    const radius = target.radius * scale;
    view.circle(point.x, point.y, radius).fill({ color: barnacle.type === "hard" ? 0xaebbc9 : 0xf3d09a }).stroke({ color: 0x8b5b4b, width: 5 });
    if (barnacle.type === "hard") view.circle(point.x, point.y, radius * 0.78).stroke({ color: 0x50647c, width: 3 });
    view.circle(point.x, point.y, radius * 0.48).fill({ color: 0x6e4944 });

    if (barnacle.state === "cracked" || barnacle.state === "breaking") {
      view.moveTo(point.x - radius * 0.62, point.y - radius * 0.25)
        .lineTo(point.x - radius * 0.18, point.y + radius * 0.04)
        .lineTo(point.x - radius * 0.38, point.y + radius * 0.55)
        .moveTo(point.x + radius * 0.48, point.y - radius * 0.62)
        .lineTo(point.x + radius * 0.1, point.y - radius * 0.08)
        .lineTo(point.x + radius * 0.6, point.y + radius * 0.28)
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
    this.updateTime();
    if (this.activePointer !== null || this.inputLocked || event.button !== 0) return;
    void this.audio.unlock().catch(() => undefined);
    this.activePointer = event.pointerId;
    this.previousPoint = this.pointFromEvent(event);
    this.scraper.position.copyFrom(this.previousPoint);
    this.scraper.visible = true;
    this.app.canvas.setPointerCapture(event.pointerId);
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    this.updateTime();
    if (event.pointerId !== this.activePointer || !this.previousPoint || this.inputLocked) return;
    const point = this.pointFromEvent(event);
    this.scraper.position.copyFrom(point);
    const movement = distance(this.previousPoint, point);

    if (
      movement >= MIN_SCRAPE_DISTANCE &&
      movement <= MAX_SAMPLED_DISTANCE
    ) {
      let onTarget = false;
      for (const target of this.targets) {
        if (target.barnacle.state === "removed" && (this.mode === "zen" || this.challenge.elapsed > target.protectedUntil)) continue;
        if (!segmentIntersectsCircle(this.previousPoint, point, target.point, Math.max(12, target.radius))) continue;
        onTarget = true;
        const previousState = target.barnacle.state;
        const result = damageBarnacle(target.barnacle, movement * DAMAGE_PER_PIXEL);
        if (result.barnacle !== target.barnacle) {
          target.barnacle = result.barnacle;
          target.wobbleElapsed = this.reducedMotion ? 0 : 0.16;
          this.audio.scrape();
          if (previousState === "intact" && target.barnacle.state === "cracked") {
            this.spawnCrackEffect(target.point);
            this.audio.crack();
          }
          if (previousState !== "breaking" && target.barnacle.state === "breaking") {
            this.spawnFragments(target.point, target.barnacle.type === "hard");
            this.audio.detach();
          }
          this.drawBarnacle(target);
        }
      }
      if (this.mode === "challenge") {
        const scale = this.turtle.scale.x;
        const onShell = Math.hypot((point.x - this.turtle.x) / (235 * scale), (point.y - this.turtleCenterY) / (145 * scale)) <= 1;
        const oldHealth = this.challenge.health;
        this.challenge = scrapeShell(this.challenge, onShell ? movement / scale : 0, onTarget);
        if (this.challenge.health < oldHealth) {
          this.animal = reactAnimal(this.animal, "hurt");
          this.callbacks.onAnimalChange(this.animal);
          this.audio.hurt();
        }
        this.publishChallenge();
        if (this.challenge.status !== "playing") this.stopInput();
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
    this.updateTime();
    const seconds = ticker.deltaMS / 1000;
    this.clock += seconds;
    this.updateFeedback(seconds);
    const previousReaction = this.animal.reaction;
    this.animal = advanceAnimal(this.animal, seconds);
    if (previousReaction !== this.animal.reaction) this.callbacks.onAnimalChange(this.animal);
    this.turtle.animate(this.animal, this.clock);
    if (this.animal.reaction === "celebrate") {
      const lift = Math.min(1, Math.max(0, this.animal.elapsed - 1) / 0.5);
      this.turtle.y = this.turtleCenterY - lift * (12 + Math.sin(this.clock * 5) * 4) * this.turtle.scale.y;
      if (!this.completed && celebrationFinished(this.animal)) {
        this.completed = true;
        this.callbacks.onComplete(this.challenge);
      }
      return;
    }
    if (this.inputLocked) return;
    let removed = false;
    for (const target of this.targets) {
      if (target.barnacle.state !== "breaking") continue;
      target.detachElapsed += ticker.deltaMS / 1000;
      target.view.y = target.detachElapsed * 60;
      if (target.detachElapsed >= DETACH_SECONDS) {
        target.barnacle = finishDetachment(target.barnacle);
        target.protectedUntil = this.challenge.elapsed + 0.6;
        if (this.mode === "challenge") this.challenge = recordRemoval(this.challenge, target.barnacle.id, this.targets.length);
        removed = true;
      }
      this.drawBarnacle(target);
    }
    if (!removed) return;
    const barnacles = this.targets.map((target) => target.barnacle);
    const progress = rescueProgress(barnacles);
    this.callbacks.onDamage(100 - progress);
    this.animal = animalAfterRemoval(this.animal, progress);
    this.callbacks.onAnimalChange(this.animal);
    this.publishChallenge();
    if (isRescueComplete(barnacles)) {
      this.spawnCelebration();
      this.audio.celebrate();
      this.stopInput();
    }
  };

  private spawnCrackEffect(point: Point): void {
    const view = new Graphics().circle(0, 0, 18).stroke({ color: 0xfff3b4, width: 4, alpha: 0.9 });
    this.addParticle(view, point, 0.3, { x: 0, y: 0 }, 0, 0);
  }

  private spawnFragments(point: Point, hard: boolean): void {
    const count = this.reducedMotion ? 2 : 4;
    for (let index = 0; index < count; index += 1) {
      const size = 4 + Math.random() * 5;
      const view = new Graphics().poly([0, -size, size, size, -size, size]).fill(hard ? 0x9cabbc : 0xe9bd7d);
      this.addParticle(
        view,
        point,
        0.55 + Math.random() * 0.2,
        { x: (Math.random() - 0.5) * 115, y: -45 - Math.random() * 65 },
        210,
        (Math.random() - 0.5) * 10,
      );
    }
  }

  private spawnCelebration(): void {
    const count = this.reducedMotion ? 4 : 8;
    for (let index = 0; index < count; index += 1) {
      const view = new Graphics().poly([0, -7, 3, -3, 7, 0, 3, 3, 0, 7, -3, 3, -7, 0, -3, -3]).fill({ color: index % 2 ? 0xfff178 : 0xf0fff4, alpha: 0.95 });
      this.addParticle(
        view,
        { x: this.app.screen.width * (0.25 + Math.random() * 0.5), y: this.app.screen.height * (0.35 + Math.random() * 0.25) },
        0.9 + Math.random() * 0.45,
        { x: (Math.random() - 0.5) * 55, y: -25 - Math.random() * 55 },
        35,
        (Math.random() - 0.5) * 5,
      );
    }
  }

  private addParticle(view: Graphics, point: Point, lifetime: number, velocity: Point, gravity: number, spin: number): void {
    view.position.copyFrom(point);
    this.effects.addChild(view);
    this.particles.push({ view, age: 0, lifetime, velocity, gravity, spin });
  }

  private updateFeedback(seconds: number): void {
    for (const target of this.targets) {
      if (target.wobbleElapsed <= 0) continue;
      target.wobbleElapsed = Math.max(0, target.wobbleElapsed - seconds);
      target.view.x = target.wobbleElapsed > 0 ? Math.sin(target.wobbleElapsed * 95) * 2.5 : 0;
    }
    for (let index = this.particles.length - 1; index >= 0; index -= 1) {
      const particle = this.particles[index];
      particle.age += seconds;
      if (particle.age >= particle.lifetime) {
        // Keep expired graphics attached but hidden; the scene destroys them in one safe batch.
        particle.view.visible = false;
        this.particles.splice(index, 1);
        continue;
      }
      particle.velocity.y += particle.gravity * seconds;
      particle.view.x += particle.velocity.x * seconds;
      particle.view.y += particle.velocity.y * seconds;
      particle.view.rotation += particle.spin * seconds;
      particle.view.alpha = Math.max(0, 1 - particle.age / particle.lifetime);
      if (particle.gravity === 0) particle.view.scale.set(1 + particle.age / particle.lifetime * 0.8);
    }
  }

  private stopInput(): void {
    this.scraper.visible = false;
    if (this.activePointer !== null && this.app.canvas.hasPointerCapture(this.activePointer)) {
      this.app.canvas.releasePointerCapture(this.activePointer);
    }
    this.activePointer = null;
    this.previousPoint = null;
  }

  private updateTime(): void {
    if (this.mode === "zen") return;
    const now = performance.now();
    this.challenge = advanceChallenge(this.challenge, (now - this.lastTime) / 1000);
    this.lastTime = now;
    if (this.challenge.status !== "playing") this.stopInput();
    this.publishChallenge();
  }

  private publishChallenge(): void {
    if (this.mode === "zen") return;
    const summary = [this.challenge.status, Math.ceil(this.challenge.remaining), this.challenge.health, challengeScore(this.challenge), this.challenge.combo].join(":");
    if (summary === this.lastSummary) return;
    this.lastSummary = summary;
    this.callbacks.onChallengeChange(this.challenge);
  }

  private get inputLocked(): boolean {
    return this.animal.reaction === "celebrate" || (this.mode === "challenge" && this.challenge.status !== "playing");
  }
}
