/** Per-planet backgrounds for the landing view. Add a new case for a new destination. */
import type { Planet } from "../data/planets";
import { rng } from "../core/util";

export function drawBackground(x: CanvasRenderingContext2D, p: Planet, W: number, H: number, stars: [number, number, number][], seed: number): void {
  x.fillStyle = p.sky;
  x.fillRect(0, 0, W, H);
  if (p.id === "mars" || p.id === "titan") {
    for (let y = 0; y < H; y += 4) {
      x.fillStyle = p.id === "mars" ? `rgba(207,106,62,${(y / H) * 0.25})` : `rgba(230,160,70,${(y / H) * 0.35})`;
      x.fillRect(0, y, W, 4);
    }
  }
  if (p.id !== "titan") {
    for (const [sx, sy, b] of stars) {
      x.fillStyle = b > 0.8 ? "#dfe4ff" : "#3a4066";
      x.fillRect(sx, sy, 1, 1);
    }
  }
  const disc = (cx: number, cy: number, r: number, c: string) => { x.beginPath(); x.fillStyle = c; x.arc(cx, cy, r, 0, Math.PI * 2); x.fill(); };
  switch (p.id) {
    case "moon":
      disc(262, 34, 9, "#3f7cff");
      x.fillStyle = "#5fd47a"; x.fillRect(258, 30, 4, 3); x.fillRect(263, 36, 3, 2);
      break;
    case "mars":
      disc(60, 30, 3, "#f1d9b0");
      break;
    case "europa":
      disc(250, 48, 34, "#c99a6a");
      x.fillStyle = "#9a6a44"; x.fillRect(217, 40, 66, 4); x.fillRect(220, 54, 60, 3);
      x.fillStyle = "#d7553a"; x.fillRect(258, 50, 6, 3);
      break;
    case "titan":
      disc(70, 40, 14, "rgba(224,200,138,.35)");
      break;
    case "exo":
      disc(60, 34, 6, "#ffd27a");
      disc(90, 24, 3, "#ff7aa8");
      break;
    case "ceres": {
      const R = rng(seed);
      x.fillStyle = "#5a5866";
      for (let i = 0; i < 6; i++) x.fillRect((R() * W) | 0, (R() * 80) | 0, 2, 2);
      break;
    }
  }
}
