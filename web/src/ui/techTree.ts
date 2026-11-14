import { BRANCHES, TECH, techById } from "../data/tech";
import { $, toast } from "../core/util";
import { commit, state } from "../state/gameState";
import { has } from "../state/stats";

export function renderTechTree(): void {
  const tree = $("tree");
  tree.innerHTML = BRANCHES.map((br) => `<div class="branch"><h3>${br.toUpperCase()}</h3>${TECH.filter((t) => t.branch === br).map((t) => {
    const done = has(t.id), reqOk = t.requires.every(has), afford = state.research >= t.cost;
    const cls = done ? "done" : reqOk ? "avail" : "locked";
    const missing = t.requires.filter((r) => !has(r)).map((r) => techById(r).name).join(", ");
    return `<button class="node ${cls}" data-id="${t.id}" ${done || !reqOk ? 'aria-disabled="true"' : ""}>
      <span class="nm">${t.name}</span><span class="ds">${t.desc}</span><span class="ef">${t.effect}</span>
      ${reqOk ? "" : `<span class="rq">Requires: ${missing}</span>`}
      <span class="ct">${done ? "RESEARCHED" : `${t.cost} RP${reqOk && !afford ? " · can't afford yet" : ""}`}</span></button>`;
  }).join("")}</div>`).join("");

  tree.querySelectorAll<HTMLButtonElement>(".node").forEach((n) => (n.onclick = () => {
    const t = techById(n.dataset.id!);
    if (has(t.id)) return;
    if (!t.requires.every(has)) { toast("Research the prerequisite technologies first."); return; }
    if (state.research < t.cost) { toast(`You need ${t.cost - state.research} more RP. Go land somewhere!`); return; }
    commit((s) => { s.research -= t.cost; s.tech.push(t.id); });
    renderTechTree();
    toast(t.id === "f5" ? "The wormhole has opened! Check the star map." : `Researched: ${t.name}. ${t.effect}.`);
  }));
}
