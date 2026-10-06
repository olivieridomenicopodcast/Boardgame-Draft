/** Avvio dell'app: router a hash, service worker, badge di build, banner di aggiornamento. */
import { FACTS } from '../data/facts.js';
import * as V from './views.js';
import { applySettings, h, reducedMotion, fmtDate } from './ui.js';
import { running, fetchRemoteBuild, isNewer, displayBuild, forceUpdate } from './build.js';
import { subscribe } from './state.js';

const view = document.getElementById('view');
let cleanup = null;

/* ---------- Router ---------- */
const ROUTES = {
  home: V.home, setup: V.setup, ban: V.ban, draft: V.draft, history: V.history, settings: V.settings,
  pool: V.pool, stats: V.stats, help: V.help, brief: V.brief, s: V.shared,
};

function render() {
  if (typeof cleanup === 'function') { try { cleanup(); } catch { /* ignora */ } }
  cleanup = null;
  const parts = location.hash.replace(/^#\/?/, '').split('/');
  const name = parts[0] || 'home';
  const fn = ROUTES[name] || V.home;
  view.replaceChildren();
  document.title = 'Dicetidice Boardgame Draft';
  const params = name === 's' ? { payload: parts.slice(1).join('/') } : { id: parts[1] };
  cleanup = fn(view, params);
  window.scrollTo(0, 0);
  view.focus({ preventScroll: true });
}
window.addEventListener('hashchange', render);

/* ---------- Badge di build ---------- */
const badge = document.getElementById('build-badge');
let remoteInfo = null;
let badgeOpen = false;
function paintBadge() {
  const b = displayBuild(remoteInfo);
  const base = b.build === 'dev' ? 'build dev' : `build #${b.build}`;
  const more = [b.sha, b.date ? fmtDate(Date.parse(b.date)) : ''].filter(Boolean).join(' · ');
  badge.textContent = badgeOpen && more ? `${base} · ${more}` : base;
  badge.setAttribute('aria-expanded', String(badgeOpen));
}
badge.addEventListener('click', () => { badgeOpen = !badgeOpen; paintBadge(); });

/* ---------- Aggiornamenti ---------- */
const banner = document.getElementById('update-banner');
let swReg = null;
let updating = false;

function offerUpdate(remote) {
  if (!running.stamped) return; // in dev il SW è network-first: niente banner
  const label = remote?.build ? `Nuova versione disponibile (build #${remote.build})` : 'Nuova versione disponibile';
  banner.replaceChildren(h('span', { text: label }), h('button', { class: 'btn', onclick: applyUpdate, text: 'Aggiorna' }));
  banner.hidden = false;
}

async function applyUpdate() {
  updating = true;
  try {
    if (swReg) {
      await swReg.update().catch(() => {});
      const waiting = swReg.waiting || (await waitForWaiting(swReg, 6000));
      if (waiting) {
        waiting.postMessage({ type: 'SKIP_WAITING' }); // poi 'controllerchange' ricarica la pagina
        setTimeout(() => location.reload(), 4000); // rete di sicurezza
        return;
      }
    }
  } catch { /* si passa al piano B */ }
  forceUpdate(); // piano B: svuota cache e ricarica
}

function waitForWaiting(reg, ms) {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(null), ms);
    const w = reg.installing;
    if (!w) return clearTimeout(t), resolve(reg.waiting || null);
    w.addEventListener('statechange', () => { if (w.state === 'installed') { clearTimeout(t); resolve(reg.waiting); } });
  });
}

async function checkRemote() {
  const remote = await fetchRemoteBuild();
  if (remote) { remoteInfo = remote; paintBadge(); }
  if (isNewer(remote)) { offerUpdate(remote); swReg?.update().catch(() => {}); }
}

async function setupServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    swReg = await navigator.serviceWorker.register('sw.js');
    const watch = (w) => w.addEventListener('statechange', () => {
      if (w.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(remoteInfo);
    });
    if (swReg.waiting && navigator.serviceWorker.controller) offerUpdate(remoteInfo);
    swReg.addEventListener('updatefound', () => swReg.installing && watch(swReg.installing));
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (updating) location.reload(); });
  } catch { /* offline/HTTP: l'app funziona comunque */ }
}

/* ---------- Avvio ---------- */
function hideSplash() {
  const s = document.getElementById('splash');
  s.classList.add('hide');
  setTimeout(() => s.remove(), 500);
}

applySettings();
subscribe(applySettings);
document.getElementById('splash-fact').textContent = 'Lo sapevi che… ' + FACTS[Math.floor(Math.random() * FACTS.length)];
paintBadge();
render();
setTimeout(hideSplash, reducedMotion() ? 500 : 1500);
setupServiceWorker();
checkRemote();
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkRemote(); });
window.addEventListener('online', checkRemote);
setInterval(checkRemote, 10 * 60 * 1000);
