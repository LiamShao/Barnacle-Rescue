export type AnimalMood = "sad" | "neutral" | "relaxed" | "happy";
export type AnimalReaction = "idle" | "relief" | "hurt" | "celebrate";
export type AnimalState = {
  mood: AnimalMood;
  reaction: AnimalReaction;
  elapsed: number;
};

export const RELIEF_SECONDS = 1.2;
export const HURT_SECONDS = 0.5;
export const CELEBRATION_SECONDS = 2;

export function deriveMood(progress: number): AnimalMood {
  const value = Number.isNaN(progress) ? 0 : Math.max(0, Math.min(100, progress));
  return value < 25 ? "sad" : value < 60 ? "neutral" : value < 90 ? "relaxed" : "happy";
}

export function createAnimal(): AnimalState {
  return { mood: "sad", reaction: "idle", elapsed: 0 };
}

export function reactAnimal(state: AnimalState, reaction: Exclude<AnimalReaction, "idle">): AnimalState {
  if (state.reaction === "celebrate" || (state.reaction === "hurt" && reaction === "relief")) return state;
  return { ...state, reaction, elapsed: 0 };
}

export function animalAfterRemoval(state: AnimalState, progress: number): AnimalState {
  if (state.reaction === "celebrate") return state;
  return reactAnimal({ ...state, mood: deriveMood(progress) }, progress >= 100 ? "celebrate" : "relief");
}

export function advanceAnimal(state: AnimalState, seconds: number): AnimalState {
  if (state.reaction === "idle" || !Number.isFinite(seconds) || seconds <= 0) return state;
  const elapsed = state.elapsed + seconds;
  const duration = state.reaction === "relief" ? RELIEF_SECONDS : state.reaction === "hurt" ? HURT_SECONDS : CELEBRATION_SECONDS;
  if (elapsed >= duration && state.reaction !== "celebrate") return { ...state, reaction: "idle", elapsed: 0 };
  return { ...state, elapsed: Math.min(elapsed, duration) };
}

export function celebrationFinished(state: AnimalState): boolean {
  return state.reaction === "celebrate" && state.elapsed >= CELEBRATION_SECONDS;
}

export function animalDescription(state: AnimalState): string {
  if (state.reaction === "celebrate") return "The turtle is celebrating!";
  if (state.reaction === "relief") return "A little relief!";
  if (state.reaction === "hurt") return "The turtle flinches.";
  return { sad: "The turtle feels uncomfortable.", neutral: "The turtle is feeling better.", relaxed: "The turtle feels relaxed.", happy: "The turtle feels happy." }[state.mood];
}
