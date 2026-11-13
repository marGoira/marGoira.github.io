/**
 * Pelin tallennettava tila. Kaikki muutokset kulkevat commit()-funktion kautta,
 * joka tallentaa localStorageen ja (jos käytössä) pilveen.
 */
export interface GameState {
  version: 2;
  playerId: string;
  updatedAt: string;
  credits: number;
  research: number;
  hull: number;
  tech: string[];
  visits: Record<string, number>;
  easy: boolean;
  /** Pelaajan antama nimi Aurora b -planeetalle */
  exoName: string;
}

const KEY = "kantama-save-v2";
const LEGACY_KEY = "kantama-save-v1";

const uuid = (): string =>
  crypto.randomUUID?.() ??
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 3) | 8).toString(16);
  });

export function freshState(playerId = uuid()): GameState {
  return {
    version: 2, playerId, updatedAt: new Date().toISOString(),
    credits: 0, research: 0, hull: 0, tech: [], visits: {}, easy: false, exoName: "",
  };
}

/** Hyväksyy vain järkevän muotoisen tallennuksen (localStoragesta tai pilvestä). */
export function sanitize(raw: unknown, fallbackId?: string): GameState | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const base = freshState(typeof r.playerId === "string" ? r.playerId : fallbackId);
  const num = (v: unknown, d: number) => (typeof v === "number" && isFinite(v) ? v : d);
  return {
    ...base,
    updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : base.updatedAt,
    credits: num(r.credits ?? r.cr, 0),
    research: num(r.research ?? r.tp, 0),
    hull: Math.max(0, Math.min(3, num(r.hull, 0) | 0)),
    tech: Array.isArray(r.tech) ? r.tech.filter((t): t is string => typeof t === "string") : [],
    visits: r.visits && typeof r.visits === "object" ? (r.visits as Record<string, number>) : {},
    easy: !!r.easy,
    exoName: typeof (r.exoName ?? r.named) === "string" ? String(r.exoName ?? r.named).slice(0, 16) : "",
  };
}

export function loadLocal(): GameState | null {
  try {
    const cur = localStorage.getItem(KEY);
    if (cur) return sanitize(JSON.parse(cur));
    const legacy = localStorage.getItem(LEGACY_KEY); // MVP-version tallennus
    if (legacy) return sanitize(JSON.parse(legacy));
  } catch { /* yksityinen ikkuna tms. */ }
  return null;
}

export function saveLocal(s: GameState): void {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ei tallennustilaa */ }
}

/* ---- Yksinkertainen store ---- */
export let state: GameState = loadLocal() ?? freshState();

type Listener = (s: GameState) => void;
const listeners: Listener[] = [];
export const subscribe = (fn: Listener) => listeners.push(fn);

/** Muuta tilaa ja tallenna. Esim. commit(s => { s.credits += 10 }) */
export function commit(mutator?: (s: GameState) => void): void {
  mutator?.(state);
  state.updatedAt = new Date().toISOString();
  saveLocal(state);
  listeners.forEach((l) => l(state));
}

export function replaceState(next: GameState): void {
  state = next;
  saveLocal(state);
  listeners.forEach((l) => l(state));
}
