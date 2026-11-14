/** Shared interface for gameplay views. main.ts calls update/draw on the active view. */
export interface Scene {
  update(dt: number): void;
  draw(): void;
}

export interface ResultButton {
  label: string;
  ghost?: boolean;
  onClick: () => void;
}

export interface Particle { x: number; y: number; vx: number; vy: number; life: number; c: string; g?: number }

/** Shows a result panel on top of the game. */
export function showResult(el: HTMLElement, html: string, buttons: ResultButton[]): void {
  el.innerHTML = `<div class="panel">${html}<div class="btnrow"></div></div>`;
  const row = el.querySelector(".btnrow")!;
  for (const b of buttons) {
    const btn = document.createElement("button");
    btn.className = b.ghost ? "btn ghost" : "btn";
    btn.textContent = b.label;
    btn.onclick = b.onClick;
    row.appendChild(btn);
  }
  el.hidden = false;
}
