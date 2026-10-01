import type { RescueId } from "../domain/identifiers";
import type { GameMode } from "../domain/mode";

export const SAVE_KEY = "barnacle-rescue:save";
export const SAVE_VERSION = 2;
const LEGACY_SAVE_VERSION = 1;

export type SavedGrade = "S" | "A" | "B" | "C";

export type RescueCompletion = {
  rescueId: RescueId;
  zenCompleted: boolean;
  challengeBest: { score: number; grade: SavedGrade } | null;
};

export type SaveData = {
  version: typeof SAVE_VERSION;
  settings: { soundEnabled: boolean; mode: GameMode };
  completions: RescueCompletion[];
};

export type SaveIdentity = Readonly<{
  legacyLevelId?: number;
  rescueId: RescueId;
}>;

type StorageReader = Pick<Storage, "getItem"> & Partial<Pick<Storage, "setItem">>;
type StorageWriter = Pick<Storage, "setItem">;

export function defaultSave(): SaveData {
  return { version: SAVE_VERSION, settings: { soundEnabled: false, mode: "challenge" }, completions: [] };
}

export function loadSave(storage: StorageReader, identities: readonly SaveIdentity[]): SaveData {
  try {
    const identityIndex = indexIdentities(identities);
    if (!identityIndex) return defaultSave();
    const serialized = storage.getItem(SAVE_KEY);
    if (!serialized) return defaultSave();
    const value: unknown = JSON.parse(serialized);
    const current = parseCurrentSave(value, identityIndex.rescueIds);
    if (current) return current;
    const migrated = migrateLegacySave(value, identityIndex.byLegacyLevelId);
    if (!migrated) return defaultSave();
    if (storage.setItem) writeSave(storage as StorageWriter, migrated);
    return migrated;
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
  rescueId: RescueId,
  mode: GameMode,
  challengeResult?: { score: number; grade: SavedGrade },
): SaveData {
  const existing = save.completions.find((completion) => completion.rescueId === rescueId) ?? {
    rescueId,
    zenCompleted: false,
    challengeBest: null,
  };
  const candidate = challengeResult && Number.isFinite(challengeResult.score)
    ? { score: Math.max(0, Math.floor(challengeResult.score)), grade: challengeResult.grade }
    : null;
  const completion: RescueCompletion = mode === "zen"
    ? { ...existing, zenCompleted: true }
    : {
      ...existing,
      challengeBest: candidate && (!existing.challengeBest || candidate.score > existing.challengeBest.score)
        ? candidate
        : existing.challengeBest,
    };
  return {
    ...save,
    completions: [...save.completions.filter((item) => item.rescueId !== rescueId), completion]
      .sort((left, right) => left.rescueId.localeCompare(right.rescueId)),
  };
}

function indexIdentities(identities: readonly SaveIdentity[]): Readonly<{
  rescueIds: ReadonlySet<RescueId>;
  byLegacyLevelId: ReadonlyMap<number, RescueId>;
}> | null {
  const rescueIds = new Set<RescueId>();
  const byLegacyLevelId = new Map<number, RescueId>();
  for (const identity of identities) {
    if (typeof identity.rescueId !== "string" || rescueIds.has(identity.rescueId)) return null;
    rescueIds.add(identity.rescueId);
    if (identity.legacyLevelId !== undefined) {
      if (!Number.isSafeInteger(identity.legacyLevelId) || identity.legacyLevelId < 0) return null;
      if (byLegacyLevelId.has(identity.legacyLevelId)) return null;
      byLegacyLevelId.set(identity.legacyLevelId, identity.rescueId);
    }
  }
  return { rescueIds, byLegacyLevelId };
}

function parseCurrentSave(value: unknown, validRescueIds: ReadonlySet<RescueId>): SaveData | null {
  if (!isRecord(value) || value.version !== SAVE_VERSION || !isSettings(value.settings)) return null;
  if (!Array.isArray(value.completions)) return null;
  const completions: RescueCompletion[] = [];
  const seen = new Set<RescueId>();
  for (const stored of value.completions) {
    if (!isRecord(stored) || typeof stored.rescueId !== "string") return null;
    const rescueId = stored.rescueId as RescueId;
    if (!validRescueIds.has(rescueId) || seen.has(rescueId)) return null;
    if (typeof stored.zenCompleted !== "boolean" || !isChallengeBest(stored.challengeBest)) return null;
    seen.add(rescueId);
    completions.push({
      rescueId,
      zenCompleted: stored.zenCompleted,
      challengeBest: copyChallengeBest(stored.challengeBest),
    });
  }
  return {
    version: SAVE_VERSION,
    settings: { soundEnabled: value.settings.soundEnabled, mode: value.settings.mode },
    completions,
  };
}

function migrateLegacySave(value: unknown, byLegacyLevelId: ReadonlyMap<number, RescueId>): SaveData | null {
  if (!isRecord(value) || value.version !== LEGACY_SAVE_VERSION || !isSettings(value.settings)) return null;
  if (!Array.isArray(value.completions)) return null;
  const completions: RescueCompletion[] = [];
  const seen = new Set<number>();
  for (const stored of value.completions) {
    if (!isRecord(stored) || !Number.isSafeInteger(stored.levelId)) return null;
    const levelId = stored.levelId as number;
    const rescueId = byLegacyLevelId.get(levelId);
    if (!rescueId || seen.has(levelId)) return null;
    if (typeof stored.zenCompleted !== "boolean" || !isChallengeBest(stored.challengeBest)) return null;
    seen.add(levelId);
    completions.push({
      rescueId,
      zenCompleted: stored.zenCompleted,
      challengeBest: copyChallengeBest(stored.challengeBest),
    });
  }
  return {
    version: SAVE_VERSION,
    settings: { soundEnabled: value.settings.soundEnabled, mode: value.settings.mode },
    completions,
  };
}

function copyChallengeBest(value: unknown): RescueCompletion["challengeBest"] {
  if (value === null) return null;
  const best = value as { score: number; grade: SavedGrade };
  return { score: best.score, grade: best.grade };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSettings(value: unknown): value is SaveData["settings"] {
  return isRecord(value) && typeof value.soundEnabled === "boolean" && isMode(value.mode);
}

function isMode(value: unknown): value is GameMode {
  return value === "challenge" || value === "zen";
}

function isChallengeBest(value: unknown): value is RescueCompletion["challengeBest"] {
  if (value === null) return true;
  return isRecord(value)
    && Number.isSafeInteger(value.score)
    && (value.score as number) >= 0
    && isGrade(value.grade);
}

function isGrade(value: unknown): value is SavedGrade {
  return value === "S" || value === "A" || value === "B" || value === "C";
}
