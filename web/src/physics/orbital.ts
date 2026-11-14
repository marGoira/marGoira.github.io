/**
 * Transfer flight physics: a central body + planets on circular orbits (analytic);
 * the ship is integrated with the leapfrog method, which conserves energy well.
 */
import type { OrbitBody, OrbitSystem } from "./systems";

export interface BodyState extends OrbitBody {
  theta0: number;
}

export interface Vec { x: number; y: number }

export function bodyPos(b: BodyState, t: number): Vec {
  const th = b.theta0 + b.omega * t;
  return { x: b.r * Math.cos(th), y: b.r * Math.sin(th) };
}

export function bodyVel(b: BodyState, t: number): Vec {
  if (b.fixed) return { x: 0, y: 0 };
  const th = b.theta0 + b.omega * t;
  return { x: -b.omega * b.r * Math.sin(th), y: b.omega * b.r * Math.cos(th) };
}

/** Gravitational acceleration at point (x, y) at time t. */
export function gravity(sys: OrbitSystem, bodies: BodyState[], x: number, y: number, t: number): Vec {
  const r2 = x * x + y * y;
  const r = Math.sqrt(r2);
  const k = -sys.central.mu / (r2 * r);
  let ax = k * x, ay = k * y;
  for (const b of bodies) {
    if (b.mu === 0) continue;
    const p = bodyPos(b, t);
    const dx = x - p.x, dy = y - p.y;
    const d2 = dx * dx + dy * dy + 0.5; // softening prevents a singularity
    const kb = -b.mu / (d2 * Math.sqrt(d2));
    ax += kb * dx;
    ay += kb * dy;
  }
  return { x: ax, y: ay };
}

export interface ShipState { x: number; y: number; vx: number; vy: number }

/** One leapfrog step (kick–drift–kick). extra = engine acceleration. */
export function step(sys: OrbitSystem, bodies: BodyState[], s: ShipState, t: number, h: number, extra: Vec): void {
  let a = gravity(sys, bodies, s.x, s.y, t);
  s.vx += (a.x + extra.x) * h * 0.5;
  s.vy += (a.y + extra.y) * h * 0.5;
  s.x += s.vx * h;
  s.y += s.vy * h;
  a = gravity(sys, bodies, s.x, s.y, t + h);
  s.vx += (a.x + extra.x) * h * 0.5;
  s.vy += (a.y + extra.y) * h * 0.5;
}

/** Flight time of a Hohmann transfer from radius r1 to radius r2. */
export function hohmannTime(mu: number, r1: number, r2: number): number {
  const a = (r1 + r2) / 2;
  return Math.PI * Math.sqrt((a * a * a) / mu);
}

export interface Prediction {
  points: Vec[];
  closest?: { d: number; t: number; ship: Vec; target: Vec };
  impact: boolean;
}

/** Predicts the trajectory ahead with the engine off. */
export function predict(
  sys: OrbitSystem, bodies: BodyState[], ship: ShipState, t0: number, steps: number, h: number, target?: BodyState,
): Prediction {
  const s = { ...ship };
  const pts: Vec[] = [];
  let closest: Prediction["closest"];
  let impact = false;
  const zero = { x: 0, y: 0 };
  for (let i = 0; i < steps; i++) {
    const t = t0 + i * h;
    step(sys, bodies, s, t, h, zero);
    pts.push({ x: s.x, y: s.y });
    if (Math.hypot(s.x, s.y) < sys.central.radius) { impact = true; break; }
    if (target) {
      const p = bodyPos(target, t + h);
      const d = Math.hypot(s.x - p.x, s.y - p.y);
      if (!closest || d < closest.d) closest = { d, t: t + h, ship: { x: s.x, y: s.y }, target: p };
    }
  }
  return { points: pts, closest, impact };
}

/**
 * Sets the planets' starting phases so the target is well placed for a Hohmann
 * transfer when the ship burns prograde right away. A little randomness keeps flights varied.
 */
export function setupBodies(sys: OrbitSystem, targetId: string, shipTheta: number, shipR: number, rand: () => number, includeWormhole: boolean): BodyState[] {
  const out: BodyState[] = [];
  for (const b of sys.bodies) {
    if (b.id === "wormhole" && !includeWormhole) continue;
    let theta0 = rand() * Math.PI * 2;
    if ("bodyId" in sys.home && b.id === sys.home.bodyId) theta0 = shipTheta - 6 / b.r;
    if (b.id === targetId) {
      if (b.fixed) theta0 = shipTheta + Math.PI;
      else theta0 = shipTheta + Math.PI - b.omega * hohmannTime(sys.central.mu, shipR, b.r) + (rand() - 0.5) * 0.1;
    }
    out.push({ ...b, theta0 });
  }
  return out;
}
