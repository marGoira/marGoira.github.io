/**
 * App startup: view switching, the game loop and button wiring.
 * Views: map / tech / yard (menus) and orbit / land (gameplay views).
 */
import "./style.css";
import { $, fmt, fmt1, toast } from "./core/util";
import { bindHold, bindTap, onKey, setKeyboardEnabled, suppressTouchMenus } from "./core/input";
import { commit, freshState, replaceState, state, subscribe } from "./state/gameState";
import { stats } from "./state/stats";
import { initCloudSave } from "./api/cloudSave";
import { MapScene } from "./scenes/mapScene";
import { OrbitScene } from "./scenes/orbitScene";
import { LanderScene } from "./scenes/landerScene";
import type { Scene } from "./scenes/scene";
import { renderTechTree } from "./ui/techTree";
import { renderYard } from "./ui/yard";

type View = "map" | "tech" | "yard" | "orbit" | "land";
const VIEWS: View[] = ["map", "tech", "yard", "orbit", "land"];
let view: View = "map";

const map = new MapScene({
  fly: (id) => { orbit.start(id); show("orbit"); },
  autopilot: (id) => { lander.start(id); show("land"); },
});
const orbit = new OrbitScene({
  toMap: () => show("map"),
  toLander: (id) => { lander.start(id); show("land"); },
});
const lander = new LanderScene({ toMap: () => show("map") });

const active = (): Scene | null => (view === "map" ? map : view === "orbit" ? orbit : view === "land" ? lander : null);

function refreshHeader(): void {
  $("cr").textContent = fmt(state.credits);
  $("tp").textContent = fmt(state.research);
  $("rng").textContent = fmt1(stats().range);
}

function show(v: View): void {
  view = v;
  for (const id of VIEWS) $("view-" + id).hidden = id !== v;
  const playing = v === "orbit" || v === "land";
  $("tabs").hidden = playing;
  setKeyboardEnabled(playing);
  document.querySelectorAll<HTMLElement>(".tab").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === v)));
  if (v === "map") map.render();
  if (v === "tech") renderTechTree();
  if (v === "yard") renderYard();
  refreshHeader();
}

/* ---- buttons ---- */
document.querySelectorAll<HTMLElement>(".tab").forEach((b) => (b.onclick = () => show(b.dataset.tab as View)));

bindHold($("cL"), "left"); bindHold($("cR"), "right"); bindHold($("cT"), "thrust");
bindHold($("oL"), "left"); bindHold($("oR"), "right"); bindHold($("oT"), "thrust");
bindHold($("oPro"), "pro"); bindHold($("oRetro"), "retro");
bindTap($("oWarp"), () => orbit.cycleWarp());
bindTap($("oZoomIn"), () => orbit.zoom(1));
bindTap($("oZoomOut"), () => orbit.zoom(-1));
for (const id of ["landc", "orbitc", "mapc"]) suppressTouchMenus($(id));
$("orbitc").addEventListener("wheel", (e) => { e.preventDefault(); orbit.zoom(e.deltaY < 0 ? 1 : -1); }, { passive: false });

$("abort").onclick = () => show("map");
$("orbitAbort").onclick = () => show("map");

onKey((code) => {
  if (code === "Escape") show("map");
  if (view === "orbit") {
    if (code === "KeyT") orbit.cycleWarp();
    if (code === "Equal" || code === "NumpadAdd") orbit.zoom(1);
    if (code === "Minus" || code === "NumpadSubtract") orbit.zoom(-1);
  }
});

// iOS: prevent text selection in gameplay views
document.addEventListener("selectionchange", () => {
  if (view === "orbit" || view === "land") window.getSelection()?.removeAllRanges();
});

const easy = $<HTMLInputElement>("easy");
easy.onchange = () => {
  commit((s) => { s.easy = easy.checked; });
  if (view === "map") map.render();
  toast(state.easy ? "Easy mode on: lighter gravity, bigger pads, more fuel." : "Easy mode off.");
};

let resetArm = 0;
const resetBtn = $("reset");
resetBtn.onclick = () => {
  if (Date.now() - resetArm < 3000) {
    replaceState(freshState(state.playerId));
    easy.checked = false;
    map.selected = "moon";
    show("map");
    resetBtn.textContent = "Start over";
    resetArm = 0;
    toast("A new career has begun.");
    return;
  }
  resetArm = Date.now();
  resetBtn.textContent = "Press again to confirm";
  window.setTimeout(() => { if (Date.now() - resetArm >= 3000) resetBtn.textContent = "Start over"; }, 3100);
};

subscribe(() => refreshHeader());

/* ---- game loop ---- */
let last = performance.now();
function loop(now: number): void {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  const s = active();
  if (s) { s.update(dt); s.draw(); }
  requestAnimationFrame(loop);
}

easy.checked = state.easy;
show("map");
requestAnimationFrame(loop);
void initCloudSave((msg) => ($("syncStatus").textContent = msg)).then(() => { easy.checked = state.easy; if (view === "map") map.render(); });
