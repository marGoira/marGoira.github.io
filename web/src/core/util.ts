/** Yleiset apufunktiot: satunnaisluvut, muotoilu ja DOM. */

/** Siemenellinen satunnaislukugeneraattori (mulberry32). Sama siemen = sama maasto. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const fmt = (n: number) => Math.round(n).toLocaleString("fi-FI");
export const fmt1 = (n: number) => (Math.round(n * 100) / 100).toLocaleString("fi-FI");

export function $<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Elementtiä #${id} ei löydy`);
  return el as T;
}

export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

let toastTimer: number | undefined;
export function toast(msg: string): void {
  const t = $("toast");
  t.textContent = msg;
  t.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (t.hidden = true), 2600);
}

export function canvas2d(id: string): CanvasRenderingContext2D {
  const c = $<HTMLCanvasElement>(id);
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D ei ole käytettävissä");
  ctx.imageSmoothingEnabled = false;
  return ctx;
}
