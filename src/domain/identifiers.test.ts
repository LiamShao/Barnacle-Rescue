import { describe, expect, it } from "vitest";
import { createChallenge, recordRemoval } from "./challenge";
import {
  animalId,
  assertUniqueTargetIds,
  authoredTargetId,
  bodyViewId,
  cleanableRegionId,
  environmentId,
  generatedTargetId,
  rescueId,
  spawnRegionId,
  stageId,
} from "./identifiers";
import { rescues } from "../levels/levels";

describe("stable content identifiers", () => {
  it("builds scoped IDs from authored keys rather than labels or array positions", () => {
    const animal = animalId("sea-turtle");
    const rescue = rescueId("gentle-start");
    const view = bodyViewId(animal, "dorsal");

    expect(animal).toBe("animal/sea-turtle");
    expect(environmentId("shallow-ocean")).toBe("environment/shallow-ocean");
    expect(rescue).toBe("rescue/gentle-start");
    expect(stageId(rescue, "shell-care")).toBe("rescue/gentle-start/stage/shell-care");
    expect(view).toBe("animal/sea-turtle/view/dorsal");
    expect(cleanableRegionId(view, "shell")).toBe("animal/sea-turtle/view/dorsal/region/shell");
    expect(spawnRegionId(view, "shell-center")).toBe("animal/sea-turtle/view/dorsal/spawn/shell-center");
    expect(authoredTargetId(rescue, "shell-one")).toBe("rescue/gentle-start/target/authored/shell-one");
  });

  it("derives generated targets only from rescue, seed and global generation order", () => {
    const rescue = rescueId("gentle-start");
    const replayId = generatedTargetId(rescue, 42, 3);

    expect(replayId).toBe(generatedTargetId(rescue, 42, 3));
    expect(replayId).not.toBe(generatedTargetId(rescue, 42, 4));
    expect(replayId).not.toBe(generatedTargetId(rescue, "42", 3));
    expect(replayId).not.toBe(generatedTargetId(rescueId("shell-care"), 42, 3));
  });

  it("rejects unstable keys, invalid seeds, invalid order and duplicate target IDs", () => {
    const rescue = rescueId("gentle-start");
    const target = generatedTargetId(rescue, 7, 0);

    expect(() => rescueId("Gentle Start")).toThrow("lowercase kebab-case");
    expect(() => generatedTargetId(rescue, Number.NaN, 0)).toThrow("safe integers");
    expect(() => generatedTargetId(rescue, "", 0)).toThrow("must not be empty");
    expect(() => generatedTargetId(rescue, 7, -1)).toThrow("non-negative safe integer");
    expect(() => assertUniqueTargetIds([{ id: target }, { id: target }])).toThrow("Duplicate target ID");
  });

  it("keeps removal and completion idempotent with rescue-global target IDs", () => {
    const rescue = rescueId("multi-area-care");
    const firstStageTarget = generatedTargetId(rescue, 19, 0);
    const secondStageTarget = generatedTargetId(rescue, 19, 1);
    const afterFirst = recordRemoval(createChallenge(rescues[0].content.rescue.challenge), firstStageTarget, 2);

    expect(recordRemoval(afterFirst, firstStageTarget, 2)).toBe(afterFirst);
    const completed = recordRemoval(afterFirst, secondStageTarget, 2);
    expect(completed.status).toBe("success");
    expect(recordRemoval(completed, secondStageTarget, 2)).toBe(completed);
  });
});
