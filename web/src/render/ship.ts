import { PALETTE, SPRITES } from "../data/ships";
import { flameColor } from "../state/stats";

/** Draws the ship as pixels. a = angle in radians, 0 = nose up. */
export function drawShip(
  ctx: CanvasRenderingContext2D, x: number, y: number, a: number, hull: number, flame: boolean, scale = 1,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.scale(scale, scale);
  if (flame) {
    const len = 3 + Math.random() * 5;
    ctx.fillStyle = flameColor();
    ctx.fillRect(-1.5, 4, 3, len);
    ctx.fillStyle = "#fff";
    ctx.fillRect(-0.5, 4, 1, len * 0.5);
  }
  const sprite = SPRITES[hull] ?? SPRITES[0];
  for (let r = 0; r < sprite.length; r++) {
    for (let c = 0; c < 9; c++) {
      const ch = sprite[r][c];
      if (ch === ".") continue;
      ctx.fillStyle = PALETTE[ch];
      ctx.fillRect(c - 4.5, r - 4, 1, 1);
    }
  }
  ctx.restore();
}

/** Star background: returns a list of [x, y, brightness]. */
export function makeStars(rand: () => number, n: number, w: number, h: number): [number, number, number][] {
  return Array.from({ length: n }, () => [(rand() * w) | 0, (rand() * h) | 0, rand()]);
}
