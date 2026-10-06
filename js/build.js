/** Numero di build: stampa embedded + controllo di build.json online (sempre no-store). */
import { APP_VERSION } from './version.js';

export const running = APP_VERSION;

/** Legge build.json dal server saltando qualunque cache. Ritorna null se non disponibile (es. in locale). */
export async function fetchRemoteBuild() {
  try {
    const r = await fetch('build.json', { cache: 'no-store' });
    if (!r.ok) return null;
    const j = await r.json();
    return j && j.build != null ? j : null;
  } catch {
    return null;
  }
}

/** True se il build online è più recente di quello in esecuzione. */
export function isNewer(remote) {
  if (!running.stamped || !remote) return false;
  const a = Number(remote.build), b = Number(running.build);
  return Number.isFinite(a) && Number.isFinite(b) && a > b;
}

/** Cosa mostrare nel badge: la build in esecuzione; in dev, se c'è un build.json locale, quello. */
export function displayBuild(remote) {
  if (running.stamped) return running;
  if (remote) return { build: remote.build, sha: remote.sha || '', date: remote.date || '' };
  return { build: 'dev', sha: '', date: '' };
}
