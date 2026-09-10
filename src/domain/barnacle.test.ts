import { describe, expect, it } from "vitest";
import { createBarnacle as createTarget, damageBarnacle, finishDetachment, isRescueComplete, rescueProgress } from "./barnacle";
const practiceBarnacles = [
  { id: "one", type: "normal" as const, x: -100, y: 0, size: 40, maxHp: 100 },
  { id: "two", type: "normal" as const, x: 0, y: 0, size: 40, maxHp: 100 },
  { id: "three", type: "hard" as const, x: 100, y: 0, size: 40, maxHp: 200 },
];

const createBarnacle = (maxHp: number) => createTarget({ ...practiceBarnacles[0], maxHp });

describe("barnacle lifecycle", () => {
  it("gives hard targets more durability without damaging other targets", () => {
    const targets = practiceBarnacles.map(createTarget);
    expect(damageBarnacle(targets[0], 100).barnacle.state).toBe("breaking");
    expect(damageBarnacle(targets[2], 100).barnacle).toMatchObject({ hp: 100, state: "cracked" });
    expect(targets[1]).toMatchObject({ hp: 100, state: "intact" });
  });

  it("counts only detached targets and requires the last removal for completion", () => {
    const targets = practiceBarnacles.map(createTarget);
    expect(isRescueComplete([])).toBe(false);
    expect(rescueProgress([])).toBe(0);
    targets[0] = damageBarnacle(targets[0], 1000).barnacle;
    expect(rescueProgress(targets)).toBe(0);
    targets[0] = finishDetachment(targets[0]);
    expect(rescueProgress(targets)).toBe(33);
    expect(isRescueComplete(targets)).toBe(false);
    const removed = targets.map((target) => finishDetachment(damageBarnacle(target, 1000).barnacle));
    expect(rescueProgress(removed)).toBe(100);
    expect(isRescueComplete(removed)).toBe(true);
    expect(rescueProgress(removed.map(finishDetachment))).toBe(100);
  });
  it("moves through intact, cracked, breaking, and removed", () => {
    const intact = createBarnacle(100);
    const damaged = damageBarnacle(intact, 49).barnacle;
    const cracked = damageBarnacle(damaged, 1).barnacle;
    const breaking = damageBarnacle(cracked, 50);

    expect(damaged.state).toBe("intact");
    expect(cracked.state).toBe("cracked");
    expect(breaking).toMatchObject({ startedBreaking: true, barnacle: { hp: 0, state: "breaking" } });
    expect(finishDetachment(breaking.barnacle).state).toBe("removed");
  });

  it("cannot damage or detach a target twice", () => {
    const breaking = damageBarnacle(createBarnacle(10), 20).barnacle;
    const removed = finishDetachment(breaking);

    expect(damageBarnacle(breaking, 4)).toEqual({ barnacle: breaking, startedBreaking: false });
    expect(damageBarnacle(removed, 4)).toEqual({ barnacle: removed, startedBreaking: false });
    expect(finishDetachment(removed)).toBe(removed);
  });
});
