import { HULLS } from "../data/ships";
import { $, canvas2d, fmt, fmt1, rng, toast } from "../core/util";
import { commit, state } from "../state/gameState";
import { engineName, flameColor, G_SCALE, stats } from "../state/stats";
import { drawShip } from "../render/ship";

let ctx: CanvasRenderingContext2D | null = null;

export function renderYard(): void {
  ctx ??= canvas2d("shipc");
  const st = stats();
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, 24, 24);
  for (let i = 0; i < 12; i++) { const R = rng(i + 3); ctx.fillStyle = "#2a3050"; ctx.fillRect((R() * 24) | 0, (R() * 24) | 0, 1, 1); }
  drawShip(ctx, 12, 10, 0, state.hull, true);

  $("yardName").textContent = `${HULLS[state.hull].name} · luokka ${["I", "II", "III", "IV"][state.hull]}`;
  $("yardStats").innerHTML = `
    <dt>Työntövoima</dt><dd>${fmt1(st.thrust / G_SCALE)} m/s²</dd>
    <dt>Tankki</dt><dd>${fmt(st.tank)} yks.</dd>
    <dt>Kulutus</dt><dd>${fmt1(st.burn)} yks./s</dd>
    <dt>Kantama</dt><dd>${fmt1(st.range)}</dd>
    <dt>Ohjaus</dt><dd>${[st.assist ? "gyrovakain" : "käsiohjaus", st.predictor ? "pitkä radan ennuste" : "", st.oberth ? "Oberth-poltot" : ""].filter(Boolean).join(", ")}</dd>
    <dt>Moottorin liekki</dt><dd><span style="color:${flameColor()}">■</span> ${engineName()}</dd>`;

  $("hulls").innerHTML = HULLS.map((h, i) => {
    const own = i <= state.hull, next = i === state.hull + 1;
    const right = i === state.hull ? `<span class="label amber">Käytössä</span>`
      : own ? `<span class="label">Omistettu</span>`
      : `<button class="btn" data-h="${i}" ${next && state.credits >= h.cost ? "" : "disabled"}>${fmt(h.cost)} KR</button>`;
    return `<div class="hull ${i === state.hull ? "cur" : ""} ${own && i !== state.hull ? "own" : ""}">
      <span>${h.name}<br><span class="hint">Työntö +${fmt1((i * 6) / G_SCALE)} m/s², tankki +${i * 25}</span></span>${right}</div>`;
  }).join("");
  $("hulls").querySelectorAll<HTMLButtonElement>("[data-h]").forEach((b) => (b.onclick = () => {
    const i = Number(b.dataset.h);
    if (state.credits < HULLS[i].cost) return;
    commit((s) => { s.credits -= HULLS[i].cost; s.hull = i; });
    renderYard();
    toast(`Uusi runko: ${HULLS[i].name}!`);
  }));
}
