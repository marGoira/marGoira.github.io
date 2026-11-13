/** Tähtikartta: kaavamainen aurinkokunta, josta valitaan kohde. Ei mittakaavassa. */
import { PLANETS, planetById, type PlanetId } from "../data/planets";
import { $, canvas2d, esc, fmt, fmt1, rng } from "../core/util";
import { commit, state } from "../state/gameState";
import { autopilotCost, autopilotReach, isUnlocked, planetName, stats } from "../state/stats";
import { getSystem } from "../physics/systems";
import type { Scene } from "./scene";

const W = 320, H = 200;
const SUN: [number, number] = [14, 100];
const ORB: Record<string, [number, number]> = { earth: [46, -0.5], mars: [78, 0.55], ceres: [108, -0.35], jup: [150, 0.3], sat: [200, -0.25] };
const op = (k: string): [number, number] => { const [r, a] = ORB[k]; return [SUN[0] + r * Math.cos(a), SUN[1] + r * Math.sin(a)]; };
const WORMHOLE: [number, number] = [278, 150];
const STARS = Array.from({ length: 90 }, (_, i) => { const R = rng(i * 99 + 7); return [(R() * W) | 0, (R() * H) | 0, R()] as const; });

export interface MapCallbacks {
  fly: (id: PlanetId) => void;
  autopilot: (id: PlanetId) => void;
}

export class MapScene implements Scene {
  private ctx = canvas2d("mapc");
  private t = 0;
  selected: PlanetId = "moon";

  constructor(private cb: MapCallbacks) {
    $("mapc").addEventListener("pointerdown", (ev) => this.pick(ev));
  }

  private bodyPos(id: PlanetId, t: number): [number, number] {
    switch (id) {
      case "moon": { const e = op("earth"); return [e[0] + 9 * Math.cos(t * 0.6), e[1] + 9 * Math.sin(t * 0.6)]; }
      case "mars": return op("mars");
      case "ceres": return op("ceres");
      case "europa": { const j = op("jup"); return [j[0] + 14 * Math.cos(t * 0.4 + 1), j[1] + 10 * Math.sin(t * 0.4 + 1)]; }
      case "titan": { const s = op("sat"); return [s[0] + 15 * Math.cos(t * 0.3 + 2), s[1] + 11 * Math.sin(t * 0.3 + 2)]; }
      case "exo": return [300, 172];
    }
  }

  private pick(ev: PointerEvent): void {
    const c = ev.currentTarget as HTMLCanvasElement;
    const r = c.getBoundingClientRect();
    const x = ((ev.clientX - r.left) * W) / r.width, y = ((ev.clientY - r.top) * H) / r.height;
    let best: PlanetId | null = null, bd = 18;
    for (const p of PLANETS) {
      if (!isUnlocked(p)) continue;
      const [px, py] = this.bodyPos(p.id, this.t);
      const d = Math.hypot(px - x, py - y);
      if (d < bd) { bd = d; best = p.id; }
    }
    if (best) { this.selected = best; this.render(); }
  }

  update(dt: number): void { this.t += dt; }

  draw(): void {
    const mx = this.ctx, t = this.t;
    mx.fillStyle = "#04050b"; mx.fillRect(0, 0, W, H);
    for (const [x, y, b] of STARS) { mx.fillStyle = b > 0.85 ? "#cfd6ff" : "#3d4366"; mx.fillRect(x, y, 1, 1); }
    mx.strokeStyle = "#1d2340"; mx.setLineDash([2, 3]);
    for (const k in ORB) { mx.beginPath(); mx.arc(SUN[0], SUN[1], ORB[k][0], -1.3, 1.3); mx.stroke(); }
    mx.setLineDash([]);
    const disc = (x: number, y: number, r: number, c: string) => { mx.beginPath(); mx.fillStyle = c; mx.arc(x, y, r, 0, 7); mx.fill(); };
    disc(SUN[0], SUN[1], 10, "#ffcf4a"); disc(SUN[0] - 2, SUN[1] - 2, 4, "#fff3b0");
    const e = op("earth"); disc(e[0], e[1], 4, "#3f7cff"); mx.fillStyle = "#5fd47a"; mx.fillRect(e[0] - 1, e[1] - 2, 2, 2);
    const j = op("jup"); disc(j[0], j[1], 8, "#c99a6a"); mx.fillStyle = "#8f6440"; mx.fillRect(j[0] - 7, j[1] - 1, 14, 2);
    const s = op("sat"); disc(s[0], s[1], 6, "#e0c88a"); mx.strokeStyle = "#bfa66a"; mx.beginPath(); mx.ellipse(s[0], s[1], 11, 3, -0.3, 0, 7); mx.stroke();

    const unlocked = stats().wormhole;
    for (let i = 0; i < 5; i++) {
      mx.strokeStyle = unlocked ? ["#b48cff", "#7a5cff", "#ff5ad1", "#6fe3ff", "#fff"][i] : "#2d3150";
      mx.beginPath(); mx.ellipse(WORMHOLE[0], WORMHOLE[1], 10 - i * 1.8, 6 - i, t * (unlocked ? 1.2 : 0.2) + i, 0, 5.2); mx.stroke();
    }
    mx.font = '6px "Press Start 2P"'; mx.textAlign = "center";
    mx.fillStyle = unlocked ? "#b48cff" : "#3a3f63"; mx.fillText(unlocked ? "MADONREIKÄ" : "???", WORMHOLE[0], WORMHOLE[1] - 12);
    mx.fillStyle = "#5a6185"; mx.fillText("MAA", e[0], e[1] + 12);

    for (const p of PLANETS) {
      if (!isUnlocked(p)) continue;
      const [x, y] = this.bodyPos(p.id, t);
      if (p.id === "exo") { mx.strokeStyle = "#463064"; mx.setLineDash([1, 2]); mx.beginPath(); mx.moveTo(WORMHOLE[0] + 8, WORMHOLE[1] + 3); mx.lineTo(x, y); mx.stroke(); mx.setLineDash([]); }
      const rad = p.id === "mars" ? 3 : p.id === "exo" ? 4 : 2;
      disc(x, y, rad, p.top);
      if (this.selected === p.id) { mx.strokeStyle = "#ffb347"; mx.strokeRect((x - rad - 3) | 0, (y - rad - 3) | 0, rad * 2 + 6, rad * 2 + 6); }
      mx.fillStyle = state.visits[p.id] ? "#ffb347" : "#9aa0c4";
      mx.fillText(planetName(p).toUpperCase(), x, y - rad - 5);
      if (state.visits[p.id]) { mx.fillStyle = "#7ee08a"; mx.fillRect(x + rad + 2, y - 1, 2, 2); }
    }
  }

  /** Kohdelista ja tietopaneeli (DOM). */
  render(): void {
    const st = stats();
    const list = $("dests");
    list.innerHTML = PLANETS.filter(isUnlocked).map((p) => {
      const visited = state.visits[p.id];
      return `<button class="dest ${this.selected === p.id ? "sel" : ""}" data-id="${p.id}"><b>${esc(planetName(p))}</b>
        <span>Suositus ${fmt1(p.dist)}${visited ? ` · käyty ${visited}×` : ""}</span></button>`;
    }).join("") + (st.wormhole ? "" : `<div class="dest locked"><b>???</b><span>Tutki madonreikäteoria</span></div>`);
    list.querySelectorAll<HTMLButtonElement>("button.dest").forEach((b) => (b.onclick = () => { this.selected = b.dataset.id as PlanetId; this.render(); }));

    const p = planetById(this.selected);
    const sys = getSystem(p.system);
    const budget = st.range * sys.dvPerRange * (state.easy ? 1.5 : 1);
    const first = !state.visits[p.id];
    const k = first ? 1 : 0.5;
    const canAuto = (state.easy || !first) && autopilotReach(p);
    const recommendedOk = st.range + 1e-6 >= p.dist * (st.oberth ? 0.75 : 1);
    const conditions = [p.wind ? "tuulinen" : "", p.drag > 0.2 ? "paksu ilmakehä" : "", p.rough > 1.2 ? "rosoinen maasto" : ""].filter(Boolean).join(", ") || "tyhjiö, ei tuulta";

    $("destPanel").innerHTML = `
      <span class="label">${p.wormhole ? "Toinen galaksi" : p.system === "earth" ? "Maan kiertorata" : "Aurinkokunta"}</span>
      <h2>${esc(planetName(p))}</h2>
      <p class="fact">${p.fact}</p>
      <dl class="kv">
        <dt>Painovoima</dt><dd>${p.g.toLocaleString("fi-FI")} m/s²${p.g < 1 ? " (hyvin heikko)" : ""}</dd>
        <dt>Olosuhteet</dt><dd>${conditions}</dd>
        <dt>Kantamasi</dt><dd class="${recommendedOk ? "ok" : "warn"}">${fmt1(st.range)} (suositus ${fmt1(p.dist)})</dd>
        <dt>Delta-v</dt><dd>${fmt1(budget)} yksikköä matkalle</dd>
      </dl>
      <div class="mission"><span class="label">${first ? "Tehtävä" : "Rutiinilento"}</span>
        <p><b>${p.mission.title}.</b> ${p.mission.text}</p>
        <p>Palkkio: <span class="amber">${fmt(p.mission.credits * k)} KR</span> ja <span class="cyan">${fmt(p.mission.research * k)} TP</span>, kerrottuna alustan kertoimella (×1–×3).</p>
      </div>
      ${p.id === "exo" ? `<label class="label" for="nameIn">Anna planeetalle nimi</label><input type="text" id="nameIn" maxlength="16" placeholder="Aurora b" value="${esc(state.exoName)}">` : ""}
      <div class="btnrow">
        <button class="btn" id="go">Lähde matkalennolle</button>
        <button class="btn ghost" id="auto" ${canAuto ? "" : "disabled"}>Autopilotti</button>
      </div>
      <p class="fact">${canAuto
        ? "Autopilotti hyppää suoraan laskeutumiseen."
        : first && !state.easy
          ? "Ensimmäinen lento kohteeseen lennetään itse. Sen jälkeen autopilotti on käytössä."
          : `Autopilotti vaatii kantaman ${fmt1(autopilotCost(p))}.`}</p>
      ${!recommendedOk ? `<p class="fact warn">Kantama on suositusta pienempi. Lento voi onnistua taitavalla painovoimalingolla, mutta polttoaine on tiukalla.</p>` : ""}
      ${!state.tech.length && !Object.keys(state.visits).length ? `<p class="fact">Vinkki: aloita Kuusta. Pidä MYÖTÄ-nappia ja polta moottoria, kunnes ennustettu rata ulottuu Kuun radalle.</p>` : ""}`;
    const ni = document.getElementById("nameIn") as HTMLInputElement | null;
    if (ni) ni.oninput = () => commit((s) => { s.exoName = ni.value.trim().slice(0, 16); });
    $("go").onclick = () => this.cb.fly(p.id);
    $("auto").onclick = () => canAuto && this.cb.autopilot(p.id);
  }
}
