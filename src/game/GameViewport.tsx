import { useEffect, useRef } from "react";
import { BarnacleScene } from "./BarnacleScene";
import type { AnimalState } from "../domain/animal";
import type { LevelConfig } from "../levels/levels";
import type { ChallengeState } from "../domain/challenge";
import type { GameMode } from "../domain/mode";

type GameViewportProps = {
  mode: GameMode;
  level: LevelConfig;
  soundEnabled: boolean;
  onDamage: (remainingPercent: number) => void;
  onComplete: (challenge: ChallengeState) => void;
  onAnimalChange: (state: AnimalState) => void;
  onChallengeChange: (state: ChallengeState) => void;
};

export function GameViewport({ mode, level, soundEnabled, onDamage, onComplete, onAnimalChange, onChallengeChange }: GameViewportProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<BarnacleScene | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const scene = new BarnacleScene(host, { onDamage, onComplete, onAnimalChange, onChallengeChange }, level, mode);
    sceneRef.current = scene;
    void scene.start().catch((error: unknown) => {
      if (sceneRef.current === scene) console.error("Unable to start rescue scene", error);
    });
    return () => {
      sceneRef.current = null;
      scene.destroy();
    };
  }, [mode, level, onDamage, onComplete, onAnimalChange, onChallengeChange]);

  useEffect(() => sceneRef.current?.setSoundEnabled(soundEnabled), [soundEnabled]);

  return <div className="game-viewport" data-testid="game-viewport" ref={hostRef} />;
}
