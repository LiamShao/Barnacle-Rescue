import { describe, expect, it } from "vitest";
import { createBarnacle, damageBarnacle, finishDetachment } from "./barnacle";

describe("barnacle lifecycle", () => {
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
