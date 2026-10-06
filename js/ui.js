/** Helper UI: creazione elementi, toast, dialog di conferma, tema, vibrazione. */
import { getSettings } from './state.js';
import { setSoundEnabled } from './audio.js';

/** h('div', {class:'x', onclick: fn}, 'testo', altroElemento) — niente innerHTML: i testi utente restano testo. */
export function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

export const reducedMotion = () =>
  !getSettings().animations || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function buzz(ms = 20) {
  if (getSettings().vibration && navigator.vibrate) {
    try { navigator.vibrate(ms); } catch { /* alcuni browser la bloccano */ }
  }
}

export function toast(msg, ms = 2400) {
  const box = document.getElementById('toasts');
  if (!box) return;
  const t = h('div', { class: 'toast', text: msg });
  box.append(t);
  setTimeout(() => t.remove(), ms);
}

/** Dialog di conferma accessibile (<dialog>). Ritorna una Promise<boolean>. */
export function confirmDialog(message, { ok = 'Conferma', cancel = 'Annulla', danger = false } = {}) {
  return new Promise((resolve) => {
    const dlg = h('dialog', { class: 'dialog', 'aria-label': message });
    const done = (v) => { dlg.close(); dlg.remove(); resolve(v); };
    dlg.append(
      h('p', { text: message }),
      h('div', { class: 'row end' },
        h('button', { class: 'btn ghost', onclick: () => done(false), text: cancel }),
        h('button', { class: 'btn ' + (danger ? 'danger' : 'primary'), onclick: () => done(true), text: ok })),
    );
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); done(false); });
    document.body.append(dlg);
    dlg.showModal();
  });
}

export function applySettings() {
  const s = getSettings();
  const root = document.documentElement;
  root.dataset.theme = s.theme === 'light' ? 'light' : 'dark';
  root.classList.toggle('stream', !!s.stream);
  root.classList.toggle('no-anim', reducedMotion());
  setSoundEnabled(s.sound);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = s.theme === 'light' ? '#f6efe3' : '#14110f';
}

export const fmtDate = (ms) =>
  new Date(ms).toLocaleString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export function fmtCountdown(ms) {
  if (ms <= 0) return 'Scaduta!';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400), hh = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  const p = (n) => String(n).padStart(2, '0');
  return `${d ? d + 'g ' : ''}${p(hh)}:${p(m)}:${p(ss)}`;
}
