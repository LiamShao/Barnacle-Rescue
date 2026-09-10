export type BarnacleState = "intact" | "cracked" | "breaking" | "removed";

export type Barnacle = {
  id: string;
  type: "normal" | "hard";
  x: number;
  y: number;
  size: number;
  hp: number;
  maxHp: number;
  state: BarnacleState;
};

export type DamageResult = {
  barnacle: Barnacle;
  startedBreaking: boolean;
};

export type BarnacleConfig = Pick<Barnacle, "id" | "type" | "x" | "y" | "size" | "maxHp">;

export function createBarnacle(config: BarnacleConfig): Barnacle {
  return { ...config, hp: config.maxHp, state: "intact" };
}

export function rescueProgress(barnacles: readonly Barnacle[]): number {
  if (barnacles.length === 0) return 0;
  return Math.round(100 * barnacles.filter((barnacle) => barnacle.state === "removed").length / barnacles.length);
}

export function isRescueComplete(barnacles: readonly Barnacle[]): boolean {
  return barnacles.length > 0 && barnacles.every((barnacle) => barnacle.state === "removed");
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
