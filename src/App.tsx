import { useCallback, useState } from "react";
import { GameViewport } from "./game/GameViewport";
import { animalDescription, createAnimal } from "./domain/animal";
import { levels, type LevelConfig } from "./levels/levels";
import { challengeGrade, challengeScore, createChallenge } from "./domain/challenge";
import { loadSave, recordCompletion, withSettings, writeSave, type LevelCompletion, type SaveData } from "./state/persistence";

const levelIds = levels.map((level) => level.id);

function completionLabel(completion: LevelCompletion): string {
  const details = [];
  if (completion.zenCompleted) details.push("Zen complete");
  if (completion.challengeBest) details.push(`Best ${completion.challengeBest.grade} · ${completion.challengeBest.score}`);
  return details.join(" · ");
}

export default function App() {
  const [remaining, setRemaining] = useState(100);
  const [complete, setComplete] = useState(false);
  const [runId, setRunId] = useState(0);
  const [animal, setAnimal] = useState(createAnimal);
  const [level, setLevel] = useState<LevelConfig | null>(null);
  const [save, setSave] = useState(() => loadSave(window.localStorage, levelIds));
  const mode = save.settings.mode;
  const soundEnabled = save.settings.soundEnabled;
  const [atHome, setAtHome] = useState(true);
  const goHome = () => {
    setLevel(null);
    setAtHome(true);
  };
  const [challenge, setChallenge] = useState(() => createChallenge(levels[0]));
  const startLevel = (next: LevelConfig) => {
    setLevel(next);
    setChallenge(createChallenge(next));
    setRemaining(100);
    setComplete(false);
    setAnimal(createAnimal());
    setRunId((id) => id + 1);
  };
  const onDamage = useCallback((percent: number) => setRemaining(percent), []);
  const updateSave = useCallback((update: (current: SaveData) => SaveData) => {
    setSave((current) => {
      const next = update(current);
      writeSave(window.localStorage, next);
      return next;
    });
  }, []);
  const onComplete = useCallback((finalChallenge: typeof challenge) => {
    setRemaining(0);
    setComplete(true);
    if (!level) return;
    const grade = challengeGrade(finalChallenge, level.parScore);
    updateSave((current) => recordCompletion(
      current,
      level.id,
      mode,
      mode === "challenge" && grade ? { score: challengeScore(finalChallenge), grade } : undefined,
    ));
  }, [level, mode, updateSave]);
  const soundToggle = (
    <button
      className="sound-button"
      aria-pressed={soundEnabled}
      aria-label={soundEnabled ? "Mute sound" : "Turn sound on"}
      onClick={() => updateSave((current) => withSettings(current, { soundEnabled: !current.settings.soundEnabled }))}
    >
      {soundEnabled ? "Sound on" : "Sound off"}
    </button>
  );

  if (atHome) {
    return (
      <main className="app-shell">
        <header className="hud"><p className="eyebrow">A little care goes a long way</p>{soundToggle}</header>
        <section className="level-select home-menu" aria-labelledby="home-title">
          <span className="home-mark" aria-hidden="true">❋</span>
          <h1 id="home-title">Barnacle Rescue</h1>
          <p>A gentle ocean rescue, one little shell at a time.</p>
          <button className="replay-button" onClick={() => setAtHome(false)} autoFocus>Start rescue</button>
          <details className="how-to-play">
            <summary>How to play</summary>
            <ol>
              <li>Choose Challenge for a timed rescue, or Zen to take your time.</li>
              <li>Hold and drag back and forth across a barnacle. Clicking alone will not clean it.</li>
              <li>Gray, double-rimmed barnacles need more scraping. In Challenge, lift the scraper to travel between targets and protect the turtle's health.</li>
              <li>Clean every barnacle, watch the turtle celebrate, then replay or try the next rescue.</li>
            </ol>
          </details>
        </section>
      </main>
    );
  }

  if (!level) {
    return (
      <main className="app-shell">
        <header className="hud"><div><p className="eyebrow">A little care goes a long way</p><h1>Barnacle Rescue</h1></div>{soundToggle}</header>
        <section className="level-select" aria-labelledby="level-heading">
          <h2 id="level-heading">Choose a rescue</h2>
          <button className="levels-button" onClick={goHome}>Main menu</button>
          <div className="mode-select" role="group" aria-label="Game mode">
            <button aria-pressed={mode === "challenge"} onClick={() => updateSave((current) => withSettings(current, { mode: "challenge" }))}>Challenge</button>
            <button aria-pressed={mode === "zen"} onClick={() => updateSave((current) => withSettings(current, { mode: "zen" }))}>Zen</button>
          </div>
          <p>{mode === "challenge" ? "Clean every barnacle before time runs out. Scraping bare shell costs health; lift the scraper to move between targets." : "Take your time. No timer, no health loss, no scores. Just gentle scraping and a happier turtle."}</p>
          <div className="level-grid">
            {levels.map((option, index) => {
              const completion = save.completions.find((item) => item.levelId === option.id);
              return (
                <button className="level-option" key={option.id} onClick={() => startLevel(option)} autoFocus={index === 0}>
                  <span className="eyebrow">Rescue {option.id}</span>
                  <strong>{option.name}</strong>
                  <span>{option.description}</span>
                  <span className="level-count">{option.barnacleCount} barnacles · {option.hardBarnacleCount} hard</span>
                  {mode === "challenge" && <span>{option.timeLimitSeconds}s · {option.animalHealth} health</span>}
                  {completion && <span className="completion-summary" data-testid={`level-progress-${option.id}`}>{completionLabel(completion)}</span>}
                </button>
              );
            })}
          </div>
        </section>
      </main>
    );
  }
  const nextLevel = levels[levels.indexOf(level) + 1];
  const failed = mode === "challenge" && (challenge.status === "timeout" || challenge.status === "health");
  const resultVisible = complete || failed;

  return (
    <main className="app-shell">
      <header className="hud">
        <div>
          <p className="eyebrow" data-testid="level-title">{mode === "challenge" ? "Challenge" : "Zen"} · {level.name} · Rescue {level.id} · {level.barnacleCount} barnacles</p>
          <h1>Barnacle Rescue</h1>
          <button className="levels-button" onClick={() => setLevel(null)} autoFocus>Choose rescue</button>
          <button className="levels-button" onClick={goHome}>Main menu</button>
        </div>
        {soundToggle}
        <div className="progress-block" aria-live="polite">
          <span>{complete ? "Clean!" : "Cleaning progress"}</span>
          <strong data-testid="progress">{100 - remaining}%</strong>
          <div className="progress-track" role="progressbar" aria-label="Cleaning progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={100 - remaining}>
            <div className="progress-fill" style={{ width: `${100 - remaining}%` }} />
          </div>
        </div>
        {mode === "challenge" && <div className="challenge-hud" aria-label="Challenge status">
          <span>Time <strong data-testid="timer">{Math.ceil(challenge.remaining)}s</strong></span>
          <span>Health <strong data-testid="health">{challenge.health}</strong></span>
          <span>Score <strong data-testid="score">{challengeScore(challenge)}</strong></span>
          <span>Combo <strong data-testid="combo">{challenge.combo}</strong></span>
        </div>}
      </header>

      <section className={`rescue-card ${resultVisible ? "is-complete" : ""}`}>
        <GameViewport key={runId} mode={mode} level={level} soundEnabled={soundEnabled} onDamage={onDamage} onComplete={onComplete} onAnimalChange={setAnimal} onChallengeChange={setChallenge} />
        {!resultVisible && <p className="animal-status" role="status" data-testid="animal-status" data-mood={animal.mood} data-reaction={animal.reaction}>{animalDescription(animal)}</p>}
        <p className="instruction">{mode === "challenge" ? "Scrape barnacles, not bare shell. Lift to switch targets. Gray shells take more scraping." : "Gently drag back and forth over each barnacle. There is no rush."}</p>
        {resultVisible && (
          <div className="result" role="status" data-testid={failed ? "rescue-failed" : "rescue-complete"}>
            <span className="sparkle">✦</span>
            <h2>{failed ? "Let's try again" : "Rescue Complete!"}</h2>
            <p>{failed ? challenge.status === "timeout" ? "Time ran out." : "The turtle needs a rest. Avoid scraping bare shell." : "The turtle is feeling much better."}</p>
            {mode === "challenge" && <p>Score: {challengeScore(challenge)}{complete && <span data-testid="grade"> · Grade {challengeGrade(challenge, level.parScore)}</span>}</p>}
            {mode === "challenge" && complete && <p>Time bonus: {Math.floor(challenge.remaining) * 10} · Combo bonus: {challenge.comboBonus}</p>}
            {complete && !nextLevel && <p>You finished the final rescue.</p>}
            <div className="result-actions">
              <button className="replay-button" onClick={() => startLevel(level)} autoFocus>Rescue again</button>
              {complete && nextLevel && <button className="replay-button" onClick={() => startLevel(nextLevel)}>Next rescue</button>}
              <button className="replay-button" onClick={() => setLevel(null)}>Choose rescue</button>
              <button className="replay-button" onClick={goHome}>Main menu</button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
