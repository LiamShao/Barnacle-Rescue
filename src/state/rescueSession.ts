import type { GameMode } from "../domain/mode";
import type { ResolvedRescueContent } from "../levels/rescueDefinitions";
import type { RescueSeed } from "../levels/generatedPlacement";
import { prepareRescueRun, type RescueRun } from "./rescueRun";

export type RescueSession = Readonly<{ initialRun: RescueRun }>;

/** Prepare every target before mounting the scene; replay supplies the retained seed. */
export function prepareRescueSession(
  content: ResolvedRescueContent,
  mode: GameMode,
  seed: RescueSeed = crypto.randomUUID(),
): RescueSession {
  if (mode === "challenge" && content.stages.length > 1) {
    throw new Error("Multi-area Challenge is not available yet");
  }
  return { initialRun: prepareRescueRun(content, seed) };
}
