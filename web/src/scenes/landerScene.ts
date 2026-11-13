/** Laskeutuminen sivukuvantona: painovoima, työntö, tuuli ja ilmanvastus. */
import { planetById, type Planet } from "../data/planets";
import { techById, TECH } from "../data/tech";
import { $, canvas2d, fmt, fmt1, rng } from "../core/util";
import { input } from "../core/input";
import { commit, state } from "../state/gameState";
import { flameColor, G_SCALE, planetName, stats, type ShipStats } from "../state/stats";
import { drawShip, makeStars } from "../render/ship";
import { drawBackground } from "./landerBackgrounds";
import { generateTerrain, type Terrain } from "./terrain";
import { showResult, type Particle, type Scene } from "./scene";

const W = 320, H = 200;

interface Lander {
  p: Planet; st: ShipStats; seed: number; terr: Terrain; stars: [number, number, number][];
  x: number; y: number; vx: number; vy: number; a: number;
  fuel: number; thr: boolean; wind: number; t: number;
  state: "fly" | "landed" | "crashed";
  parts: Particle[];
}

export interface LanderCallbacks {
  toMap: () => void;
}

export class LanderScene implements Scene {
  private ctx = canvas2d("landc");
  private L: Lander | null = null;

  constructor(private cb: LanderCallbacks) {}

  start(planetId: string): void {
    const p = planetById(planetId);
    const st = stats();
    const seed = (Math.random() * 1e9) | 0;
    const R = rng(seed);
    this.L = {
      p, st, seed,
      terr: generateTerrain(seed, p, W, H, state.easy),
      stars: makeStars(R, 60, W, H * 0.6),
      x: 40 + R() * 240, y: 22, vx: (R() - 0.5) * 24, vy: 4, a: 0,
      fuel: st.tank, thr: false, wind: 0, t: 0, state: "fly", parts: [],
    };
    $("landTitle").textContent = `Laskeutuminen · ${planetName(p)}`;
    $("result").hidden = true;
  }

  private limits() {
    return state.easy ? { vy: 30, vx: 16, a: 0.45 } : { vy: 16, vx: 9, a: 0.22 };
  }
  private gravity(p: Planet) {
    return p.g * G_SCALE * (state.easy ? 0.75 : 1);
  }
  private gh(x: number): number {
    const h = this.L!.terr.h;
    return h[Math.max(0, Math.min(W, Math.round(x)))];
  }
  private local(lx: number, ly: number): [number, number] {
    const L = this.L!;
    const c = Math.cos(L.a), s = Math.sin(L.a);
    return [L.x + lx * c - ly * s, L.y + lx * s + ly * c];
  }

  update(dt: number): void {
    const L = this.L;
    if (!L) return;
    const { st, p } = L;
    L.t += dt;
    if (L.state === "fly") {
      const rot = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      L.a += rot * st.turn * dt;
      if (st.assist && !rot) L.a *= Math.max(0, 1 - 3 * dt);
      L.a = Math.max(-1.6, Math.min(1.6, L.a));
      let ax = 0, ay = this.gravity(p);
      L.thr = input.thrust && L.fuel > 0;
      if (L.thr) {
        ax += Math.sin(L.a) * st.thrust;
        ay -= Math.cos(L.a) * st.thrust;
        L.fuel = Math.max(0, L.fuel - st.burn * dt);
        const [ex, ey] = this.local(0, 5);
        for (let i = 0; i < 2; i++) {
          L.parts.push({ x: ex, y: ey, vx: -Math.sin(L.a) * 40 + (Math.random() - 0.5) * 20, vy: Math.cos(L.a) * 40 + (Math.random() - 0.5) * 10, life: 0.35, c: flameColor() });
        }
      }
      L.wind = p.wind * (0.6 * Math.sin(L.t * 0.5 + (L.seed % 7)) + 0.4 * Math.sin(L.t * 1.7 + 1));
      ax += L.wind;
      L.vx += ax * dt;
      L.vy += ay * dt;
      if (p.drag) { const k = Math.max(0, 1 - p.drag * dt); L.vx *= k; L.vy *= k; }
      L.x += L.vx * dt;
      L.y += L.vy * dt;
      if (L.x < 5) { L.x = 5; L.vx = Math.abs(L.vx) * 0.3; }
      if (L.x > W - 5) { L.x = W - 5; L.vx = -Math.abs(L.vx) * 0.3; }
      if (L.y < -60) { L.y = -60; L.vy = Math.max(0, L.vy); }
      const pts = [this.local(-3.5, 4), this.local(3.5, 4), this.local(-4, 1), this.local(4, 1), this.local(0, -4)];
      if (pts.some(([x, y]) => y >= this.gh(x))) this.touchdown(pts);
    }
    for (const q of L.parts) {
      q.x += q.vx * dt; q.y += q.vy * dt; q.vy += (q.g ?? 0) * dt; q.life -= dt;
      const gy = this.gh(q.x);
      if (q.y > gy) { q.y = gy; q.vy *= -0.3; q.vx *= 0.6; }
    }
    L.parts = L.parts.filter((q) => q.life > 0);
  }

  private touchdown(pts: [number, number][]): void {
    const L = this.L!;
    const lim = this.limits();
    const [fl, fr] = pts;
    const minx = Math.min(fl[0], fr[0]), maxx = Math.max(fl[0], fr[0]);
    const pad = L.terr.pads.find((q) => minx >= q.x1 - 1 && maxx <= q.x2 + 1);
    const why: string[] = [];
    if (!pad) why.push("Et osunut tasaiselle alustalle.");
    if (L.vy > lim.vy) why.push(`Pystynopeus ${fmt1(L.vy / G_SCALE)} m/s, raja ${fmt1(lim.vy / G_SCALE)}.`);
    if (Math.abs(L.vx) > lim.vx) why.push(`Sivuttaisnopeus liian suuri (${fmt1(Math.abs(L.vx) / G_SCALE)} m/s).`);
    if (Math.abs(L.a) > lim.a) why.push(`Alus oli kallellaan ${Math.round(Math.abs(L.a) * 57.3)}°.`);
    const p = L.p;
    let html: string;
    if (!why.length && pad) {
      L.state = "landed";
      L.y = pad.y - 4; L.a = 0; L.vx = L.vy = 0;
      const first = !state.visits[p.id];
      const k = first ? 1 : 0.5;
      const bonus = Math.round((L.fuel / L.st.tank) * 20);
      const cr = Math.round(p.mission.credits * k * pad.mult) + bonus;
      const tp = Math.round(p.mission.research * k * pad.mult);
      commit((s) => { s.credits += cr; s.research += tp; s.visits[p.id] = (s.visits[p.id] ?? 0) + 1; });
      for (let i = 0; i < 24; i++) L.parts.push({ x: L.x, y: pad.y, vx: (Math.random() - 0.5) * 50, vy: -Math.random() * 20, g: 30, life: 0.8, c: p.top });
      const affordable = TECH.filter((t) => !state.tech.includes(t.id) && t.requires.every((r) => state.tech.includes(r)) && state.research >= t.cost);
      html = `<span class="label ok">${first ? "Tehtävä suoritettu" : "Rutiinilento onnistui"}</span><h2>Kotka on laskeutunut</h2>
        <dl class="kv"><dt>Alusta</dt><dd>×${pad.mult}</dd>
        <dt>Krediitit</dt><dd class="amber">+${fmt(cr)} KR (polttoainebonus ${bonus})</dd>
        <dt>Tutkimus</dt><dd class="cyan">+${fmt(tp)} TP</dd></dl>
        ${affordable.length ? `<p class="fact">Sinulla on varaa tutkia: ${affordable.map((t) => techById(t.id).name).join(", ")}.</p>` : ""}`;
    } else {
      L.state = "crashed";
      const cols = ["#ffb347", "#ff6b4a", "#fff", "#e8e4d6"];
      for (let i = 0; i < 50; i++) L.parts.push({ x: L.x, y: L.y, vx: (Math.random() - 0.5) * 110, vy: -Math.random() * 90, g: this.gravity(p), life: 1 + Math.random(), c: cols[i % 4] });
      html = `<span class="label warn">Alus tuhoutui</span><h2>Lennonjohto menetti yhteyden</h2><p class="fact">${why.join(" ")}</p><p class="fact">Alus oli vakuutettu. Yritä uudestaan hitaammin.</p>`;
    }
    window.setTimeout(() => {
      showResult($("result"), html, [
        { label: "Uusi laskeutuminen", onClick: () => this.start(p.id) },
        { label: "Tähtikartalle", ghost: true, onClick: () => this.cb.toMap() },
      ]);
    }, L.state === "landed" ? 700 : 1100);
  }

  draw(): void {
    const L = this.L;
    if (!L) return;
    const x = this.ctx, p = L.p;
    drawBackground(x, p, W, H, L.stars, L.seed);
    const h = L.terr.h;
    for (let i = 0; i < W; i++) {
      const y = Math.round(h[i]);
      x.fillStyle = p.ground; x.fillRect(i, y, 1, H - y);
      x.fillStyle = p.top; x.fillRect(i, y, 1, 2);
    }
    x.font = '6px "Press Start 2P"';
    x.textAlign = "center";
    const blink = Math.floor(L.t * 3) % 2;
    for (const q of L.terr.pads) {
      x.fillStyle = q.mult === 3 ? "#ffb347" : q.mult === 2 ? "#6fe3ff" : "#e8e4d6";
      x.fillRect(q.x1, q.y, q.x2 - q.x1 + 1, 2);
      x.fillStyle = blink ? "#ff6b4a" : "#5a2020";
      x.fillRect(q.x1, q.y - 2, 1, 2); x.fillRect(q.x2, q.y - 2, 1, 2);
      x.fillStyle = "#e8e4d6";
      x.fillText("×" + q.mult, (q.x1 + q.x2) / 2, q.y + 11);
    }
    if (L.st.predictor && L.state === "fly") {
      let px = L.x, py = L.y, vx = L.vx, vy = L.vy;
      const g = this.gravity(p);
      x.fillStyle = "rgba(111,227,255,.7)";
      for (let i = 0; i < 90; i++) {
        vy += g / 30; vx += L.wind / 30; px += vx / 30; py += vy / 30;
        if (py >= this.gh(px)) break;
        if (i % 4 === 0) x.fillRect(px | 0, py | 0, 1, 1);
      }
    }
    for (const q of L.parts) { x.fillStyle = q.c; x.fillRect(q.x | 0, q.y | 0, 1, 1); }
    if (L.state !== "crashed") drawShip(x, L.x, L.y, L.a, state.hull, L.thr && L.state === "fly");
    if (L.y < 0 && L.state === "fly") { x.fillStyle = "#ffb347"; x.fillRect(L.x - 1, 2, 3, 2); }

    const lim = this.limits(), f = L.fuel / L.st.tank;
    $("hud").innerHTML = `<span>POLTTOAINE<span class="fuelbar"><i style="width:${Math.max(0, f * 58)}px;${f < 0.2 ? "background:var(--bad)" : ""}"></i></span></span>
      <span class="${L.vy > lim.vy ? "bad" : "good"}">↓ ${fmt1(Math.max(0, L.vy) / G_SCALE)} m/s</span>
      <span class="${Math.abs(L.vx) > lim.vx ? "bad" : "good"}">↔ ${fmt1(Math.abs(L.vx) / G_SCALE)}</span>
      <span class="${Math.abs(L.a) > lim.a ? "bad" : "good"}">∠ ${Math.round(Math.abs(L.a) * 57.3)}°</span>
      ${p.wind ? `<span>TUULI ${L.wind > 0 ? "→" : "←"}</span>` : ""}`;
  }
}
