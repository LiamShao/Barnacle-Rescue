import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { BarnacleScene } from "./BarnacleScene";
import type { AnimalState } from "../domain/animal";
import type { ResolvedRescueContent } from "../levels/rescueDefinitions";
import type { ChallengeState } from "../domain/challenge";
import type { GameMode } from "../domain/mode";
import type { RescueRun, RescueRunSummary } from "../state/rescueRun";

export type GameViewportHandle = { nextArea: () => void };

type GameViewportProps = {
  mode: GameMode;
  content: ResolvedRescueContent;
  soundEnabled: boolean;
  initialRun: RescueRun;
  onDamage: (remainingPercent: number) => void;
  onComplete: (challenge: ChallengeState) => void;
  onAnimalChange: (state: AnimalState) => void;
  onChallengeChange: (state: ChallengeState) => void;
  onRunChange: (summary: RescueRunSummary) => void;
  onSceneError: () => void;
};

export const GameViewport = forwardRef<GameViewportHandle, GameViewportProps>(function GameViewport(
  { mode, content, soundEnabled, initialRun, onDamage, onComplete, onAnimalChange, onChallengeChange, onRunChange, onSceneError }, ref,
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<BarnacleScene | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const scene = new BarnacleScene(host, { onDamage, onComplete, onAnimalChange, onChallengeChange, onRunChange }, content, mode, initialRun);
    sceneRef.current = scene;
    void scene.start().catch((error: unknown) => {
      if (sceneRef.current === scene) {
        console.error("Unable to start rescue scene", error);
        onSceneError();
      }
    });
    return () => {
      sceneRef.current = null;
      scene.destroy();
    };
  }, [mode, content, initialRun, onDamage, onComplete, onAnimalChange, onChallengeChange, onRunChange, onSceneError]);

  useImperativeHandle(ref, () => ({ nextArea: () => sceneRef.current?.nextStage() }), []);

  useEffect(() => sceneRef.current?.setSoundEnabled(soundEnabled), [soundEnabled]);

  return <div className="game-viewport" data-testid="game-viewport" ref={hostRef} />;
});
