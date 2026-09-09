import { useEffect, useRef } from "react";
import { BarnacleScene } from "./BarnacleScene";

type GameViewportProps = {
  onDamage: (remainingPercent: number) => void;
  onComplete: () => void;
};

export function GameViewport({ onDamage, onComplete }: GameViewportProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const scene = new BarnacleScene(host, { onDamage, onComplete });
    void scene.start();
    return () => scene.destroy();
  }, [onDamage, onComplete]);

  return <div className="game-viewport" data-testid="game-viewport" ref={hostRef} />;
}
