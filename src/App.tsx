import { useCallback, useState } from "react";
import { GameViewport } from "./game/GameViewport";

export default function App() {
  const [remaining, setRemaining] = useState(100);
  const [complete, setComplete] = useState(false);
  const onDamage = useCallback((percent: number) => setRemaining(percent), []);
  const onComplete = useCallback(() => {
    setRemaining(0);
    setComplete(true);
  }, []);

  return (
    <main className="app-shell">
      <header className="hud">
        <div>
          <p className="eyebrow">Gentle Start · Rescue 1</p>
          <h1>Barnacle Rescue</h1>
        </div>
        <div className="progress-block" aria-live="polite">
          <span>{complete ? "Clean!" : "Cleaning progress"}</span>
          <strong data-testid="progress">{100 - remaining}%</strong>
          <div className="progress-track" aria-hidden="true">
            <div className="progress-fill" style={{ width: `${100 - remaining}%` }} />
          </div>
        </div>
      </header>

      <section className={`rescue-card ${complete ? "is-complete" : ""}`}>
        <GameViewport onDamage={onDamage} onComplete={onComplete} />
        <p className="instruction">Hold and drag the scraper back and forth across the barnacle.</p>
        {complete && (
          <div className="result" role="status" data-testid="rescue-complete">
            <span className="sparkle">✦</span>
            <h2>Rescue Complete!</h2>
            <p>The turtle is feeling much better.</p>
          </div>
        )}
      </section>
    </main>
  );
}
