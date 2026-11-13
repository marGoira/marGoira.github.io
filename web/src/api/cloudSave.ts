/**
 * Valinnainen pilvitallennus C#-rajapintaan (api/-kansio).
 * Pois päältä, jos VITE_API_URL on tyhjä: peli toimii silloin täysin paikallisesti.
 */
import { replaceState, sanitize, state, subscribe, type GameState } from "../state/gameState";

const API = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";
export const cloudEnabled = API.length > 0;

type Status = (msg: string) => void;
let timer: number | undefined;

async function push(s: GameState, status: Status): Promise<void> {
  try {
    const res = await fetch(`${API}/saves/${encodeURIComponent(s.playerId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(s),
    });
    if (res.status === 409) {
      // Toinen laite tallensi uudemman version: otetaan se käyttöön.
      const latest = await fetch(`${API}/saves/${encodeURIComponent(s.playerId)}`);
      const remote = latest.ok ? sanitize(await latest.json(), s.playerId) : null;
      if (remote) replaceState(remote);
      status("Uudempi tallennus haettiin pilvestä");
      return;
    }
    status(res.ok ? "Pilvitallennus ajan tasalla" : `Pilvitallennus epäonnistui (${res.status})`);
  } catch {
    status("Pilvipalvelu ei vastaa, tallennettu vain tälle laitteelle");
  }
}

/** Hakee pilvestä uudemman tallennuksen ja alkaa synkronoida muutokset. */
export async function initCloudSave(status: Status): Promise<void> {
  if (!cloudEnabled) return;
  status("Yhdistetään pilveen…");
  try {
    const res = await fetch(`${API}/saves/${encodeURIComponent(state.playerId)}`);
    if (res.ok) {
      const remote = sanitize(await res.json(), state.playerId);
      if (remote && remote.updatedAt > state.updatedAt) replaceState(remote);
    }
    status("Pilvitallennus käytössä");
  } catch {
    status("Pilvipalvelu ei vastaa, tallennetaan vain tälle laitteelle");
  }
  subscribe((s) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => push(s, status), 1500);
  });
}
