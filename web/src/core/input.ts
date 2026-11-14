/**
 * Input: keyboard and touch buttons feed the same state.
 * Buttons suppress the iOS Safari long-press menu and text selection.
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
/** Gameplay views turn the keyboard on; in menus Space keeps its normal behaviour. */
export function setKeyboardEnabled(on: boolean): void {
  enabled = on;
  if (!on) resetInput();
}

export function resetInput(): void {
  (Object.keys(input) as Action[]).forEach((k) => (input[k] = false));
  document.querySelectorAll(".ctl.on").forEach((b) => b.classList.remove("on"));
}

const keyHandlers: ((code: string) => void)[] = [];
/** Single key presses (e.g. Esc, time warp). */
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

/** Hold-down button (engine, turning). */
export function bindHold(el: HTMLElement, action: Action): void {
  const on = (e: PointerEvent) => {
    e.preventDefault();
    input[action] = true;
    el.classList.add("on");
    try { el.setPointerCapture(e.pointerId); } catch { /* old browsers */ }
  };
  const off = () => { input[action] = false; el.classList.remove("on"); };
  el.addEventListener("pointerdown", on);
  el.addEventListener("pointerup", off);
  el.addEventListener("pointercancel", off);
  el.addEventListener("lostpointercapture", off);
  suppressTouchMenus(el);
}

/** Tap button in a gameplay view (no click delay, no menu). */
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
