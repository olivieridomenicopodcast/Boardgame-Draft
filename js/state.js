/** Stato dell'app: impostazioni, run, pool personalizzato, statistiche. Tutto persistito via storage.js. */
import { load, save, removeAll } from './storage.js';

export const DEFAULT_SETTINGS = {
  sound: true,
  vibration: true,
  animations: true,
  theme: 'dark', // 'dark' | 'light'
  stream: false,
  skipEnabled: false,
  lastSetup: { mode: 'classic', length: 'standard', rerolls: 2, bans: 0, seed: '', deadline: 'none', customDays: 7 },
};

const state = {
  settings: { ...DEFAULT_SETTINGS, ...load('settings', {}) },
  runs: load('runs', []),
  currentId: load('currentId', null),
  pool: load('pool', { disabledItems: [], disabledCats: [], customItems: {} }),
  stats: load('stats', { shown: {}, picked: {}, rerolls: {}, runsStarted: 0, runsCompleted: 0 }),
};
state.settings.lastSetup = { ...DEFAULT_SETTINGS.lastSetup, ...(state.settings.lastSetup || {}) };

const listeners = new Set();
export const subscribe = (fn) => (listeners.add(fn), () => listeners.delete(fn));
const emit = () => listeners.forEach((fn) => fn());

export const getSettings = () => state.settings;
export function updateSettings(patch) {
  state.settings = { ...state.settings, ...patch };
  save('settings', state.settings);
  emit();
}

/* ---- Run ---- */
export const getRuns = () => state.runs;
export const getRun = (id) => state.runs.find((r) => r.id === id) || null;
export const getCurrentRun = () => getRun(state.currentId);

export function saveRun(run) {
  const i = state.runs.findIndex((r) => r.id === run.id);
  if (i >= 0) state.runs[i] = run;
  else state.runs.unshift(run);
  save('runs', state.runs);
}
export function setCurrent(id) {
  state.currentId = id;
  save('currentId', id);
}
export function deleteRun(id) {
  state.runs = state.runs.filter((r) => r.id !== id);
  if (state.currentId === id) setCurrent(null);
  save('runs', state.runs);
}

/** Unisce uno storico importato (per id; le run già presenti vengono sostituite). */
export function importRuns(list) {
  let n = 0;
  for (const r of list) {
    if (!r || !r.id || !Array.isArray(r.picks) || !r.seed) continue;
    const i = state.runs.findIndex((x) => x.id === r.id);
    if (i >= 0) state.runs[i] = r;
    else state.runs.push(r);
    n++;
  }
  state.runs.sort((a, b) => b.createdAt - a.createdAt);
  save('runs', state.runs);
  return n;
}

/* ---- Pool personalizzato ---- */
export const getPool = () => state.pool;
export function savePool(pool) {
  state.pool = { disabledItems: [], disabledCats: [], customItems: {}, ...pool };
  save('pool', state.pool);
}

/* ---- Statistiche ---- */
export const getStats = () => state.stats;
export function bumpStat(kind, key, by = 1) {
  const s = state.stats;
  if (key == null) s[kind] = (s[kind] || 0) + by;
  else s[kind][key] = Math.max(0, (s[kind][key] || 0) + by);
  save('stats', s);
}

export function resetAll() {
  removeAll();
  state.settings = { ...DEFAULT_SETTINGS };
  state.runs = [];
  state.currentId = null;
  state.pool = { disabledItems: [], disabledCats: [], customItems: {} };
  state.stats = { shown: {}, picked: {}, rerolls: {}, runsStarted: 0, runsCompleted: 0 };
  emit();
}

// Più schede aperte: quando un'altra scheda salva, ricarichiamo lo stato per non sovrascriverlo.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (!e.key || !e.key.startsWith('dtd-bgd:')) return;
    state.settings = { ...DEFAULT_SETTINGS, ...load('settings', {}) };
    state.runs = load('runs', []);
    state.currentId = load('currentId', null);
    state.pool = load('pool', state.pool);
    state.stats = load('stats', state.stats);
    emit();
  });
}
