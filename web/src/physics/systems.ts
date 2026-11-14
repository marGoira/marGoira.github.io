/**
 * The transfer flight "solar systems". The scale is gameplay-driven, not realistic:
 * unit ≈ pixel at the closest zoom, time in seconds.
 *
 * mu = gravitational parameter (G·M). Circular orbit speed v = √(mu / r).
 */
export interface OrbitBody {
  id: string;
  name: string;
  /** Orbit radius from the central body */
  r: number;
  /** Angular velocity (rad/s), computed automatically; 0 = stationary (wormhole) */
  omega: number;
  mu: number;
  radius: number;
  /** Capture radius: inside this, slowly enough = in orbit */
  capR: number;
  color: string;
  ring?: boolean;
  fixed?: boolean;
}

export interface OrbitSystem {
  id: "sun" | "earth";
  central: { name: string; mu: number; radius: number; color: string };
  bodies: OrbitBody[];
  /** The ship's starting orbit: home planet (solar system) or parking orbit (Earth system) */
  home: { bodyId: string } | { parkingR: number };
  /** Range × this = delta-v budget in this system */
  dvPerRange: number;
  /** Cruise engine acceleration on the base ship (units/s²) */
  accel: number;
  /** Maximum relative speed for capture */
  vCapture: number;
  zooms: number[];
  defaultZoom: number;
  /** Predictor time step and step count (base / with Newtonian Mechanics) */
  predict: { h: number; base: number; full: number };
  /** Beyond this distance the ship is considered lost */
  escapeR: number;
}

const circ = (mu: number, r: number) => Math.sqrt(mu / (r * r * r));

const SUN_MU = 10966; // one Earth orbit ≈ 60 s

function sunSystem(): OrbitSystem {
  const b = (id: string, name: string, r: number, mu: number, radius: number, capR: number, color: string, extra: Partial<OrbitBody> = {}): OrbitBody =>
    ({ id, name, r, omega: circ(SUN_MU, r), mu, radius, capR, color, ...extra });
  return {
    id: "sun",
    central: { name: "Sun", mu: SUN_MU, radius: 12, color: "#ffcf4a" },
    bodies: [
      b("earth", "Earth", 100, 0.5, 3, 0, "#3f7cff"),
      b("mars", "Mars", 152, 0.35, 2.5, 8, "#cf6a3e"),
      b("ceres", "Ceres", 277, 0.03, 1.5, 6, "#8d8a96"),
      b("jupiter", "Jupiter", 520, 30, 7, 28, "#c99a6a"),
      b("saturn", "Saturn", 950, 12, 6, 24, "#e0c88a", { ring: true }),
      b("wormhole", "Wormhole", 420, 0, 4, 12, "#b48cff", { fixed: true, omega: 0 }),
    ],
    home: { bodyId: "earth" },
    dvPerRange: 0.5,
    accel: 0.6,
    vCapture: 1.3,
    zooms: [0.06, 0.12, 0.25, 0.5, 1, 2, 4],
    defaultZoom: 3,
    predict: { h: 1, base: 50, full: 450 },
    escapeR: 1700,
  };
}

const EARTH_MU = 5330; // one Moon orbit ≈ 40 s

function earthSystem(): OrbitSystem {
  return {
    id: "earth",
    central: { name: "Earth", mu: EARTH_MU, radius: 6, color: "#3f7cff" },
    bodies: [
      { id: "moon", name: "Moon", r: 60, omega: circ(EARTH_MU, 60), mu: 66, radius: 1.7, capR: 9, color: "#b9b4a8" },
    ],
    home: { parkingR: 20 },
    dvPerRange: 3.5,
    accel: 8,
    vCapture: 4.5,
    zooms: [0.5, 1, 2, 4, 8],
    defaultZoom: 2,
    predict: { h: 0.05, base: 100, full: 400 },
    escapeR: 420,
  };
}

export function getSystem(id: "sun" | "earth"): OrbitSystem {
  return id === "sun" ? sunSystem() : earthSystem();
}
