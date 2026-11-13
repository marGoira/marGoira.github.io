/**
 * Matkalento ylhäältä päin: aluksella on delta-v-budjetti (kantama × järjestelmän kerroin),
 * planeetat liikkuvat radoillaan ja niiden painovoima vaikuttaa alukseen (painovoimalinko!).
 * Tavoite: saavu kohteen kaappaussäteen sisään riittävän pienellä suhteellisella nopeudella.
 */
import { planetById, type Planet } from "../data/planets";
import { $, canvas2d, clamp, fmt, fmt1, rng } from "../core/util";
import { input } from "../core/input";
import { commit, state } from "../state/gameState";
import { planetName, stats, type ShipStats } from "../state/stats";
import { drawShip, makeStars } from "../render/ship";
import { getSystem, type OrbitSystem } from "../physics/systems";
import { bodyPos, bodyVel, predict, setupBodies, step, type BodyState, type Prediction, type ShipState, type Vec } from "../physics/orbital";
import { showResult, type Particle, type Scene } from "./scene";

const W = 320, H = 200;
const WARPS = [1, 4, 16, 64];
const TAU = Math.PI * 2;
const wrapAngle = (a: number) => ((a + Math.PI) % TAU + TAU) % TAU - Math.PI;

export interface OrbitCallbacks {
  toMap: () => void;
  toLander: (planetId: string) => void;
}

type FlightState = "fly" | "captured" | "crashed" | "lost";

export class OrbitScene implements Scene {
  private ctx = canvas2d("orbitc");
  private sys!: OrbitSystem;
  private bodies: BodyState[] = [];
  private target!: BodyState;
  private planet!: Planet;
  private st!: ShipStats;
  private ship: ShipState = { x: 0, y: 0, vx: 0, vy: 0 };
  private heading = 0;
  private t = 0;
  private dvMax = 1;
  private dvLeft = 1;
  private warpIdx = 0;
  private zoomIdx = 0;
  private flight: FlightState = "fly";
  private thrusting = false;
  private pred: Prediction | null = null;
  private stars: [number, number, number][] = [];
  private parts: Particle[] = [];
  private seed = 0;
  /** Kello käynnistyy vasta ensimmäisestä poltosta tai aikakiihdytyksestä, jotta lähtö ei karkaa. */
  private clockRunning = false;

  constructor(private cb: OrbitCallbacks) {}

  get warp() { return WARPS[this.warpIdx]; }

  start(planetId: string): void {
    this.planet = planetById(planetId);
    this.sys = getSystem(this.planet.system);
    this.st = stats();
    this.seed = (Math.random() * 1e9) | 0;
    const R = rng(this.seed);
    const home = this.sys.home;
    const shipR = "bodyId" in home ? this.sys.bodies.find((b) => b.id === home.bodyId)!.r : home.parkingR;
    const shipTheta = R() * TAU;
    this.bodies = setupBodies(this.sys, this.planet.orbitTarget, shipTheta, shipR, R, this.planet.id === "exo");
    this.target = this.bodies.find((b) => b.id === this.planet.orbitTarget)!;
    const v = Math.sqrt(this.sys.central.mu / shipR);
    this.ship = { x: shipR * Math.cos(shipTheta), y: shipR * Math.sin(shipTheta), vx: -v * Math.sin(shipTheta), vy: v * Math.cos(shipTheta) };
    this.heading = Math.atan2(this.ship.vx, -this.ship.vy);
    this.dvMax = this.st.range * this.sys.dvPerRange * (state.easy ? 1.5 : 1);
    this.dvLeft = this.dvMax;
    this.t = 0;
    this.warpIdx = 0;
    this.zoomIdx = this.sys.defaultZoom;
    this.flight = "fly";
    this.clockRunning = false;
    this.parts = [];
    this.stars = makeStars(R, 70, W, H);
    $("orbitTitle").textContent = `Matkalento · ${planetName(this.planet)}`;
    $("orbitResult").hidden = true;
    this.updateWarpLabel();
  }

  /* ---- ohjaimet ---- */
  cycleWarp(): void { this.clockRunning = true; this.warpIdx = (this.warpIdx + 1) % WARPS.length; this.updateWarpLabel(); }
  zoom(dir: 1 | -1): void { this.zoomIdx = clamp(this.zoomIdx + dir, 0, this.sys.zooms.length - 1); }
  private updateWarpLabel(): void { $("oWarp").textContent = `AIKA ×${this.warp}`; }

  private captureR() { return this.target.capR * (state.easy ? 1.5 : 1); }
  private vCap() { return this.sys.vCapture * (state.easy ? 2 : 1); }

  private targetRel(): { d: number; rel: number; pos: Vec } {
    const pos = bodyPos(this.target, this.t);
    const vel = bodyVel(this.target, this.t);
    return {
      d: Math.hypot(this.ship.x - pos.x, this.ship.y - pos.y),
      rel: Math.hypot(this.ship.vx - vel.x, this.ship.vy - vel.y),
      pos,
    };
  }

  /** Viitekehys MYÖTÄ/VASTA-napeille: kohde, jos ollaan lähellä, muuten keskuskappale. */
  private refVelocity(): { v: Vec; name: string } {
    const { d } = this.targetRel();
    if (!this.target.fixed && d < this.captureR() * 4) return { v: bodyVel(this.target, this.t), name: this.target.name };
    return { v: { x: 0, y: 0 }, name: this.sys.central.name };
  }

  private nearGravityWell(): boolean {
    if (Math.hypot(this.ship.x, this.ship.y) < this.sys.central.radius * 4) return true;
    return this.bodies.some((b) => {
      if (b.mu < 1) return false;
      const p = bodyPos(b, this.t);
      return Math.hypot(this.ship.x - p.x, this.ship.y - p.y) < b.capR * 2;
    });
  }

  update(dt: number): void {
    if (this.flight !== "fly") { this.updateParticles(dt); return; }
    const st = this.st;

    // Kääntö: käsin tai automaattisesti myötä/vastasuuntaan
    const rot = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (rot) this.heading += rot * st.turn * dt;
    else if (input.pro || input.retro) {
      const ref = this.refVelocity().v;
      const dx = this.ship.vx - ref.x, dy = this.ship.vy - ref.y;
      let want = Math.atan2(dx, -dy);
      if (input.retro) want += Math.PI;
      const diff = wrapAngle(want - this.heading);
      this.heading += clamp(diff, -st.turn * 1.5 * dt, st.turn * 1.5 * dt);
    }
    this.heading = wrapAngle(this.heading);

    this.thrusting = input.thrust && this.dvLeft > 0;
    if (this.thrusting) this.clockRunning = true;
    if (this.thrusting && this.warp > 1) { this.warpIdx = 0; this.updateWarpLabel(); }
    if (!this.clockRunning) {
      const steps0 = st.predictor ? this.sys.predict.full : this.sys.predict.base;
      this.pred = predict(this.sys, this.bodies, this.ship, this.t, steps0, this.sys.predict.h, this.target);
      return;
    }

    // Hidasta aikaa automaattisesti kohteen lähellä
    const near = this.targetRel().d < this.captureR() * 3;
    if (near && this.warp > 4) { this.warpIdx = 1; this.updateWarpLabel(); }

    const accel = this.sys.accel * (st.thrust / 34);
    const n = Math.max(2, this.warp * 2);
    const h = (dt * this.warp) / n;
    const oberth = st.oberth && this.nearGravityWell() ? 0.6 : 1;
    for (let i = 0; i < n; i++) {
      let extra: Vec = { x: 0, y: 0 };
      if (this.thrusting) {
        extra = { x: Math.sin(this.heading) * accel, y: -Math.cos(this.heading) * accel };
        this.dvLeft -= accel * h * oberth;
        if (this.dvLeft <= 0) { this.dvLeft = 0; this.thrusting = false; }
      }
      step(this.sys, this.bodies, this.ship, this.t, h, extra);
      this.t += h;
      if (this.checkEvents()) break;
    }

    const steps = st.predictor ? this.sys.predict.full : this.sys.predict.base;
    this.pred = predict(this.sys, this.bodies, this.ship, this.t, steps, this.sys.predict.h, this.target);
    this.updateParticles(dt);
  }

  /** Palauttaa true, jos lento päättyi. */
  private checkEvents(): boolean {
    const s = this.ship;
    const r = Math.hypot(s.x, s.y);
    if (r < this.sys.central.radius) return this.crash(`Alus syöksyi kohti kappaletta ${this.sys.central.name}.`);
    if (r > this.sys.escapeR) return this.end("lost");
    const { d, rel } = this.targetRel();
    if (d < this.captureR()) {
      if (this.target.fixed) return this.arrive(true);
      if (rel < this.vCap()) return this.arrive(false);
    }
    for (const b of this.bodies) {
      if (b.fixed) continue;
      const p = bodyPos(b, this.t);
      if (Math.hypot(s.x - p.x, s.y - p.y) < b.radius) return this.crash(`Alus törmäsi kappaleeseen ${b.name}.`);
    }
    return false;
  }

  private arrive(viaWormhole: boolean): boolean {
    this.flight = "captured";
    const frac = this.dvLeft / this.dvMax;
    const bonus = Math.round(frac * 30);
    commit((s) => { s.credits += bonus; });
    const name = planetName(this.planet);
    const title = viaWormhole ? "Madonreikä avautui" : `Kiertoradalla: ${this.target.name}`;
    const text = viaWormhole
      ? `Avaruus kiertyy ympärilläsi. Toisella puolella odottaa ${name} kahden auringon valossa.`
      : this.target.id === this.planet.orbitTarget && this.planet.orbitTarget !== this.planet.id
        ? `Olet kaapattu kappaleen ${this.target.name} kiertoradalle. Laskeudu sen kuuhun ${name}.`
        : `Olet kaapattu kiertoradalle. Valmistaudu laskeutumaan.`;
    showResult($("orbitResult"),
      `<span class="label ok">Perillä</span><h2>${title}</h2><p class="fact">${text}</p>
       <dl class="kv"><dt>Delta-v jäljellä</dt><dd>${Math.round(frac * 100)} %</dd><dt>Säästöbonus</dt><dd class="amber">+${fmt(bonus)} KR</dd><dt>Lentoaika</dt><dd>${fmt(this.t)} s</dd></dl>`,
      [
        { label: "Aloita laskeutuminen", onClick: () => this.cb.toLander(this.planet.id) },
        { label: "Tähtikartalle", ghost: true, onClick: () => this.cb.toMap() },
      ]);
    return true;
  }

  private crash(why: string): boolean {
    const cols = ["#ffb347", "#ff6b4a", "#fff"];
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * TAU, sp = Math.random() * 30;
      this.parts.push({ x: W / 2, y: H / 2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1 + Math.random(), c: cols[i % 3] });
    }
    return this.end("crashed", why);
  }

  private end(kind: "crashed" | "lost", why = ""): boolean {
    this.flight = kind;
    const html = kind === "lost"
      ? `<span class="label warn">Yhteys katkesi</span><h2>Ajauduit syvään avaruuteen</h2><p class="fact">Rata vei aluksen liian kauas. Polta vastasuuntaan ajoissa tai käytä lyhyempää rataa.</p>`
      : `<span class="label warn">Alus tuhoutui</span><h2>Törmäys</h2><p class="fact">${why}</p>`;
    window.setTimeout(() => showResult($("orbitResult"), html, [
      { label: "Yritä uudelleen", onClick: () => this.start(this.planet.id) },
      { label: "Tähtikartalle", ghost: true, onClick: () => this.cb.toMap() },
    ]), kind === "crashed" ? 900 : 200);
    return true;
  }

  private updateParticles(dt: number): void {
    for (const q of this.parts) { q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt; }
    this.parts = this.parts.filter((q) => q.life > 0);
  }

  /* ---- piirto ---- */
  draw(): void {
    const x = this.ctx;
    const z = this.sys.zooms[this.zoomIdx];
    const cx = this.ship.x, cy = this.ship.y;
    const S = (wx: number, wy: number): [number, number] => [(wx - cx) * z + W / 2, (wy - cy) * z + H / 2];
    const disc = (sx: number, sy: number, r: number, c: string) => { x.beginPath(); x.fillStyle = c; x.arc(sx, sy, r, 0, TAU); x.fill(); };

    x.fillStyle = "#04050b";
    x.fillRect(0, 0, W, H);
    for (const [sx, sy, b] of this.stars) {
      x.fillStyle = b > 0.85 ? "#cfd6ff" : "#2d3355";
      x.fillRect(((sx - cx * z * 0.02) % W + W) % W | 0, ((sy - cy * z * 0.02) % H + H) % H | 0, 1, 1);
    }

    // radat
    const [ox, oy] = S(0, 0);
    x.lineWidth = 1;
    for (const b of this.bodies) {
      if (b.fixed || b.r * z > 4000) continue;
      x.strokeStyle = b === this.target ? "#4a3414" : "#1a2040";
      x.beginPath(); x.arc(ox, oy, b.r * z, 0, TAU); x.stroke();
    }

    // keskuskappale
    const cr = Math.max(3, this.sys.central.radius * z);
    if (this.sys.id === "sun") disc(ox, oy, cr * 1.6, "rgba(255,207,74,.12)");
    disc(ox, oy, cr, this.sys.central.color);

    x.font = '6px "Press Start 2P"';
    x.textAlign = "center";
    for (const b of this.bodies) {
      const p = bodyPos(b, this.t);
      const [sx, sy] = S(p.x, p.y);
      if (sx < -60 || sx > W + 60 || sy < -60 || sy > H + 60) continue;
      const r = Math.max(1.5, b.radius * z);
      if (b.fixed) {
        for (let i = 0; i < 5; i++) {
          x.strokeStyle = ["#b48cff", "#7a5cff", "#ff5ad1", "#6fe3ff", "#fff"][i];
          x.beginPath(); x.ellipse(sx, sy, Math.max(3, (10 - i * 1.8) * z), Math.max(2, (6 - i) * z), this.t * 1.2 + i, 0, 5.2); x.stroke();
        }
      } else {
        disc(sx, sy, r, b.color);
        if (b.ring) { x.strokeStyle = "#bfa66a"; x.beginPath(); x.ellipse(sx, sy, r * 1.9, r * 0.5, -0.3, 0, TAU); x.stroke(); }
      }
      if (b === this.target) {
        const capPx = this.captureR() * z;
        if (capPx >= 3) {
          x.setLineDash([2, 2]); x.strokeStyle = "#ffb347";
          x.beginPath(); x.arc(sx, sy, capPx, 0, TAU); x.stroke(); x.setLineDash([]);
        }
      }
      x.fillStyle = b === this.target ? "#ffb347" : "#5a6185";
      x.fillText(b.name.toUpperCase(), sx, sy - Math.max(r, b === this.target ? this.captureR() * z : 0) - 4);
    }

    // ennustettu rata
    if (this.pred && this.flight === "fly") {
      const pts = this.pred.points;
      for (let i = 0; i < pts.length; i += 3) {
        const [sx, sy] = S(pts[i].x, pts[i].y);
        x.fillStyle = i / pts.length < 0.5 ? "rgba(111,227,255,.8)" : "rgba(111,227,255,.35)";
        x.fillRect(sx | 0, sy | 0, 1, 1);
      }
      const c = this.pred.closest;
      if (this.st.predictor && c && !this.target.fixed) {
        const [tx, ty] = S(c.target.x, c.target.y);
        x.strokeStyle = "rgba(255,179,71,.6)";
        x.beginPath(); x.arc(tx, ty, Math.max(3, this.target.radius * z), 0, TAU); x.stroke();
        const [px, py] = S(c.ship.x, c.ship.y);
        x.fillStyle = "#ffb347";
        x.fillRect(px - 2, py, 5, 1); x.fillRect(px, py - 2, 1, 5);
      }
    }

    // alus
    if (this.flight !== "crashed") drawShip(x, W / 2, H / 2, this.heading, state.hull, this.thrusting);
    for (const q of this.parts) { x.fillStyle = q.c; x.fillRect(q.x | 0, q.y | 0, 1, 1); }

    // nuoli kohteeseen, jos se ei näy ruudulla
    const tp = bodyPos(this.target, this.t);
    const [tsx, tsy] = S(tp.x, tp.y);
    if (tsx < 0 || tsx > W || tsy < 0 || tsy > H) {
      const ang = Math.atan2(tsy - H / 2, tsx - W / 2);
      const ex = clamp(W / 2 + Math.cos(ang) * 150, 6, W - 6), ey = clamp(H / 2 + Math.sin(ang) * 90, 14, H - 6);
      x.fillStyle = "#ffb347";
      x.save(); x.translate(ex, ey); x.rotate(ang);
      x.beginPath(); x.moveTo(4, 0); x.lineTo(-3, -3); x.lineTo(-3, 3); x.closePath(); x.fill();
      x.restore();
    }

    this.drawHud();
  }

  private drawHud(): void {
    const { d, rel } = this.targetRel();
    const f = this.dvLeft / this.dvMax;
    const vcap = this.vCap();
    const ref = this.refVelocity().name;
    const c = this.pred?.closest;
    const relTxt = this.target.fixed ? "" : `<span class="${rel < vcap ? "good" : "bad"}">SUHT. ${fmt1(rel)} / ${fmt1(vcap)}</span>`;
    $("orbitHud").innerHTML = `
      <span>ΔV<span class="fuelbar"><i style="width:${Math.max(0, f * 58)}px;${f < 0.15 ? "background:var(--bad)" : ""}"></i></span> ${fmt1(this.dvLeft)}</span>
      <span>${this.target.name.toUpperCase()} ${fmt(d)}</span>
      ${relTxt}
      ${this.st.predictor && c ? `<span class="${c.d < this.captureR() ? "good" : ""}">LÄHIN OHITUS ${fmt(c.d)}</span>` : ""}
      <span>SUUNTA: ${ref.toUpperCase()}</span>
      ${!this.clockRunning ? `<span class="good">KELLO ODOTTAA · POLTA MYÖTÄSUUNTAAN LÄHTEÄKSESI</span>` : ""}
      ${this.dvLeft <= 0 && this.flight === "fly" ? `<span class="bad">POLTTOAINE LOPPU · HINAA KOTIIN TAI ODOTA OHILENTOA</span>` : ""}`;
  }
}
