/**
 * Landing destinations. To add a new one:
 * 1) add a row here, 2) add its orbital body to physics/systems.ts,
 * 3) optionally add a background to scenes/landerBackgrounds.ts.
 */
export type PlanetId = "moon" | "mars" | "ceres" | "europa" | "titan" | "exo";

export interface Mission {
  title: string;
  text: string;
  credits: number;
  research: number;
}

export interface Planet {
  id: PlanetId;
  name: string;
  /** Surface gravity, m/s² */
  g: number;
  /** Recommended range for the autopilot (and a difficulty gauge). */
  dist: number;
  /** Whether it requires Wormhole Theory. */
  wormhole?: boolean;
  /** Which system the transfer flight happens in, and which body is the target there. */
  system: "earth" | "sun";
  orbitTarget: string;
  /** Terrain roughness, 0.5 = gentle, 1.6 = steep */
  rough: number;
  /** Wind strength (px/s²) during landing */
  wind: number;
  /** Air drag (0 = vacuum) */
  drag: number;
  sky: string;
  ground: string;
  top: string;
  fact: string;
  mission: Mission;
}

export const PLANETS: Planet[] = [
  {
    id: "moon", name: "Moon", g: 1.62, dist: 1, system: "earth", orbitTarget: "moon",
    rough: 0.8, wind: 0, drag: 0, sky: "#04050b", ground: "#77736b", top: "#b9b4a8",
    fact: "The Moon's gravity is about one sixth of Earth's, so the ship hovers for a long time.",
    mission: { title: "South Pole Base", text: "Deliver oxygen tanks to the lunar research station.", credits: 60, research: 25 },
  },
  {
    id: "mars", name: "Mars", g: 3.71, dist: 3, system: "sun", orbitTarget: "mars",
    rough: 1.1, wind: 9, drag: 0.04, sky: "#2b140e", ground: "#8e3c22", top: "#cf6a3e",
    fact: "Mars has the tallest volcano in the solar system, Olympus Mons. The thin atmosphere and gusty wind toss the ship around.",
    mission: { title: "Rover Spare Parts", text: "Bring a new wheel to a stranded research rover.", credits: 120, research: 50 },
  },
  {
    id: "ceres", name: "Ceres", g: 0.28, dist: 5, system: "sun", orbitTarget: "ceres",
    rough: 1.6, wind: 0, drag: 0, sky: "#030308", ground: "#4f4d55", top: "#8d8a96",
    fact: "Ceres is the largest object in the asteroid belt and a dwarf planet. Gravity is so weak that too much thrust sends the ship flying away.",
    mission: { title: "Salt Spot Sample", text: "Collect a sample from the crater's bright salt deposits.", credits: 160, research: 70 },
  },
  {
    id: "europa", name: "Europa", g: 1.31, dist: 8, system: "sun", orbitTarget: "jupiter",
    rough: 0.6, wind: 0, drag: 0, sky: "#05070f", ground: "#7f95a8", top: "#dbe9f2",
    fact: "Beneath the ice shell of Jupiter's moon Europa there is probably an ocean holding more water than all of Earth's seas.",
    mission: { title: "Ice Drilling", text: "Set the drilling rig down next to a crack in the ice shell.", credits: 250, research: 110 },
  },
  {
    id: "titan", name: "Titan", g: 1.35, dist: 12, system: "sun", orbitTarget: "saturn",
    rough: 0.9, wind: 4, drag: 0.55, sky: "#3a250c", ground: "#6d4a1e", top: "#b7843d",
    fact: "Saturn's moon Titan is the only moon with a thick atmosphere. Its surface has methane lakes and methane rain.",
    mission: { title: "Methane Lake Buoy", text: "Install a measurement buoy on the shore of Kraken Mare.", credits: 350, research: 150 },
  },
  {
    id: "exo", name: "Aurora b", g: 2.4, dist: 6, wormhole: true, system: "sun", orbitTarget: "wormhole",
    rough: 1.3, wind: 12, drag: 0.08, sky: "#160a26", ground: "#2f6b5a", top: "#7fe3b8",
    fact: "A fictional planet in another galaxy, orbiting two suns. Nobody has ever been here.",
    mission: { title: "First Contact", text: "Land and plant Earth's flag on an alien world.", credits: 600, research: 250 },
  },
];

export const planetById = (id: string): Planet => {
  const p = PLANETS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown destination ${id}`);
  return p;
};
