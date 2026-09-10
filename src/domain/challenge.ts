import type { LevelConfig } from "../levels/levels";

export type ChallengeState = {
  status: "playing" | "success" | "timeout" | "health";
  remaining: number;
  health: number;
  initialHealth: number;
  removedIds: readonly string[];
  combo: number;
  comboBonus: number;
  lastRemovalTime: number | null;
  elapsed: number;
  unsafeDistance: number;
};

export function createChallenge(level: LevelConfig): ChallengeState {
  return { status: "playing", remaining: level.timeLimitSeconds, health: level.animalHealth,
    initialHealth: level.animalHealth, removedIds: [], combo: 0, comboBonus: 0,
    lastRemovalTime: null, elapsed: 0, unsafeDistance: 0 };
}

export function advanceChallenge(state: ChallengeState, seconds: number): ChallengeState {
  if (state.status !== "playing" || !Number.isFinite(seconds) || seconds <= 0) return state;
  const remaining = Math.max(0, state.remaining - seconds);
  const elapsed = state.elapsed + seconds;
  return { ...state, remaining, elapsed, status: remaining === 0 ? "timeout" : "playing",
    combo: state.lastRemovalTime !== null && elapsed - state.lastRemovalTime > 5 ? 0 : state.combo };
}

export function scrapeShell(state: ChallengeState, distance: number, onTarget: boolean): ChallengeState {
  if (state.status !== "playing") return state;
  if (onTarget) return { ...state, unsafeDistance: 0 };
  if (!Number.isFinite(distance) || distance <= 0) return state;
  const accumulated = state.unsafeDistance + distance;
  const health = Math.max(0, state.health - Math.floor(accumulated / 80) * 10);
  return { ...state, health, unsafeDistance: accumulated % 80,
    combo: health < state.health ? 0 : state.combo,
    lastRemovalTime: health < state.health ? null : state.lastRemovalTime,
    status: health === 0 ? "health" : "playing" };
}

export function recordRemoval(state: ChallengeState, id: string, total: number): ChallengeState {
  if (state.status !== "playing" || state.removedIds.includes(id)) return state;
  const combo = state.lastRemovalTime !== null && state.elapsed - state.lastRemovalTime <= 5 ? state.combo + 1 : 1;
  const removedIds = [...state.removedIds, id];
  return { ...state, removedIds, combo, lastRemovalTime: state.elapsed,
    comboBonus: state.comboBonus + Math.min(30, (combo - 1) * 10),
    status: removedIds.length === total ? "success" : "playing" };
}

export function challengeScore(state: ChallengeState): number {
  const timeBonus = state.status === "success" ? 10 * Math.floor(state.remaining) : 0;
  return Math.max(0, state.removedIds.length * 100 + timeBonus + state.comboBonus - 5 * (state.initialHealth - state.health));
}

export function challengeGrade(state: ChallengeState, parScore: number): "S" | "A" | "B" | "C" | null {
  if (state.status !== "success") return null;
  const score = challengeScore(state);
  return score >= parScore * 1.2 ? "S" : score >= parScore ? "A" : score >= parScore * 0.8 ? "B" : "C";
}
