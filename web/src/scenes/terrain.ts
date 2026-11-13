/** Proseduraalinen maasto: siniaaltojen summa + kolme tasaista laskeutumisalustaa (×1, ×2, ×3). */
import type { Planet } from "../data/planets";
import { rng } from "../core/util";

export interface Pad { x1: number; x2: number; y: number; mult: number }
export interface Terrain { h: Float32Array; pads: Pad[] }

export function generateTerrain(seed: number, p: Planet, W: number, H: number, easy: boolean): Terrain {
  const R = rng(seed);
  const h = new Float32Array(W + 1);
  const ph = [R() * 6, R() * 6, R() * 6];
  const ro = p.rough;
  for (let x = 0; x <= W; x++) {
    h[x] = H * 0.72
      + Math.sin(x * 0.02 + ph[0]) * 16 * ro
      + Math.sin(x * 0.055 + ph[1]) * 9 * ro
      + Math.sin(x * 0.13 + ph[2]) * 4 * ro
      + (R() - 0.5) * 1.5 * ro;
  }
  const widths = easy ? [32, 24, 18] : [26, 18, 13];
  const pads: Pad[] = [];
  for (let i = 0; i < 3; i++) {
    const w = widths[i];
    for (let tries = 0; tries < 60; tries++) {
      const x1 = 12 + Math.floor(R() * (W - 24 - w));
      const x2 = x1 + w;
      if (pads.some((q) => x1 < q.x2 + 14 && x2 > q.x1 - 14)) continue;
      let y = 0;
      for (let x = x1; x <= x2; x++) y += h[x];
      y = Math.round(y / (w + 1));
      for (let d = 1; d <= 8; d++) {
        const f = d / 9;
        if (x1 - d >= 0) h[x1 - d] = y + (h[x1 - d] - y) * f;
        if (x2 + d <= W) h[x2 + d] = y + (h[x2 + d] - y) * f;
      }
      for (let x = x1; x <= x2; x++) h[x] = y;
      pads.push({ x1, x2, y, mult: i + 1 });
      break;
    }
  }
  for (let x = 0; x <= W; x++) h[x] = Math.max(H * 0.42, Math.min(H - 8, h[x]));
  // pidä alustat tasaisina leikkauksen jälkeenkin
  for (const q of pads) { q.y = Math.max(H * 0.42, Math.min(H - 8, q.y)); for (let x = q.x1; x <= q.x2; x++) h[x] = q.y; }
  return { h, pads };
}
