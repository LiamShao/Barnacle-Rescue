type ToneOptions = {
  frequency: number;
  endFrequency: number;
  duration: number;
  volume: number;
  type: OscillatorType;
};

let sharedContext: AudioContext | null = null;

/** Small synthesized cues keep the prototype self-contained until final audio assets exist. */
export class AudioFeedback {
  private enabled = true;
  private lastScrapeAt = 0;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled && sharedContext?.state === "running") void sharedContext.suspend();
  }

  async unlock(): Promise<void> {
    if (!this.enabled || typeof AudioContext === "undefined") return;
    sharedContext ??= new AudioContext();
    if (sharedContext.state === "suspended") await sharedContext.resume();
  }

  scrape(): void {
    const now = performance.now();
    if (now - this.lastScrapeAt < 75) return;
    this.lastScrapeAt = now;
    this.tone({ frequency: 190, endFrequency: 135, duration: 0.045, volume: 0.018, type: "sawtooth" });
  }

  crack(): void {
    this.tone({ frequency: 430, endFrequency: 260, duration: 0.09, volume: 0.035, type: "triangle" });
  }

  detach(): void {
    this.tone({ frequency: 250, endFrequency: 110, duration: 0.16, volume: 0.045, type: "triangle" });
  }

  hurt(): void {
    this.tone({ frequency: 155, endFrequency: 90, duration: 0.18, volume: 0.04, type: "sawtooth" });
  }

  celebrate(): void {
    this.tone({ frequency: 440, endFrequency: 660, duration: 0.18, volume: 0.035, type: "sine" });
    window.setTimeout(() => {
      this.tone({ frequency: 660, endFrequency: 880, duration: 0.22, volume: 0.035, type: "sine" });
    }, 130);
  }

  destroy(): void {
    // The page keeps one shared context so repeated replays do not exhaust browser audio resources.
  }

  private tone(options: ToneOptions): void {
    const context = sharedContext;
    if (!this.enabled || !context || context.state !== "running") return;
    const start = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = options.type;
    oscillator.frequency.setValueAtTime(options.frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(options.endFrequency, start + options.duration);
    gain.gain.setValueAtTime(options.volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + options.duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + options.duration);
  }
}
