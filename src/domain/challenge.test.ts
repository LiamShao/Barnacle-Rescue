import { describe, expect, it } from "vitest";
import { levels } from "../levels/levels";
import { advanceChallenge, challengeGrade, challengeScore, createChallenge, recordRemoval, scrapeShell } from "./challenge";

describe("Challenge rules", () => {
  it("uses elapsed time, fails at zero and freezes terminal runs", () => {
    const start = createChallenge(levels[0]);
    expect(advanceChallenge(start, 0.25).remaining).toBe(74.75);
    const failed = advanceChallenge(start, 100);
    expect(failed.status).toBe("timeout");
    expect(failed.remaining).toBe(0);
    expect(advanceChallenge(failed, 10)).toBe(failed);
    expect(recordRemoval(failed, "last", 1)).toBe(failed);
    expect(challengeGrade(failed, 750)).toBeNull();
  });
  it("accumulates bare-shell movement, forgives target hits, and fails at zero health", () => {
    const start = createChallenge(levels[0]);
    const partial = scrapeShell(start, 79, false);
    expect(partial.health).toBe(100);
    expect(scrapeShell(partial, 1, false).health).toBe(90);
    expect(scrapeShell(scrapeShell(partial, 10, true), 1, false).health).toBe(100);
    expect(scrapeShell(start, 0, false).health).toBe(100);
    const failed = scrapeShell(start, 800, false);
    expect(failed.status).toBe("health");
    expect(failed.health).toBe(0);
    expect(challengeScore(failed)).toBe(0);
    expect(recordRemoval(failed, "late", 1)).toBe(failed);
  });
  it("counts unique removals, caps combo increments and breaks chains after delay or hurt", () => {
    const first = recordRemoval(createChallenge(levels[0]), "a", 10);
    expect(recordRemoval(first, "a", 10)).toBe(first);
    const second = recordRemoval(advanceChallenge(first, 5), "b", 10);
    expect(second.comboBonus).toBe(10);
    expect(recordRemoval(advanceChallenge(second, 5.01), "c", 10).combo).toBe(1);
    expect(recordRemoval(scrapeShell(second, 80, false), "c", 10).combo).toBe(1);
    let chain = second;
    for (const id of ["c", "d", "e"]) chain = recordRemoval(chain, id, 10);
    expect(chain.comboBonus).toBe(90);
  });
  it("awards whole-second time bonus only on success and freezes during celebration", () => {
    let state = advanceChallenge(createChallenge(levels[0]), 10.5);
    state = scrapeShell(state, 80, false);
    state = recordRemoval(state, "a", 2);
    expect(challengeScore(state)).toBe(50);
    state = recordRemoval(state, "b", 2);
    expect(state.status).toBe("success");
    expect(challengeScore(state)).toBe(200 + 640 + 10 - 50);
    expect(advanceChallenge(state, 100)).toBe(state);
    expect(scrapeShell(state, 1000, false)).toBe(state);
  });
  it.each([[119, "B"], [120, "A"], [144, "S"], [96, "B"], [95, "C"]] as const)("grades score %s against par 120", (score, grade) => {
    const state = { ...createChallenge(levels[0]), status: "success" as const, remaining: 0, comboBonus: score };
    expect(challengeGrade(state, 120)).toBe(grade);
  });
});
