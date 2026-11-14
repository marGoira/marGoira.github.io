/**
 * Optional cloud save to the C# API (the api/ folder).
 * Off when VITE_API_URL is empty: the game then runs fully locally.
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
      // Another device saved a newer version: switch to it.
      const latest = await fetch(`${API}/saves/${encodeURIComponent(s.playerId)}`);
      const remote = latest.ok ? sanitize(await latest.json(), s.playerId) : null;
      if (remote) replaceState(remote);
      status("Fetched a newer save from the cloud");
      return;
    }
    status(res.ok ? "Cloud save up to date" : `Cloud save failed (${res.status})`);
  } catch {
    status("Cloud service not responding, saved on this device only");
  }
}

/** Fetches a newer save from the cloud and starts syncing changes. */
export async function initCloudSave(status: Status): Promise<void> {
  if (!cloudEnabled) return;
  status("Connecting to the cloud…");
  try {
    const res = await fetch(`${API}/saves/${encodeURIComponent(state.playerId)}`);
    if (res.ok) {
      const remote = sanitize(await res.json(), state.playerId);
      if (remote && remote.updatedAt > state.updatedAt) replaceState(remote);
    }
    status("Cloud save enabled");
  } catch {
    status("Cloud service not responding, saving on this device only");
  }
  subscribe((s) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => push(s, status), 1500);
  });
}
