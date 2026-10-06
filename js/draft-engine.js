/**
 * Motore del draft: puro (niente DOM, niente localStorage), quindi testabile da Node.
 * Tutte le funzioni mutano l'oggetto `run` che passi.
 *
 * Determinismo: le opzioni di una categoria dipendono SOLO da
 *   seed + categoria + numero di reroll in quella categoria + scelte già fatte + ban + pool.
 */
import { makeRng } from './rng.js';

export const LENGTHS = {
  rapida: { label: 'Rapida', levels: ['core'] },
  standard: { label: 'Standard', levels: ['core', 'std'] },
  completa: { label: 'Completa', levels: ['core', 'std', 'full'] },
};

export const CHECKLIST = [
  'Prototipo carta/penna',
  'Primo playtest',
  'Revisione regole',
  'Versione finale',
  'Video pubblicato',
];

/* ---------- Pool e compatibilità ---------- */

/** Applica alle categorie base la configurazione utente (disattivati + elementi custom). */
export function resolveCategories(base, pool = {}) {
  const offItems = new Set(pool.disabledItems || []);
  const offCats = new Set(pool.disabledCats || []);
  const custom = pool.customItems || {};
  return base
    .filter((c) => !offCats.has(c.id))
    .map((c) => ({
      ...c,
      items: [...c.items, ...(custom[c.id] || [])].filter((i) => !offItems.has(i.id)),
    }))
    .filter((c) => c.items.length > 0);
}

export function selectCategories(cats, length) {
  const levels = (LENGTHS[length] || LENGTHS.standard).levels;
  return cats.filter((c) => levels.includes(c.level));
}

export function incompatible(a, b) {
  const hit = (x, y) => (x.excludes || []).some((t) => (y.tags || []).includes(t));
  return hit(a, b) || hit(b, a);
}

export function isCompatible(item, chosen) {
  return !chosen.some((c) => incompatible(item, c));
}

/* ---------- Creazione run ---------- */

function newId() {
  return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function createRun(opts, baseCats) {
  const cats = selectCategories(resolveCategories(baseCats, opts.pool), opts.length);
  const preBanned = opts.banned || [];
  return {
    id: newId(),
    createdAt: Date.now(),
    seed: opts.seed,
    mode: opts.mode, // 'classic' | 'chaos'
    length: opts.length,
    rerollsAllowed: opts.rerolls, // -1 = illimitati
    rerollsUsed: 0,
    rerollsByCat: {},
    bansAllowed: opts.bans || 0,
    banned: [...preBanned],
    skipAllowed: !!opts.skipAllowed,
    deadlineMs: opts.deadlineMs || 0,
    pool: opts.pool || {},
    catIds: cats.map((c) => c.id),
    picks: [],
    current: null,
    phase: (opts.bans || 0) > 0 && !preBanned.length ? 'ban' : 'draft',
    status: 'draft', // 'draft' | 'done'
    finishedAt: null,
    title: '',
    checklist: CHECKLIST.map(() => false),
  };
}

export function toggleBan(run, itemId) {
  const i = run.banned.indexOf(itemId);
  if (i >= 0) run.banned.splice(i, 1);
  else if (run.banned.length < run.bansAllowed) run.banned.push(itemId);
  else return false;
  return true;
}

export function startDraft(run, baseCats) {
  run.phase = 'draft';
  prepareCurrent(run, baseCats);
  return run;
}

/* ---------- Generazione opzioni ---------- */

const chosenItems = (run) => run.picks.filter((p) => !p.skipped);

function poolFor(run, cat) {
  const banned = new Set(run.banned);
  const chosen = chosenItems(run);
  return cat.items.filter((i) => !banned.has(i.id) && isCompatible(i, chosen));
}

/** Info per la UI: quanti elementi c'erano in totale e quanti sono compatibili. */
export function poolInfo(run, baseCats) {
  const cat = resolveCategories(baseCats, run.pool).find((c) => c.id === run.catIds[run.picks.length]);
  if (!cat) return { total: 0, available: 0 };
  const banned = new Set(run.banned);
  return { total: cat.items.filter((i) => !banned.has(i.id)).length, available: poolFor(run, cat).length };
}

function drawOptions(run, cat, pool) {
  const cur = run.current;
  const rng = makeRng(`${run.seed}|${cat.id}|${cur.rerollN}`);
  const want = Math.min(run.mode === 'chaos' ? 1 : 3, pool.length);
  const fresh = pool.filter((i) => !cur.shown.includes(i.id));
  let opts = rng.shuffle(fresh).slice(0, want);
  if (opts.length < want) {
    // Pool "esaurito": ripesca tra i già mostrati, evitando le opzioni appena viste.
    const prev = cur.options || [];
    const rest = rng.shuffle(pool.filter((i) => !opts.includes(i)));
    rest.sort((a, b) => prev.includes(a.id) - prev.includes(b.id));
    opts = opts.concat(rest.slice(0, want - opts.length));
  }
  cur.options = opts.map((i) => i.id);
  cur.shown = fresh.length === 0 ? [...cur.options] : [...new Set([...cur.shown, ...cur.options])];
  cur.counted = false;
}

/** Porta la run alla prossima categoria con opzioni; salta da sola quelle senza opzioni compatibili. */
export function prepareCurrent(run, baseCats) {
  const all = resolveCategories(baseCats, run.pool);
  while (run.picks.length < run.catIds.length) {
    const idx = run.picks.length;
    const cat = all.find((c) => c.id === run.catIds[idx]);
    const pool = cat ? poolFor(run, cat) : [];
    if (!pool.length) {
      run.picks.push({ catId: run.catIds[idx], catName: cat?.name || '', skipped: true, auto: true });
      continue;
    }
    run.current = { catIdx: idx, rerollN: 0, shown: [], options: [] };
    drawOptions(run, cat, pool);
    return run.current;
  }
  run.current = null;
  run.status = 'done';
  run.finishedAt = Date.now();
  return null;
}

/* ---------- Azioni ---------- */

export function canReroll(run) {
  return run.mode !== 'chaos' && !!run.current && (run.rerollsAllowed < 0 || run.rerollsUsed < run.rerollsAllowed);
}

export function rerollsLeft(run) {
  return run.rerollsAllowed < 0 ? Infinity : Math.max(0, run.rerollsAllowed - run.rerollsUsed);
}

export function reroll(run, baseCats) {
  if (!canReroll(run)) return false;
  const cat = resolveCategories(baseCats, run.pool).find((c) => c.id === run.catIds[run.current.catIdx]);
  const pool = poolFor(run, cat);
  run.rerollsUsed++;
  run.rerollsByCat[cat.id] = (run.rerollsByCat[cat.id] || 0) + 1;
  run.current.rerollN++;
  drawOptions(run, cat, pool);
  return true;
}

export function choose(run, itemId, baseCats) {
  const cur = run.current;
  if (!cur || !cur.options.includes(itemId)) return false;
  const cat = resolveCategories(baseCats, run.pool).find((c) => c.id === run.catIds[cur.catIdx]);
  const item = cat.items.find((i) => i.id === itemId);
  run.picks.push({
    catId: cat.id, catName: cat.name, catEmoji: cat.emoji,
    itemId, name: item.name, emoji: item.emoji, desc: item.desc,
    tags: item.tags || [], excludes: item.excludes || [], pitch: item.pitch || '',
    note: '', options: [...cur.options], shown: [...cur.shown], rerollN: cur.rerollN,
  });
  prepareCurrent(run, baseCats);
  return true;
}

export function skip(run, baseCats) {
  const cur = run.current;
  if (!cur || !run.skipAllowed) return false;
  const cat = resolveCategories(baseCats, run.pool).find((c) => c.id === run.catIds[cur.catIdx]);
  run.picks.push({
    catId: cat.id, catName: cat.name, catEmoji: cat.emoji, skipped: true,
    options: [...cur.options], shown: [...cur.shown], rerollN: cur.rerollN,
  });
  prepareCurrent(run, baseCats);
  return true;
}

/** Annulla l'ultima scelta (e le eventuali categorie saltate in automatico dopo di essa). */
export function undo(run, baseCats) {
  if (!run.picks.length) return null;
  let last;
  do {
    last = run.picks.pop();
  } while (last && last.auto && run.picks.length);
  run.status = 'draft';
  run.finishedAt = null;
  if (last && last.options) {
    run.current = { catIdx: run.picks.length, rerollN: last.rerollN, shown: [...last.shown], options: [...last.options], counted: true };
  } else {
    prepareCurrent(run, baseCats);
  }
  return last;
}
