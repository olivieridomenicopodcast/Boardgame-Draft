/** Tutte le schermate. Ogni vista: (root, params) => funzione di cleanup opzionale. */
import { CATEGORIES, TAG_LABELS, findItem } from '../data/categories.js';
import { SEED_WORDS } from '../data/words.js';
import * as E from './draft-engine.js';
import { randomSeed, normalizeSeed } from './rng.js';
import * as S from './state.js';
import { h, toast, confirmDialog, buzz, reducedMotion, fmtDate, fmtCountdown, applySettings } from './ui.js';
import { sfx } from './audio.js';
import * as X from './export.js';
import { makePitch, makeTitle } from './pitch.js';
import { running, fetchRemoteBuild, isNewer, forceUpdate } from './build.js';

export const go = (path) => {
  if (location.hash === '#' + path) window.dispatchEvent(new HashChangeEvent('hashchange'));
  else location.hash = path;
};

const MODE_LABEL = { classic: 'Classica', chaos: 'Caos' };
const DEADLINES = { '24h': 1, '3d': 3, '1w': 7, '1m': 30 };

/* ---------- Pezzi comuni ---------- */

function topbar(title, back = '/home', extra = []) {
  return h('div', { class: 'topbar' },
    h('a', { class: 'btn ghost icon-btn', href: '#' + back, 'aria-label': 'Indietro', text: '←' }),
    h('h1', { text: title }),
    ...extra);
}

function choices(name, options, value) {
  return h('div', { class: 'choices', role: 'radiogroup' },
    options.map(([v, label, sub]) =>
      h('label', { class: 'choice' },
        h('input', { type: 'radio', name, value: String(v), checked: String(v) === String(value) }),
        h('span', {}, label, sub ? h('small', { text: sub }) : null))));
}

function switchRow(label, sub, checked, onchange) {
  const input = h('input', { type: 'checkbox', checked, onchange: (e) => onchange(e.target.checked), 'aria-label': label });
  return h('div', { class: 'switch-row' },
    h('div', {}, h('strong', { text: label }), sub ? h('small', { text: sub }) : null),
    h('label', { class: 'switch' }, input, h('i')));
}

function statusOf(run) {
  if (run.status !== 'done') return { t: run.phase === 'ban' ? 'Fase ban' : 'In draft', cls: 'warn' };
  const n = (run.checklist || []).filter(Boolean).length;
  if (n === E.CHECKLIST.length) return { t: 'Gioco completato 🎉', cls: 'ok' };
  return { t: `Brief pronto · ${n}/${E.CHECKLIST.length}`, cls: '' };
}

function startRun(opts) {
  const run = E.createRun(opts, CATEGORIES);
  S.saveRun(run);
  S.setCurrent(run.id);
  S.bumpStat('runsStarted');
  if (run.phase === 'ban') return go('/ban');
  E.startDraft(run, CATEGORIES);
  S.saveRun(run);
  go('/draft');
}

/** "Rifai con lo stesso seed": stesse impostazioni, stesso pool, stessi ban. */
function rerun(old) {
  startRun({
    seed: old.seed, mode: old.mode, length: old.length, rerolls: old.rerollsAllowed ?? 2,
    bans: (old.banned || []).length, banned: old.banned || [], skipAllowed: old.skipAllowed,
    deadlineMs: old.deadlineMs || 0, pool: structuredClone(old.pool || {}),
  });
}

/* ---------- Home ---------- */

export function home(root) {
  const run = S.getCurrentRun();
  const resumable = run && run.status !== 'done';
  root.append(
    h('section', { class: 'hero' },
      h('img', { src: 'icons/icon.svg', alt: '', width: 120, height: 120 }),
      h('h1', { text: 'Dicetidice Boardgame Draft' }),
      h('p', { class: 'muted', text: 'Scegli una caratteristica alla volta. Poi realizza davvero il gioco.' })),
    h('div', { class: 'home-actions' },
      h('a', { class: 'btn primary big', href: '#/setup', text: '🎲 Nuova challenge' }),
      resumable && h('a', { class: 'btn big', href: run.phase === 'ban' ? '#/ban' : '#/draft', text: `▶ Continua (${run.picks.length}/${run.catIds.length})` }),
      !resumable && run && h('a', { class: 'btn', href: '#/brief/' + run.id, text: '📦 Apri l’ultimo brief' }),
      h('div', { class: 'home-secondary' },
        h('a', { class: 'btn', href: '#/history', text: '📚 Storico' }),
        h('a', { class: 'btn', href: '#/pool', text: '🛠️ Personalizza' }),
        h('a', { class: 'btn', href: '#/stats', text: '📊 Statistiche' }),
        h('a', { class: 'btn', href: '#/settings', text: '⚙️ Impostazioni' }),
        h('a', { class: 'btn', href: '#/help', text: '❓ Come si gioca' }))));
}

/* ---------- Setup ---------- */

export function setup(root) {
  const last = S.getSettings().lastSetup;
  const pool = S.getPool();
  const count = (len) => E.selectCategories(E.resolveCategories(CATEGORIES, pool), len).length;
  const seedInput = h('input', { type: 'text', id: 'seed', value: last.seed || '', placeholder: 'es. DADO-LUPO-4821 (vuoto = casuale)', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false' });
  const customDays = h('input', { type: 'number', min: 1, max: 365, value: last.customDays || 7, 'aria-label': 'Giorni di scadenza', id: 'customDays' });
  const customRow = h('label', { class: 'field', hidden: last.deadline !== 'custom' }, 'Giorni a disposizione', customDays);

  const form = h('form', { class: 'stack', onsubmit: (e) => { e.preventDefault(); start(); } },
    h('div', { class: 'panel stack' },
      h('h2', { text: 'Modalità' }),
      choices('mode', [['classic', '🎯 Classica', 'scegli tra 3 opzioni'], ['chaos', '🌪️ Caos', 'tutto assegnato a caso']], last.mode)),
    h('div', { class: 'panel stack' },
      h('h2', { text: 'Lunghezza' }),
      choices('length', [['rapida', 'Rapida', `${count('rapida')} categorie`], ['standard', 'Standard', `${count('standard')} categorie`], ['completa', 'Completa', `${count('completa')} categorie`]], last.length)),
    h('div', { class: 'panel stack' },
      h('h2', { text: 'Reroll disponibili (per tutta la run)' }),
      choices('rerolls', [[0, '0', 'hardcore'], [1, '1'], [2, '2', 'consigliato'], [3, '3'], [-1, '∞', 'illimitati']], last.rerolls)),
    h('div', { class: 'panel stack' },
      h('h2', { text: 'Ban a inizio run' }),
      h('p', { class: 'muted small', text: 'Prima di cominciare puoi escludere dal pool fino a 3 elementi che proprio non vuoi vedere.' }),
      choices('bans', [[0, '0'], [1, '1'], [2, '2'], [3, '3']], last.bans)),
    h('div', { class: 'panel stack' },
      h('h2', { text: 'Seed' }),
      h('p', { class: 'muted small', text: 'Stesso seed + stesse impostazioni = stesse opzioni: la community può rifare la tua challenge.' }),
      h('div', { class: 'row' },
        h('div', { style: { flex: '1 1 220px' } }, seedInput),
        h('button', { type: 'button', class: 'btn', onclick: () => { seedInput.value = randomSeed(SEED_WORDS); }, text: '🎲 Genera' }))),
    h('div', { class: 'panel stack' },
      h('h2', { text: 'Deadline per creare il gioco' }),
      choices('deadline', [['none', 'Nessuna'], ['24h', '24 ore'], ['3d', '3 giorni'], ['1w', '1 settimana'], ['1m', '1 mese'], ['custom', 'Custom']], last.deadline),
      customRow),
    h('button', { class: 'btn primary big block', type: 'submit', text: '🚀 Inizia il draft' }));

  form.addEventListener('change', () => {
    customRow.hidden = new FormData(form).get('deadline') !== 'custom';
  });

  function start() {
    const f = new FormData(form); // NB: form.elements.length sarebbe il numero di campi, non il radio "length"
    const days = Math.max(1, Math.min(365, parseInt(customDays.value, 10) || 7));
    const dl = f.get('deadline');
    const setup = {
      mode: f.get('mode'), length: f.get('length'), rerolls: parseInt(f.get('rerolls'), 10),
      bans: parseInt(f.get('bans'), 10), seed: normalizeSeed(seedInput.value), deadline: dl, customDays: days,
    };
    S.updateSettings({ lastSetup: setup });
    const deadlineDays = dl === 'custom' ? days : DEADLINES[dl] || 0;
    startRun({
      seed: setup.seed || randomSeed(SEED_WORDS), mode: setup.mode, length: setup.length, rerolls: setup.rerolls,
      bans: setup.bans, skipAllowed: S.getSettings().skipEnabled, deadlineMs: deadlineDays * 86400000,
      pool: structuredClone(S.getPool()),
    });
  }

  root.append(topbar('Nuova challenge'), form);
}

/* ---------- Ban ---------- */

export function ban(root) {
  const run = S.getCurrentRun();
  if (!run || run.phase !== 'ban') return go('/home');
  const cats = E.resolveCategories(CATEGORIES, run.pool).filter((c) => run.catIds.includes(c.id));
  const counter = h('strong');
  const rows = [];
  const search = h('input', { type: 'search', placeholder: '🔍 Cerca un elemento…', 'aria-label': 'Cerca un elemento' });
  const refresh = () => {
    counter.textContent = `${run.banned.length}/${run.bansAllowed}`;
    rows.forEach(({ el, id }) => {
      const on = run.banned.includes(id);
      el.classList.toggle('banned', on);
      el.setAttribute('aria-pressed', String(on));
    });
  };
  const groups = cats.map((c) => {
    const body = h('div', { class: 'cat-body' });
    const det = h('details', { class: 'cat-acc' }, h('summary', {}, `${c.emoji} ${c.name}`), body);
    const items = c.items.map((i) => {
      const el = h('button', {
        type: 'button', class: 'item-row btn ghost', 'aria-pressed': 'false',
        onclick: () => {
          if (!E.toggleBan(run, i.id)) toast(`Hai già usato tutti i ${run.bansAllowed} ban`);
          S.saveRun(run); refresh(); buzz(15);
        },
      }, h('span', { class: 'emoji', text: i.emoji }), h('span', { class: 'grow' }, h('strong', { text: i.name }), ' ', h('span', { class: 'muted small', text: i.desc })));
      el.style.justifyContent = 'flex-start';
      el.style.textAlign = 'left';
      rows.push({ el, id: i.id });
      body.append(el);
      return { el, text: (i.name + ' ' + i.desc).toLowerCase() };
    });
    return { det, items };
  });
  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    groups.forEach(({ det, items }) => {
      let any = false;
      items.forEach(({ el, text }) => { const ok = !q || text.includes(q); el.hidden = !ok; any ||= ok; });
      det.hidden = !any;
      if (q) det.open = true;
    });
  });
  root.append(
    topbar('Fase ban', '/home'),
    h('div', { class: 'panel stack' },
      h('p', {}, 'Scegli fino a ', h('strong', { text: String(run.bansAllowed) }), ' elementi da escludere dal draft. Tocca di nuovo per annullare. Ban usati: ', counter),
      search),
    h('div', { class: 'list' }, groups.map((g) => g.det)),
    h('div', { class: 'actions' },
      h('button', { class: 'btn primary big', onclick: () => { E.startDraft(run, CATEGORIES); S.saveRun(run); go('/draft'); }, text: '🎬 Inizia il draft' })));
  refresh();
}

/* ---------- Draft ---------- */

/** Pannello "Il tuo gioco finora": tutte le scelte fatte (e le categorie saltate). */
function pickedPanel(run) {
  const done = run.picks.filter((p) => !p.auto);
  return h('details', { class: 'picked-panel', open: true },
    h('summary', {}, `🎲 Il tuo gioco finora (${done.filter((p) => !p.skipped).length}/${run.catIds.length})`),
    done.length
      ? h('ul', { class: 'picked-list' }, done.map((p) => h('li', { class: p.skipped ? 'skipped' : '' },
          h('span', { class: 'emoji', 'aria-hidden': 'true', text: p.skipped ? '⏭' : p.emoji }),
          h('span', {}, h('span', { class: 'cat', text: p.catName }), h('strong', { text: p.skipped ? 'Saltata' : p.name })))))
      : h('p', { class: 'muted small', text: 'Ancora nessuna scelta: la tua prima carta è qui sopra!' }));
}

function tagChips(item) {
  return (item.tags || []).map((t) => TAG_LABELS[t]).filter(Boolean).slice(0, 3).map((t) => h('span', { class: 'tag', text: t }));
}

export function draft(root) {
  const run = S.getCurrentRun();
  if (!run) return go('/home');
  if (run.phase === 'ban') return go('/ban');
  if (run.status === 'done') return go('/brief/' + run.id);
  if (!run.current) E.prepareCurrent(run, CATEGORIES);
  if (run.status === 'done') { S.saveRun(run); return go('/brief/' + run.id); }

  const cats = E.resolveCategories(CATEGORIES, run.pool);
  const timers = [];
  let selected = null;
  const chaos = run.mode === 'chaos';

  const clearTimers = () => { timers.forEach(clearTimeout); timers.length = 0; };

  function paint() {
    clearTimers();
    const cur = run.current;
    const cat = cats.find((c) => c.id === run.catIds[cur.catIdx]);
    const total = run.catIds.length;
    const info = E.poolInfo(run, CATEGORIES);
    if (!cur.counted) {
      cur.options.forEach((id) => S.bumpStat('shown', id));
      cur.counted = true;
      S.saveRun(run);
    }
    if (chaos) selected = cur.options[0];

    const cards = cur.options.map((id, i) => {
      const item = cat.items.find((x) => x.id === id);
      const card = h('div', {
        class: 'card' + (chaos ? ' selected' : ''), role: 'button', tabindex: 0, 'aria-pressed': String(chaos),
        'aria-label': `Opzione ${i + 1}: ${item.name}. ${item.desc}`, dataset: { id },
        onclick: () => select(id),
        onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(id); } },
      },
        h('div', { class: 'inner' },
          h('div', { class: 'face front' },
            h('span', { class: 'num', text: chaos ? '' : String(i + 1) }),
            h('div', { class: 'emoji', 'aria-hidden': 'true', text: item.emoji }),
            h('div', { class: 'txt' }, h('h3', { text: item.name }), h('p', { class: 'desc', text: item.desc }), h('div', { class: 'tags' }, tagChips(item)))),
          h('div', { class: 'face back', 'aria-hidden': 'true' })));
      return card;
    });

    const left = E.rerollsLeft(run);
    const confirmBtn = h('button', { class: 'btn primary big', id: 'confirm', onclick: confirm, disabled: !selected },
      chaos ? 'Avanti →' : selected ? `✔ Scegli «${cat.items.find((x) => x.id === selected)?.name}»` : 'Tocca una carta per sceglierla');
    const notes = [];
    if (info.available < info.total) notes.push(`🚫 ${info.total - info.available} elementi esclusi perché incompatibili con le tue scelte`);
    if (!chaos && cur.options.length < 3) notes.push(`Solo ${cur.options.length === 1 ? 'un’opzione compatibile' : cur.options.length + ' opzioni compatibili'}`);

    const view = h('div', { class: 'draft' },
      h('div', { class: 'progress-wrap' },
        h('div', { class: 'row between' },
          h('strong', { text: `Categoria ${cur.catIdx + 1}/${total}` }),
          h('span', { class: 'muted small' }, run.mode === 'chaos' ? '🌪️ Caos' : `Seed ${run.seed}`)),
        h('div', { class: 'progress-bar', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': total, 'aria-valuenow': cur.catIdx },
          h('b', { style: { width: `${(cur.catIdx / total) * 100}%` } }))),
      h('div', { class: 'cat-head' },
        h('div', { class: 'big-emoji', 'aria-hidden': 'true', text: cat.emoji }),
        h('h2', { text: cat.name }),
        h('p', { class: 'muted', text: cat.subtitle }),
        notes.map((n) => h('p', { class: 'hint', text: n }))),
      h('div', { class: 'cards' + (cur.options.length === 1 ? ' single' : '') }, cards),
      h('div', { class: 'actions' },
        h('button', { class: 'btn', onclick: undoPick, disabled: !run.picks.length, 'aria-keyshortcuts': 'Z', title: 'Tasto Z' }, '↩ Annulla ultima'),
        !chaos && h('button', { class: 'btn', onclick: doReroll, disabled: !E.canReroll(run), 'aria-keyshortcuts': 'R', title: 'Tasto R' },
          `🔄 Reroll (${left === Infinity ? '∞' : left})`),
        h('button', { class: 'btn', onclick: doSkip, title: 'Tasto S', 'aria-keyshortcuts': 'S' }, '⏭ Salta categoria'),
        confirmBtn),
      pickedPanel(run),
      h('p', { class: 'hint' }, chaos ? 'In modalità Caos le opzioni sono assegnate a caso.' : h('span', {}, 'Tastiera: ', h('span', { class: 'kbd', text: '1' }), ' ', h('span', { class: 'kbd', text: '2' }), ' ', h('span', { class: 'kbd', text: '3' }), ' scegli · ', h('span', { class: 'kbd', text: 'Invio' }), ' conferma · ', h('span', { class: 'kbd', text: 'R' }), ' reroll · ', h('span', { class: 'kbd', text: 'Z' }), ' annulla')));

    root.replaceChildren(view);
    reveal(root.querySelectorAll('.card'));
  }

  function reveal(cards) {
    const instant = reducedMotion();
    cards.forEach((c, i) => {
      if (instant) { c.classList.add('flipped'); return; }
      const delay = (chaos ? 900 : 450) + i * 650;
      timers.push(setTimeout(() => sfx.tick(), delay - 120));
      timers.push(setTimeout(() => { c.classList.add('flipped'); sfx.reveal(); buzz(10); }, delay));
    });
    if (instant && cards.length) sfx.reveal();
  }

  function select(id) {
    if (chaos) return;
    selected = id;
    const cat = cats.find((c) => c.id === run.catIds[run.current.catIdx]);
    root.querySelectorAll('.card').forEach((c) => {
      const on = c.dataset.id === id;
      c.classList.toggle('selected', on);
      c.setAttribute('aria-pressed', String(on));
      c.classList.add('flipped'); // se scegli durante la rivelazione, mostra subito
    });
    const btn = root.querySelector('#confirm');
    btn.disabled = false;
    btn.textContent = `✔ Scegli «${cat.items.find((x) => x.id === id)?.name}»`;
    sfx.tick(); buzz(10);
  }

  function confirm() {
    const id = chaos ? run.current.options[0] : selected;
    if (!id) return;
    E.choose(run, id, CATEGORIES);
    S.bumpStat('picked', id);
    S.saveRun(run);
    sfx.confirm(); buzz(25);
    selected = null;
    if (run.status === 'done') {
      S.bumpStat('runsCompleted');
      sfx.fanfare(); buzz([60, 40, 60]);
      return go('/brief/' + run.id);
    }
    paint();
  }

  function doReroll() {
    const catId = run.catIds[run.current.catIdx];
    if (!E.reroll(run, CATEGORIES)) return;
    S.bumpStat('rerolls', catId);
    S.saveRun(run);
    selected = null;
    sfx.tick(); buzz(15);
    paint();
  }

  function doSkip() {
    run.skipAllowed = true;
    if (!E.skip(run, CATEGORIES)) return;
    S.saveRun(run);
    selected = null;
    if (run.status === 'done') { S.bumpStat('runsCompleted'); return go('/brief/' + run.id); }
    paint();
  }

  function undoPick() {
    const last = E.undo(run, CATEGORIES);
    if (!last) return;
    if (last.itemId) S.bumpStat('picked', last.itemId, -1);
    S.saveRun(run);
    selected = null;
    sfx.tick();
    paint();
  }

  function onKey(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || document.querySelector('dialog[open]')) return;
    const k = e.key.toLowerCase();
    if (['1', '2', '3'].includes(k)) { const id = run.current.options[Number(k) - 1]; if (id) select(id); }
    else if (k === 'r') doReroll();
    else if (k === 'z') undoPick();
    else if (k === 's') doSkip();
    else if (k === 'enter' && e.target.tagName !== 'BUTTON' && e.target.getAttribute('role') !== 'button') { e.preventDefault(); confirm(); }
  }
  window.addEventListener('keydown', onKey);
  paint();
  return () => { clearTimers(); window.removeEventListener('keydown', onKey); };
}

/* ---------- Brief ---------- */

export function brief(root, params) {
  const run = params.id ? S.getRun(params.id) : S.getCurrentRun();
  if (!run) return go('/home');
  if (run.status !== 'done') { S.setCurrent(run.id); return go(run.phase === 'ban' ? '/ban' : '/draft'); }
  return renderBrief(root, run, false);
}

export function shared(root, params) {
  const run = X.decodeRun(params.payload || '');
  if (!run) {
    root.append(topbar('Link non valido'), h('div', { class: 'panel' }, h('p', { text: 'Questo link non contiene un brief valido.' })));
    return;
  }
  return renderBrief(root, run, true);
}

function renderBrief(root, run, readonly) {
  let saveTimer = null;
  const persist = () => {
    if (readonly) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => S.saveRun(run), 250);
  };

  const pitchEl = h('p', { class: 'pitch', text: makePitch(run) });
  const titleInput = h('input', {
    type: 'text', class: 'title-input', value: run.title || '', placeholder: 'Titolo del gioco…', 'aria-label': 'Titolo del gioco',
    maxlength: 80, readonly: readonly || null,
    oninput: (e) => { run.title = e.target.value; persist(); document.title = (run.title || 'Il tuo gioco') + ' · Dicetidice Boardgame Draft'; },
  });

  const picks = run.picks.filter((p) => !p.skipped);
  const skipped = run.picks.filter((p) => p.skipped);
  const pickEls = picks.map((p) =>
    h('div', { class: 'pick' },
      h('div', { class: 'emoji', 'aria-hidden': 'true', text: p.emoji }),
      h('div', {}, h('div', { class: 'cat', text: p.catName }), h('div', { class: 'name', text: p.name }), p.desc && h('div', { class: 'muted small', text: p.desc })),
      h('div', { style: { gridColumn: '2' } },
        h('input', {
          type: 'text', class: 'note', placeholder: 'Note su questa scelta…', value: p.note || '', 'aria-label': `Note su ${p.name}`,
          maxlength: 200, readonly: readonly || null, oninput: (e) => { p.note = e.target.value; persist(); },
        }))));

  const fmtSel = h('select', { 'aria-label': 'Formato immagine' }, Object.entries(X.FORMATS).map(([k, f]) => h('option', { value: k, text: f.label })));
  const toolbar = h('div', { class: 'panel stack' },
    h('h2', { text: 'Condividi e salva' }),
    h('div', { class: 'row' },
      h('button', { class: 'btn', onclick: async () => toast(await X.copyText(X.briefToText(run)) ? 'Testo copiato!' : 'Copia non riuscita'), text: '📋 Copia testo' }),
      h('button', { class: 'btn', onclick: () => X.downloadJson(run, `${X.slug(run.title || run.seed)}.json`), text: '🧾 Esporta JSON' }),
      h('button', { class: 'btn', onclick: shareClick, text: '📤 Condividi' }),
      h('button', { class: 'btn', onclick: async () => toast(await X.copyText(X.shareUrl(run)) ? 'Link copiato!' : 'Copia non riuscita'), text: '🔗 Copia link' })),
    h('div', { class: 'row' },
      h('div', { style: { flex: '1 1 220px' } }, fmtSel),
      h('button', { class: 'btn primary', onclick: async () => {
        const blob = await X.briefToPngBlob(run, fmtSel.value);
        if (blob) X.downloadBlob(blob, `${X.slug(run.title || run.seed)}-${fmtSel.value}.png`);
        else toast('Creazione immagine non riuscita');
      }, text: '🖼️ Scarica PNG' })));

  async function shareClick() {
    const data = { title: run.title || 'Il mio gioco da tavolo', text: X.briefToText(run), url: X.shareUrl(run) };
    if (X.canShare()) { if (await X.shareNative(data)) return; }
    toast(await X.copyText(X.shareUrl(run)) ? 'Condivisione non disponibile: link copiato!' : 'Condivisione non disponibile');
  }

  // Deadline + checklist (solo per le run proprie)
  const extras = [];
  let timer = null;
  if (!readonly && run.deadlineMs && run.finishedAt) {
    const end = run.finishedAt + run.deadlineMs;
    const cd = h('div', { class: 'countdown', 'aria-live': 'off' });
    const tick = () => { cd.textContent = fmtCountdown(end - Date.now()); };
    tick();
    timer = setInterval(tick, 1000);
    extras.push(h('div', { class: 'panel' }, h('h2', { text: '⏳ Tempo per realizzarlo' }), cd, h('p', { class: 'muted small', text: `Scade il ${fmtDate(end)}` })));
  }
  if (!readonly) {
    if (!run.checklist || run.checklist.length !== E.CHECKLIST.length) run.checklist = E.CHECKLIST.map(() => false);
    extras.push(h('div', { class: 'panel checklist' },
      h('h2', { text: '✅ Avanzamento del progetto' }),
      E.CHECKLIST.map((label, i) => {
        const lab = h('label', { class: run.checklist[i] ? 'done' : '' },
          h('input', { type: 'checkbox', checked: run.checklist[i], onchange: (e) => {
            run.checklist[i] = e.target.checked; lab.classList.toggle('done', e.target.checked); S.saveRun(run);
            if (run.checklist.every(Boolean)) { sfx.fanfare(); toast('Gioco completato! 🎉'); }
          } }),
          h('span', { text: label }));
        return lab;
      })));
  }

  const footer = readonly
    ? h('div', { class: 'row' },
        h('button', { class: 'btn primary', onclick: () => rerun({ ...run, rerollsAllowed: 2, skipAllowed: false, banned: [] }), text: '🎲 Rifai questa challenge' }),
        h('button', { class: 'btn', onclick: () => { const copy = { ...structuredClone(run), id: 'r' + Date.now().toString(36), shared: false }; S.saveRun(copy); toast('Salvato nello storico'); go('/brief/' + copy.id); }, text: '💾 Salva nello storico' }),
        h('a', { class: 'btn ghost', href: '#/home', text: 'Home' }))
    : h('div', { class: 'row' },
        h('button', { class: 'btn', onclick: () => { E.undo(run, CATEGORIES); S.saveRun(run); S.setCurrent(run.id); go('/draft'); }, text: '↩ Cambia l’ultima scelta' }),
        h('button', { class: 'btn', onclick: () => rerun(run), text: '🔁 Rifai con lo stesso seed' }),
        h('a', { class: 'btn', href: '#/setup', text: '🎲 Nuova challenge' }),
        h('a', { class: 'btn ghost', href: '#/home', text: 'Home' }));

  root.append(
    topbar(readonly ? 'Brief condiviso' : 'Il tuo gioco', readonly ? '/home' : '/home'),
    h('article', { class: 'gamebox' },
      h('div', { class: 'gamebox-head' },
        h('div', { class: 'brand', text: 'DICETIDICE · BOARDGAME DRAFT' }),
        titleInput,
        h('div', { class: 'row between', style: { marginTop: '.5rem' } },
          h('span', { class: 'muted small', text: `Seed ${run.seed} · ${MODE_LABEL[run.mode]}${run.createdAt ? ' · ' + fmtDate(run.createdAt) : ''}` }),
          !readonly && h('button', { class: 'btn', onclick: () => { run.title = makeTitle(run); titleInput.value = run.title; S.saveRun(run); sfx.tick(); }, text: '🎲 Genera titolo casuale' }))),
      pitchEl,
      h('div', { class: 'picks' }, pickEls),
      skipped.length > 0 && h('p', { class: 'muted small', style: { padding: '.6rem 1.2rem' }, text: `Categorie saltate: ${skipped.map((s) => s.catName).filter(Boolean).join(', ')}` })),
    ...extras,
    toolbar,
    footer);

  return () => { clearInterval(timer); clearTimeout(saveTimer); if (!readonly) S.saveRun(run); document.title = 'Dicetidice Boardgame Draft'; };
}

/* ---------- Storico ---------- */

export function history(root) {
  const runs = S.getRuns();
  const fileIn = h('input', { type: 'file', accept: 'application/json,.json', hidden: true, onchange: async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      const list = Array.isArray(data) ? data : data.runs;
      const n = Array.isArray(list) ? S.importRuns(list) : 0;
      toast(n ? `Importate ${n} run` : 'Nessuna run valida nel file');
      if (data.pool && Array.isArray(data.pool.disabledItems)) { /* il pool si importa dalla pagina Personalizza */ }
      go('/history');
    } catch { toast('File non valido'); }
  } });

  const items = runs.map((run) => {
    const st = statusOf(run);
    const open = () => { if (run.status === 'done') go('/brief/' + run.id); else { S.setCurrent(run.id); go(run.phase === 'ban' ? '/ban' : '/draft'); } };
    return h('div', { class: 'panel run-item' },
      h('div', { class: 'row between' }, h('h3', { text: run.title || 'Senza titolo' }), h('span', { class: 'tag ' + st.cls, text: st.t })),
      h('p', { class: 'muted small' }, `${fmtDate(run.createdAt)} · Seed ${run.seed} · ${MODE_LABEL[run.mode]} · ${E.LENGTHS[run.length]?.label || run.length} · ${run.picks.filter((p) => !p.skipped).length} scelte`),
      h('div', { class: 'row' },
        h('button', { class: 'btn primary', onclick: open, text: run.status === 'done' ? '📦 Apri brief' : '▶ Continua' }),
        h('button', { class: 'btn', onclick: () => rerun(run), text: '🔁 Rifai con lo stesso seed' }),
        h('button', { class: 'btn danger', onclick: async () => {
          if (await confirmDialog('Eliminare questa run dallo storico?', { ok: 'Elimina', danger: true })) { S.deleteRun(run.id); go('/history'); }
        }, text: '🗑️', 'aria-label': 'Elimina run' })));
  });

  root.append(
    topbar('Storico'),
    h('div', { class: 'row', style: { marginBottom: '1rem' } },
      h('button', { class: 'btn', onclick: () => X.downloadJson({ app: 'dicetidice-boardgame-draft', version: 1, exportedAt: new Date().toISOString(), runs: S.getRuns(), stats: S.getStats() }, 'dicetidice-storico.json'), disabled: !runs.length, text: '⬇️ Esporta tutto' }),
      h('button', { class: 'btn', onclick: () => fileIn.click(), text: '⬆️ Importa' }), fileIn),
    runs.length ? h('div', { class: 'list' }, items) : h('div', { class: 'panel' }, h('p', { text: 'Ancora nessuna run. Che aspetti?' }), h('a', { class: 'btn primary', href: '#/setup', text: '🎲 Nuova challenge' })));
}

/* ---------- Impostazioni ---------- */

export function settings(root) {
  const s = S.getSettings();
  const set = (patch) => { S.updateSettings(patch); applySettings(); };
  const buildLine = running.stamped ? `build #${running.build} · ${running.sha}` : 'build dev (locale)';
  const infoEl = h('p', { class: 'muted', text: buildLine + (running.date ? ` · ${fmtDate(Date.parse(running.date))}` : '') });

  root.append(
    topbar('Impostazioni'),
    h('div', { class: 'stack' },
      h('div', { class: 'panel' },
        switchRow('Suoni', 'Effetti generati al volo, nessun file audio', s.sound, (v) => { set({ sound: v }); if (v) sfx.confirm(); }),
        switchRow('Vibrazione', 'Solo sui dispositivi che la supportano', s.vibration, (v) => { set({ vibration: v }); buzz(40); }),
        switchRow('Animazioni', 'Disattivale per un’interfaccia statica (rispettiamo anche le preferenze di sistema)', s.animations, (v) => set({ animations: v })),
        switchRow('Modalità Stream', 'Interfaccia più grande e pulita, pensata per OBS a 16:9', s.stream, (v) => set({ stream: v }))),
      h('div', { class: 'panel stack' },
        h('h2', { text: 'Tema' }),
        (() => {
          const c = choices('theme', [['dark', '🌙 Scuro'], ['light', '☀️ Chiaro']], s.theme);
          c.addEventListener('change', (e) => set({ theme: e.target.value }));
          return c;
        })()),
      h('div', { class: 'panel stack' },
        h('h2', { text: 'Versione' }),
        infoEl,
        h('div', { class: 'row' },
          h('button', { class: 'btn', onclick: async () => {
            const remote = await fetchRemoteBuild();
            if (!remote) toast('Impossibile controllare (offline o in locale)');
            else if (isNewer(remote)) toast(`Nuova versione disponibile: build #${remote.build}`);
            else toast('Sei aggiornato ✔');
          }, text: '🔎 Controlla aggiornamenti' }),
          h('button', { class: 'btn', onclick: async () => {
            if (await confirmDialog('Svuoto la cache e ricarico l’app? I tuoi dati salvati restano al loro posto.', { ok: 'Forza aggiornamento' })) forceUpdate();
          }, text: '♻️ Forza aggiornamento' }))),
      h('div', { class: 'panel stack' },
        h('h2', { text: 'Dati' }),
        h('p', { class: 'muted small', text: 'Tutto è salvato solo su questo dispositivo (localStorage). Nessun tracking, nessun server.' }),
        h('button', { class: 'btn danger', onclick: async () => {
          if (await confirmDialog('Cancello storico, statistiche, pool personalizzato e impostazioni? Non si può annullare.', { ok: 'Cancella tutto', danger: true })) {
            S.resetAll(); applySettings(); toast('Dati azzerati'); go('/home');
          }
        }, text: '🗑️ Reset dati' })),
      h('div', { class: 'panel' },
        h('h2', { text: 'Credits' }),
        h('p', {}, 'Un’app di ', h('strong', { text: 'Dicetidice' }), ', il canale su giochi da tavolo e game design di Niky.'),
        h('p', { class: 'muted small', text: 'Idea ispirata dalle “draft challenge” a scelte multiple viste in giro per il web. Nessun logo o IP di terzi. Codice e dati in italiano, modificabili da data/categories.js.' }))));
}

/* ---------- Personalizza (editor del pool) ---------- */

export function pool(root) {
  const cfg = S.getPool();
  const save = () => S.savePool(cfg);
  const fileIn = h('input', { type: 'file', accept: 'application/json,.json', hidden: true, onchange: async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      const next = { disabledItems: [], disabledCats: [], customItems: {} };
      if (Array.isArray(d.disabledItems)) next.disabledItems = d.disabledItems.filter((x) => typeof x === 'string');
      if (Array.isArray(d.disabledCats)) next.disabledCats = d.disabledCats.filter((x) => typeof x === 'string');
      for (const [catId, list] of Object.entries(d.customItems || {})) {
        if (!CATEGORIES.some((c) => c.id === catId) || !Array.isArray(list)) continue;
        next.customItems[catId] = list.filter((i) => i && typeof i.name === 'string' && i.name.trim()).slice(0, 100).map((i) => ({
          id: typeof i.id === 'string' && i.id.startsWith(catId + '.') ? i.id : `${catId}.x-${Math.random().toString(36).slice(2, 8)}`,
          name: String(i.name).slice(0, 60), emoji: String(i.emoji || '⭐').slice(0, 8), desc: String(i.desc || '').slice(0, 140),
          tags: Array.isArray(i.tags) ? i.tags.map(String).slice(0, 12) : [], excludes: Array.isArray(i.excludes) ? i.excludes.map(String).slice(0, 12) : [], pitch: '',
        }));
      }
      S.savePool(next);
      toast('Pool importato');
      go('/pool');
    } catch { toast('File non valido'); }
  } });

  const accs = CATEGORIES.map((c) => {
    const customs = cfg.customItems[c.id] || [];
    const all = [...c.items, ...customs];
    const catOn = !cfg.disabledCats.includes(c.id);
    const body = h('div', { class: 'cat-body' });
    const summary = h('summary', {}, `${c.emoji} ${c.name}`, h('span', { class: 'tag', text: '' }));
    const updateSummary = () => {
      const off = all.filter((i) => cfg.disabledItems.includes(i.id)).length;
      summary.lastChild.textContent = catOn && !cfg.disabledCats.includes(c.id) ? `${all.length - off}/${all.length}` : 'disattivata';
    };
    body.append(h('label', { class: 'item-row' },
      h('input', { type: 'checkbox', checked: catOn, onchange: (e) => {
        if (e.target.checked) cfg.disabledCats = cfg.disabledCats.filter((x) => x !== c.id);
        else cfg.disabledCats.push(c.id);
        save(); updateSummary();
      } }), h('strong', { text: 'Categoria attiva' })));
    all.forEach((i) => {
      const isCustom = customs.includes(i);
      const row = h('div', { class: 'item-row' + (cfg.disabledItems.includes(i.id) ? ' off' : '') },
        h('input', { type: 'checkbox', checked: !cfg.disabledItems.includes(i.id), 'aria-label': `Attiva ${i.name}`, onchange: (e) => {
          if (e.target.checked) cfg.disabledItems = cfg.disabledItems.filter((x) => x !== i.id);
          else cfg.disabledItems.push(i.id);
          row.classList.toggle('off', !e.target.checked); save(); updateSummary();
        } }),
        h('span', { class: 'emoji', text: i.emoji }),
        h('span', { class: 'grow' }, h('strong', { text: i.name }), isCustom && h('span', { class: 'tag warn', style: { marginLeft: '.4rem' }, text: 'tuo' }), h('div', { class: 'muted small', text: i.desc })),
        isCustom && h('button', { class: 'btn ghost icon-btn', 'aria-label': `Elimina ${i.name}`, onclick: () => {
          cfg.customItems[c.id] = customs.filter((x) => x !== i); cfg.disabledItems = cfg.disabledItems.filter((x) => x !== i.id); save(); go('/pool');
        }, text: '🗑️' }));
      body.append(row);
    });
    // Aggiungi elemento
    const name = h('input', { type: 'text', placeholder: 'Nome', maxlength: 60, 'aria-label': 'Nome' });
    const emoji = h('input', { type: 'text', placeholder: '⭐', maxlength: 4, 'aria-label': 'Emoji', style: { maxWidth: '5rem' } });
    const desc = h('input', { type: 'text', placeholder: 'Descrizione di una riga', maxlength: 140, 'aria-label': 'Descrizione' });
    const tags = h('input', { type: 'text', placeholder: 'tag (es. dice, solo)', 'aria-label': 'Tag' });
    const excl = h('input', { type: 'text', placeholder: 'esclude (es. teams, board)', 'aria-label': 'Tag esclusi' });
    const split = (v) => v.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
    body.append(h('div', { class: 'panel stack', style: { marginTop: '.6rem' } },
      h('strong', { text: '➕ Aggiungi un tuo elemento' }),
      h('div', { class: 'row' }, h('div', { style: { flex: '1 1 160px' } }, name), emoji),
      desc,
      h('details', {}, h('summary', { class: 'muted small', text: 'Compatibilità avanzata (facoltativa)' }), h('div', { class: 'stack', style: { marginTop: '.5rem' } }, tags, excl)),
      h('button', { class: 'btn primary', onclick: () => {
        if (!name.value.trim()) return toast('Serve almeno un nome');
        (cfg.customItems[c.id] ||= []).push({
          id: `${c.id}.x-${Date.now().toString(36)}`, name: name.value.trim(), emoji: emoji.value.trim() || '⭐',
          desc: desc.value.trim(), tags: split(tags.value), excludes: split(excl.value), pitch: '',
        });
        save(); toast('Elemento aggiunto'); go('/pool');
      }, text: 'Aggiungi' })));
    updateSummary();
    return h('details', { class: 'cat-acc' }, summary, body);
  });

  root.append(
    topbar('Personalizza il pool'),
    h('div', { class: 'panel stack' },
      h('p', { class: 'muted', text: 'Attiva o disattiva singoli elementi o intere categorie e aggiungi i tuoi. Le modifiche valgono per le nuove run (le run già avviate mantengono il pool con cui sono partite).' }),
      h('div', { class: 'row' },
        h('button', { class: 'btn', onclick: () => X.downloadJson({ app: 'dicetidice-boardgame-draft-pool', version: 1, ...S.getPool() }, 'dicetidice-pool.json'), text: '⬇️ Esporta pool' }),
        h('button', { class: 'btn', onclick: () => fileIn.click(), text: '⬆️ Importa pool' }), fileIn,
        h('button', { class: 'btn ghost', onclick: async () => { if (await confirmDialog('Ripristinare il pool originale?', { ok: 'Ripristina' })) { S.savePool({}); go('/pool'); } }, text: '↺ Ripristina originale' }))),
    h('div', { class: 'list', style: { marginTop: '1rem' } }, accs));
}

/* ---------- Statistiche ---------- */

export function stats(root) {
  const st = S.getStats();
  const nameOf = (id) => { const f = findItem(id); return f ? `${f.item.emoji} ${f.item.name}` : id; };
  const top = (entries, n = 8) => entries.filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, n);
  const bars = (entries, label) => {
    if (!entries.length) return h('p', { class: 'muted', text: 'Ancora nessun dato.' });
    const max = entries[0][1];
    return h('div', {}, entries.map(([k, v]) => h('div', { class: 'bar-row' }, h('span', { text: label(k) }), h('div', { class: 'bar' }, h('b', { style: { width: `${(v / max) * 100}%` } })), h('strong', { text: String(v) }))));
  };
  const discarded = Object.entries(st.shown).map(([id, n]) => [id, n - (st.picked[id] || 0)]);
  const catName = (id) => { const c = CATEGORIES.find((x) => x.id === id); return c ? `${c.emoji} ${c.name}` : id; };
  root.append(
    topbar('Statistiche'),
    h('div', { class: 'stack' },
      h('div', { class: 'grid2' },
        h('div', { class: 'panel' }, h('h2', { text: 'Run avviate' }), h('div', { class: 'countdown', text: String(st.runsStarted || 0) })),
        h('div', { class: 'panel' }, h('h2', { text: 'Run completate (draft finito)' }), h('div', { class: 'countdown', text: String(st.runsCompleted || 0) }))),
      h('div', { class: 'panel' }, h('h2', { text: '🏆 Elementi più scelti' }), bars(top(Object.entries(st.picked)), nameOf)),
      h('div', { class: 'panel' }, h('h2', { text: '🗑️ Elementi più scartati' }), h('p', { class: 'muted small', text: 'Mostrati ma mai scelti.' }), bars(top(discarded), nameOf)),
      h('div', { class: 'panel' }, h('h2', { text: '🔄 Categorie più rerollate' }), bars(top(Object.entries(st.rerolls)), catName))));
}

/* ---------- Come si gioca ---------- */

export function help(root) {
  root.append(
    topbar('Come si gioca'),
    h('div', { class: 'panel help' },
      h('h2', { text: 'La challenge' }),
      h('ol', {},
        h('li', { text: 'Avvia una nuova challenge e scegli modalità, lunghezza e quanti reroll hai.' }),
        h('li', { text: 'Per ogni categoria (giocatori, ambientazione, meccaniche…) l’app propone 3 opzioni casuali: ne scegli una e confermi.' }),
        h('li', { text: 'Le opzioni incompatibili con le scelte già fatte non compaiono (un gioco solitario non avrà il traditore nascosto).' }),
        h('li', { text: 'Alla fine ottieni il brief: titolo, pitch e tutte le caratteristiche. Ora devi realizzare davvero quel gioco!' })),
      h('h2', { text: 'Modalità' }),
      h('ul', {},
        h('li', {}, h('strong', { text: 'Classica: ' }), 'scegli tra 3 opzioni per volta.'),
        h('li', {}, h('strong', { text: 'Caos: ' }), 'nessuna scelta, tutto assegnato a caso. Per i più coraggiosi.')),
      h('h2', { text: 'Reroll, ban, seed' }),
      h('ul', {},
        h('li', { text: 'Il reroll rigenera le 3 opzioni della categoria corrente e non ripropone quelle già viste finché non finiscono.' }),
        h('li', { text: 'Il ban ti fa escludere fino a 3 elementi prima di cominciare.' }),
        h('li', { text: 'Il seed rende la challenge ripetibile: stesso seed e stesse impostazioni, stesse opzioni.' })),
      h('h2', { text: 'Scorciatoie da tastiera' }),
      h('p', {}, h('span', { class: 'kbd', text: '1' }), ' ', h('span', { class: 'kbd', text: '2' }), ' ', h('span', { class: 'kbd', text: '3' }), ' scegli · ', h('span', { class: 'kbd', text: 'Invio' }), ' conferma · ', h('span', { class: 'kbd', text: 'R' }), ' reroll · ', h('span', { class: 'kbd', text: 'Z' }), ' annulla ultima scelta · ', h('span', { class: 'kbd', text: 'S' }), ' salta categoria'),
      h('h2', { text: 'Consigli per realizzare il gioco' }),
      h('ul', {},
        h('li', { text: 'Prototipa con carte di carta in 1 ora: brutto va benissimo, deve solo funzionare.' }),
        h('li', { text: 'Parti dalla meccanica principale e dalla condizione di vittoria: il resto si adatta.' }),
        h('li', { text: 'Se due scelte sembrano in conflitto, è lì che nasce l’idea migliore: usa il twist!' }),
        h('li', { text: 'Fai playtest presto, anche da solo, anche con persone che non conoscono il gioco.' }),
        h('li', { text: 'Segna i progressi nella checklist del brief: prototipo, playtest, revisione, versione finale, video.' })),
      h('h2', { text: 'Modalità Stream' }),
      h('p', { text: 'Dalle impostazioni puoi attivare un’interfaccia più grande e pulita, ottimizzata per registrare o trasmettere a 16:9.' })));
}
