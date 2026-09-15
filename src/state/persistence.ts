import type { GameMode } from "../domain/mode";

export const SAVE_KEY = "barnacle-rescue:save";
export const SAVE_VERSION = 1;

export type SavedGrade = "S" | "A" | "B" | "C";

export type LevelCompletion = {
  levelId: number;
  zenCompleted: boolean;
  challengeBest: { score: number; grade: SavedGrade } | null;
};

export type SaveData = {
  version: typeof SAVE_VERSION;
  settings: { soundEnabled: boolean; mode: GameMode };
  completions: LevelCompletion[];
};

type StorageReader = Pick<Storage, "getItem">;
type StorageWriter = Pick<Storage, "setItem">;

export function defaultSave(): SaveData {
  return { version: SAVE_VERSION, settings: { soundEnabled: false, mode: "challenge" }, completions: [] };
}

export function loadSave(storage: StorageReader, validLevelIds: readonly number[]): SaveData {
  try {
    const serialized = storage.getItem(SAVE_KEY);
    if (!serialized) return defaultSave();
    const value: unknown = JSON.parse(serialized);
    return isSaveData(value, validLevelIds) ? value : defaultSave();
  } catch {
    return defaultSave();
  }
}

export function writeSave(storage: StorageWriter, save: SaveData): void {
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // Storage may be unavailable or full; gameplay must remain usable.
  }
}

export function withSettings(save: SaveData, settings: Partial<SaveData["settings"]>): SaveData {
  return { ...save, settings: { ...save.settings, ...settings } };
}

export function recordCompletion(
  save: SaveData,
  levelId: number,
  mode: GameMode,
  challengeResult?: { score: number; grade: SavedGrade },
): SaveData {
  const existing = save.completions.find((completion) => completion.levelId === levelId) ?? {
    levelId,
    zenCompleted: false,
    challengeBest: null,
  };
  const completion: LevelCompletion = mode === "zen"
    ? { ...existing, zenCompleted: true }
    : {
      ...existing,
      challengeBest: challengeResult && (!existing.challengeBest || challengeResult.score > existing.challengeBest.score)
        ? { score: Math.max(0, Math.floor(challengeResult.score)), grade: challengeResult.grade }
        : existing.challengeBest,
    };
  return {
    ...save,
    completions: [...save.completions.filter((item) => item.levelId !== levelId), completion]
      .sort((left, right) => left.levelId - right.levelId),
  };
}

function isSaveData(value: unknown, validLevelIds: readonly number[]): value is SaveData {
  if (!isRecord(value) || value.version !== SAVE_VERSION || !isRecord(value.settings)) return false;
  if (typeof value.settings.soundEnabled !== "boolean" || !isMode(value.settings.mode)) return false;
  if (!Array.isArray(value.completions)) return false;
  const seen = new Set<number>();
  return value.completions.every((completion) => {
    if (!isRecord(completion) || !Number.isInteger(completion.levelId) || !validLevelIds.includes(completion.levelId as number)) return false;
    if (seen.has(completion.levelId as number) || typeof completion.zenCompleted !== "boolean") return false;
    seen.add(completion.levelId as number);
    if (completion.challengeBest === null) return true;
    return isRecord(completion.challengeBest)
      && Number.isInteger(completion.challengeBest.score)
      && (completion.challengeBest.score as number) >= 0
      && isGrade(completion.challengeBest.grade);
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isMode(value: unknown): value is GameMode {
  return value === "challenge" || value === "zen";
}

function isGrade(value: unknown): value is SavedGrade {
  return value === "S" || value === "A" || value === "B" || value === "C";
}
