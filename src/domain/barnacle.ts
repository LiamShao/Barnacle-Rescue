export type BarnacleState = "intact" | "cracked" | "breaking" | "removed";

export type Barnacle = {
  id: string;
  hp: number;
  maxHp: number;
  state: BarnacleState;
};

export type DamageResult = {
  barnacle: Barnacle;
  startedBreaking: boolean;
};

export function createBarnacle(maxHp = 100): Barnacle {
  return { id: "starter-barnacle", hp: maxHp, maxHp, state: "intact" };
}

export function damageBarnacle(barnacle: Barnacle, amount: number): DamageResult {
  if (amount <= 0 || barnacle.state === "breaking" || barnacle.state === "removed") {
    return { barnacle, startedBreaking: false };
  }

  const hp = Math.max(0, barnacle.hp - amount);
  const state: BarnacleState = hp === 0 ? "breaking" : hp <= barnacle.maxHp / 2 ? "cracked" : "intact";

  return {
    barnacle: { ...barnacle, hp, state },
    startedBreaking: state === "breaking",
  };
}

export function finishDetachment(barnacle: Barnacle): Barnacle {
  return barnacle.state === "breaking" ? { ...barnacle, state: "removed" } : barnacle;
}
