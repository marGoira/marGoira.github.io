/** Ship stats are always derived from the state: hull + researched technologies. */
import type { Planet } from "../data/planets";
import { state } from "./gameState";

/** Landing pixel scale: 1 m/s² = 6 px/s² */
export const G_SCALE = 6;

export interface ShipStats {
  /** Landing engine acceleration, px/s² */
  thrust: number;
  /** Landing fuel tank */
  tank: number;
  /** Consumption, units/s */
  burn: number;
  /** Travel range: multiplied into the transfer flight's delta-v budget */
  range: number;
  /** Turn rate, rad/s */
  turn: number;
  predictor: boolean;
  oberth: boolean;
  assist: boolean;
  wormhole: boolean;
}

export const has = (id: string) => state.tech.includes(id);

export function stats(): ShipStats {
  const h = state.hull;
  let thrust = 34 + h * 6, tank = 100 + h * 25, burn = 12, range = 2, turn = 2.6;
  if (has("m1")) thrust *= 1.2;
  if (has("m2")) range += 3;
  if (has("m3")) { thrust *= 1.3; range += 4; }
  if (has("m4")) range += 6;
  if (has("p1")) tank *= 1.3;
  if (has("p2")) { burn *= 0.75; range += 2; }
  if (has("p3")) tank *= 1.5;
  if (has("p4")) { burn *= 0.6; range += 5; }
  if (has("f3")) turn *= 1.5;
  if (has("f4")) range += 3;
  return {
    thrust, tank, burn, range, turn,
    predictor: has("f1"),
    oberth: has("f2"),
    assist: has("f3") || state.easy,
    wormhole: has("f5"),
  };
}

/** Range the autopilot needs (reduced by the Oberth Effect). */
export const autopilotCost = (p: Planet) => +(p.dist * (stats().oberth ? 0.75 : 1)).toFixed(2);

export const isUnlocked = (p: Planet) => !p.wormhole || stats().wormhole;

/** Whether the range is enough for the autopilot. */
export const autopilotReach = (p: Planet) => isUnlocked(p) && autopilotCost(p) <= stats().range + 1e-6;

export const planetName = (p: Planet) => (p.id === "exo" && state.exoName ? state.exoName : p.name);

export function flameColor(): string {
  if (has("p4")) return "#efe0ff";
  if (has("m3")) return "#ff5ad1";
  if (has("m2")) return "#6fd3ff";
  return "#ffa03a";
}

export function engineName(): string {
  if (has("p4")) return "antimatter";
  if (has("m3")) return "fusion";
  if (has("m2")) return "ion";
  return "chemical";
}
