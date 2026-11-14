/**
 * Tech tree. Effects are calculated in state/stats.ts, so a new technology =
 * a row here + its effect in the stats() function.
 */
export type Branch = "Engines" | "Fuels" | "Physics";

export interface Tech {
  id: string;
  branch: Branch;
  name: string;
  desc: string;
  effect: string;
  cost: number;
  requires: string[];
}

export const BRANCHES: Branch[] = ["Engines", "Fuels", "Physics"];

export const TECH: Tech[] = [
  { id: "m1", branch: "Engines", name: "Bell Nozzle", desc: "A better-shaped nozzle expels the exhaust more efficiently.", effect: "Thrust +20%", cost: 20, requires: [] },
  { id: "m2", branch: "Engines", name: "Ion Drive", desc: "Electrically accelerated ions: weak thrust, huge endurance on long trips.", effect: "Range +3", cost: 50, requires: ["m1"] },
  { id: "m3", branch: "Engines", name: "Fusion Pulse", desc: "Tiny fusion explosions push the ship like a giant engine.", effect: "Thrust +30%, range +4", cost: 120, requires: ["m2", "p2"] },
  { id: "m4", branch: "Engines", name: "Quantum Resonator", desc: "A fictional drive that draws energy from vacuum fluctuations.", effect: "Range +6", cost: 250, requires: ["m3"] },

  { id: "p1", branch: "Fuels", name: "Methane and Oxygen", desc: "A cleaner-burning mix that could one day be produced on Mars.", effect: "Tank +30%", cost: 20, requires: [] },
  { id: "p2", branch: "Fuels", name: "Liquid Hydrogen", desc: "The lightest fuel: the best efficiency of the chemical options.", effect: "Consumption −25%, range +2", cost: 60, requires: ["p1"] },
  { id: "p3", branch: "Fuels", name: "Metallic Hydrogen", desc: "Hydrogen compressed under enormous pressure stores many times more energy.", effect: "Tank +50%", cost: 140, requires: ["p2"] },
  { id: "p4", branch: "Fuels", name: "Antimatter Catalyst", desc: "A speck of antimatter triggers a reaction that burns almost everything.", effect: "Consumption −40%, range +5", cost: 260, requires: ["p3"] },

  { id: "f1", branch: "Physics", name: "Newtonian Mechanics", desc: "Once motion is understood, a trajectory can be calculated in advance.", effect: "Long trajectory prediction and closest approach", cost: 15, requires: [] },
  { id: "f2", branch: "Physics", name: "Oberth Effect", desc: "Burning deep in a gravity well, at high speed, yields more kinetic energy.", effect: "Burns near a planet −40%, autopilot −25% range", cost: 50, requires: ["f1"] },
  { id: "f3", branch: "Physics", name: "Gyro Stabilizer", desc: "Gyroscopes keep the ship upright when you let go of the controls.", effect: "Automatic levelling, turning +50%", cost: 80, requires: ["f1"] },
  { id: "f4", branch: "Physics", name: "Spacetime Curvature", desc: "Einstein's theory: mass bends space, and the curves can be cut short.", effect: "Range +3", cost: 150, requires: ["f2"] },
  { id: "f5", branch: "Physics", name: "Wormhole Theory", desc: "Two distant points can be joined by a tunnel. Is there enough energy to open it?", effect: "Opens a wormhole to another galaxy", cost: 300, requires: ["f4", "m3"] },
];

export const techById = (id: string): Tech => {
  const t = TECH.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown technology ${id}`);
  return t;
};
