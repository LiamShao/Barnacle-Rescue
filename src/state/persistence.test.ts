import { describe, expect, it, vi } from "vitest";
import { defaultSave, loadSave, recordCompletion, SAVE_KEY, withSettings, writeSave } from "./persistence";

const levelIds = [1, 2, 3];

describe("versioned local progress", () => {
  it("returns safe defaults for missing, malformed, old, or invalid data", () => {
    expect(loadSave({ getItem: () => null }, levelIds)).toEqual(defaultSave());
    expect(loadSave({ getItem: () => "{" }, levelIds)).toEqual(defaultSave());
    expect(loadSave({ getItem: () => JSON.stringify({ ...defaultSave(), version: 0 }) }, levelIds)).toEqual(defaultSave());
    expect(loadSave({ getItem: () => JSON.stringify({ ...defaultSave(), settings: { mode: "fast", soundEnabled: true } }) }, levelIds)).toEqual(defaultSave());
    expect(loadSave({ getItem: () => JSON.stringify({ ...defaultSave(), completions: [{ levelId: 99, zenCompleted: true, challengeBest: null }] }) }, levelIds)).toEqual(defaultSave());
  });

  it("loads valid settings and completion summaries", () => {
    const save = recordCompletion(withSettings(defaultSave(), { mode: "zen", soundEnabled: true }), 2, "zen");
    expect(loadSave({ getItem: () => JSON.stringify(save) }, levelIds)).toEqual(save);
  });

  it("records Zen completion and keeps only the best Challenge result", () => {
    let save = recordCompletion(defaultSave(), 1, "zen");
    save = recordCompletion(save, 1, "challenge", { score: 800, grade: "A" });
    save = recordCompletion(save, 1, "challenge", { score: 700, grade: "B" });
    expect(save.completions).toEqual([{ levelId: 1, zenCompleted: true, challengeBest: { score: 800, grade: "A" } }]);
  });

  it("survives unavailable storage reads and writes", () => {
    expect(loadSave({ getItem: () => { throw new Error("blocked"); } }, levelIds)).toEqual(defaultSave());
    const setItem = vi.fn(() => { throw new Error("full"); });
    expect(() => writeSave({ setItem }, defaultSave())).not.toThrow();
    expect(setItem).toHaveBeenCalledWith(SAVE_KEY, JSON.stringify(defaultSave()));
  });
});
