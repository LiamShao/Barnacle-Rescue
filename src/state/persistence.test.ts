import { describe, expect, it, vi } from "vitest";
import { rescueId } from "../domain/identifiers";
import {
  defaultSave,
  loadSave,
  recordCompletion,
  SAVE_KEY,
  withSettings,
  writeSave,
  type SaveIdentity,
} from "./persistence";

const identities: readonly SaveIdentity[] = [
  { legacyLevelId: 1, rescueId: rescueId("gentle-start") },
  { legacyLevelId: 2, rescueId: rescueId("shell-care") },
  { legacyLevelId: 3, rescueId: rescueId("full-rescue") },
];

describe("versioned local progress", () => {
  it("returns safe defaults for missing, malformed, unsupported, unknown, or duplicate data", () => {
    const invalid = [
      null,
      "{",
      JSON.stringify({ ...defaultSave(), version: 0 }),
      JSON.stringify({ ...defaultSave(), settings: { mode: "fast", soundEnabled: true } }),
      JSON.stringify({
        ...defaultSave(),
        completions: [{ rescueId: "rescue/unknown", zenCompleted: true, challengeBest: null }],
      }),
      JSON.stringify({
        ...defaultSave(),
        completions: [
          { rescueId: identities[0].rescueId, zenCompleted: true, challengeBest: null },
          { rescueId: identities[0].rescueId, zenCompleted: false, challengeBest: null },
        ],
      }),
      JSON.stringify({
        ...defaultSave(),
        completions: [{
          rescueId: identities[0].rescueId,
          zenCompleted: false,
          challengeBest: { score: -1, grade: "A" },
        }],
      }),
    ];

    for (const serialized of invalid) {
      expect(loadSave({ getItem: () => serialized }, identities)).toEqual(defaultSave());
    }
  });

  it("loads valid version 2 settings and stable rescue completion summaries", () => {
    const save = recordCompletion(
      withSettings(defaultSave(), { mode: "zen", soundEnabled: true }),
      identities[1].rescueId,
      "zen",
    );
    expect(loadSave({ getItem: () => JSON.stringify(save) }, identities)).toEqual(save);
  });

  it("migrates valid version 1 settings and results to rescue IDs and writes version 2", () => {
    const legacy = {
      version: 1,
      settings: { soundEnabled: true, mode: "zen" },
      completions: [{
        levelId: 2,
        zenCompleted: true,
        challengeBest: { score: 900, grade: "A" },
      }],
    };
    const setItem = vi.fn();
    const migrated = loadSave({ getItem: () => JSON.stringify(legacy), setItem }, identities);

    expect(migrated).toEqual({
      version: 2,
      settings: legacy.settings,
      completions: [{
        rescueId: identities[1].rescueId,
        zenCompleted: true,
        challengeBest: { score: 900, grade: "A" },
      }],
    });
    expect(setItem).toHaveBeenCalledWith(SAVE_KEY, JSON.stringify(migrated));
  });

  it("rejects invalid version 1 IDs and duplicate completion records", () => {
    for (const completions of [
      [{ levelId: 99, zenCompleted: true, challengeBest: null }],
      [
        { levelId: 1, zenCompleted: true, challengeBest: null },
        { levelId: 1, zenCompleted: false, challengeBest: null },
      ],
    ]) {
      const legacy = { version: 1, settings: { soundEnabled: true, mode: "zen" }, completions };
      expect(loadSave({ getItem: () => JSON.stringify(legacy) }, identities)).toEqual(defaultSave());
    }
  });

  it("records Zen completion and keeps only the best Challenge result", () => {
    const id = identities[0].rescueId;
    let save = recordCompletion(defaultSave(), id, "zen");
    save = recordCompletion(save, id, "challenge", { score: 800, grade: "A" });
    save = recordCompletion(save, id, "challenge", { score: 700, grade: "B" });
    expect(save.completions).toEqual([{
      rescueId: id,
      zenCompleted: true,
      challengeBest: { score: 800, grade: "A" },
    }]);
  });

  it("survives unavailable storage reads, migration writes, and ordinary writes", () => {
    expect(loadSave({ getItem: () => { throw new Error("blocked"); } }, identities)).toEqual(defaultSave());
    const setItem = vi.fn(() => { throw new Error("full"); });
    expect(() => writeSave({ setItem }, defaultSave())).not.toThrow();
    expect(setItem).toHaveBeenCalledWith(SAVE_KEY, JSON.stringify(defaultSave()));

    const legacy = { version: 1, settings: defaultSave().settings, completions: [] };
    expect(loadSave({ getItem: () => JSON.stringify(legacy), setItem }, identities)).toEqual(defaultSave());
  });
});
