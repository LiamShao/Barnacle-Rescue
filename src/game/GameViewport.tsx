import { useEffect, useRef } from "react";
import { BarnacleScene } from "./BarnacleScene";
import type { AnimalState } from "../domain/animal";
import type { LevelConfig } from "../levels/levels";
import type { ChallengeState } from "../domain/challenge";
import type { GameMode } from "../domain/mode";

type GameViewportProps = {
  mode: GameMode;
  level: LevelConfig;
  onDamage: (remainingPercent: number) => void;
  onComplete: () => void;
  onAnimalChange: (state: AnimalState) => void;
  onChallengeChange: (state: ChallengeState) => void;
};

export function GameViewport({ mode, level, onDamage, onComplete, onAnimalChange, onChallengeChange }: GameViewportProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const scene = new BarnacleScene(host, { onDamage, onComplete, onAnimalChange, onChallengeChange }, level, mode);
    void scene.start();
    return () => scene.destroy();
  }, [mode, level, onDamage, onComplete, onAnimalChange, onChallengeChange]);

  return <div className="game-viewport" data-testid="game-viewport" ref={hostRef} />;
}
