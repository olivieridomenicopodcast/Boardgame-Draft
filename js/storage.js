/** localStorage con try/catch (+ fallback in memoria se non disponibile, es. navigazione privata). */
const PREFIX = 'dtd-bgd:';
const mem = new Map();

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw != null) return JSON.parse(raw);
  } catch { /* ignora: useremo la memoria */ }
  return mem.has(key) ? mem.get(key) : fallback;
}

export function save(key, value) {
  mem.set(key, value);
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeAll() {
  mem.clear();
  try {
    Object.keys(localStorage).filter((k) => k.startsWith(PREFIX)).forEach((k) => localStorage.removeItem(k));
  } catch { /* niente da fare */ }
}
