/**
 * Syöte: näppäimistö + kosketusnapit samaan tilaan.
 * Napit estävät iOS Safarin pitkän painalluksen valikon ja tekstinvalinnan.
 */
export type Action = "left" | "right" | "thrust" | "pro" | "retro";

export const input: Record<Action, boolean> = { left: false, right: false, thrust: false, pro: false, retro: false };

const KEYMAP: Record<string, Action> = {
  ArrowLeft: "left", KeyA: "left",
  ArrowRight: "right", KeyD: "right",
  ArrowUp: "thrust", KeyW: "thrust", Space: "thrust",
  KeyQ: "pro", KeyE: "retro",
};

let enabled = false;
/** Pelinäkymät kytkevät näppäimistön päälle; valikoissa välilyönti saa toimia normaalisti. */
export function setKeyboardEnabled(on: boolean): void {
  enabled = on;
  if (!on) resetInput();
}

export function resetInput(): void {
  (Object.keys(input) as Action[]).forEach((k) => (input[k] = false));
  document.querySelectorAll(".ctl.on").forEach((b) => b.classList.remove("on"));
}

const keyHandlers: ((code: string) => void)[] = [];
/** Kertapainallukset (esim. Esc, aikakiihdytys). */
export function onKey(fn: (code: string) => void): void {
  keyHandlers.push(fn);
}

addEventListener("keydown", (e) => {
  if (!enabled) return;
  const a = KEYMAP[e.code];
  if (a) { input[a] = true; e.preventDefault(); }
  if (!e.repeat) keyHandlers.forEach((h) => h(e.code));
});
addEventListener("keyup", (e) => {
  const a = KEYMAP[e.code];
  if (a) input[a] = false;
});

/** Pidettävä nappi (moottori, kääntö). */
export function bindHold(el: HTMLElement, action: Action): void {
  const on = (e: PointerEvent) => {
    e.preventDefault();
    input[action] = true;
    el.classList.add("on");
    try { el.setPointerCapture(e.pointerId); } catch { /* vanhat selaimet */ }
  };
  const off = () => { input[action] = false; el.classList.remove("on"); };
  el.addEventListener("pointerdown", on);
  el.addEventListener("pointerup", off);
  el.addEventListener("pointercancel", off);
  el.addEventListener("lostpointercapture", off);
  suppressTouchMenus(el);
}

/** Napautettava nappi pelinäkymässä (ei klikkiviivettä, ei valikkoa). */
export function bindTap(el: HTMLElement, fn: () => void): void {
  el.addEventListener("pointerdown", (e) => { e.preventDefault(); fn(); });
  suppressTouchMenus(el);
}

export function suppressTouchMenus(el: HTMLElement): void {
  el.addEventListener("contextmenu", (e) => e.preventDefault());
  el.addEventListener("selectstart", (e) => e.preventDefault());
  el.addEventListener("touchstart", (e) => e.preventDefault(), { passive: false });
  el.addEventListener("touchend", (e) => e.preventDefault(), { passive: false });
}
