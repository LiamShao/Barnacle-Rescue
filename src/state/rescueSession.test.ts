import { describe, expect, it, vi } from "vitest";
import { rescues, wholeTurtleCare } from "../levels/levels";
import { prepareRescueSession } from "./rescueSession";
import { damageRescueTarget, finishRescueTargetDetachment, summarizeRescueRun } from "./rescueRun";
import { animalAfterRemoval, createAnimal } from "../domain/animal";

describe("playable rescue preparation", () => {
  it("keeps the generated case on replay and creates fresh target state", () => {
    const session = prepareRescueSession(wholeTurtleCare, "zen", "zen-case");
    const target = session.initialRun.stages[0].targets[0];
    const damaged = damageRescueTarget(session.initialRun, target.placement.id, 500).run;
    const removed = finishRescueTargetDetachment(damaged, target.placement.id).run;
    const replay = prepareRescueSession(wholeTurtleCare, "zen", removed.seed);
    expect(replay.initialRun).toEqual(session.initialRun);
    expect(replay.initialRun.stages[0].targets[0].barnacle.state).toBe("intact");
    const fresh = prepareRescueSession(wholeTurtleCare, "zen", "another-case");
    expect(fresh.initialRun.stages).not.toEqual(session.initialRun.stages);
  });

  it("derives the stage summary and animal mood from whole-rescue removals", () => {
    let run = prepareRescueSession(wholeTurtleCare, "zen", "zen-case").initialRun;
    const targets = run.stages[0].targets;
    for (const target of targets) {
      run = damageRescueTarget(run, target.placement.id, 500).run;
      run = finishRescueTargetDetachment(run, target.placement.id).run;
    }
    const summary = summarizeRescueRun(run);
    expect(summary).toMatchObject({ status: "awaiting-next-stage", stageCount: 2, currentProgress: 100 });
    expect(summary.overallProgress).toBe(targets.length * 10);
    expect(animalAfterRemoval(createAnimal(), summary.overallProgress)).toMatchObject({ mood: "relaxed", reaction: "relief" });
  });

  it("does not expose incomplete multi-area Challenge but preserves fixed rescues", () => {
    expect(() => prepareRescueSession(wholeTurtleCare, "challenge", 1)).toThrow("not available");
    expect(() => prepareRescueSession(rescues[0].content, "challenge", 1)).not.toThrow();
  });

  it("rejects impossible layouts before play", () => {
    const invalid = { ...wholeTurtleCare, rescue: { ...wholeTurtleCare.rescue,
      spawnProfile: { ...wholeTurtleCare.rescue.spawnProfile, targetCount: 1000 } } };
    expect(() => prepareRescueSession(invalid, "zen", 1)).toThrow();
  });

  it("selection prepares a new seed, while explicit replay does not request another", () => {
    const random = vi.spyOn(crypto, "randomUUID").mockReturnValueOnce("00000000-0000-4000-8000-000000000001")
      .mockReturnValueOnce("00000000-0000-4000-8000-000000000002");
    try {
      const first = prepareRescueSession(wholeTurtleCare, "zen");
      const replay = prepareRescueSession(wholeTurtleCare, "zen", first.initialRun.seed);
      const selected = prepareRescueSession(wholeTurtleCare, "zen");
      expect(replay.initialRun.seed).toBe(first.initialRun.seed);
      expect(selected.initialRun.seed).not.toBe(first.initialRun.seed);
      expect(random).toHaveBeenCalledTimes(2);
    } finally { random.mockRestore(); }
  });
});
