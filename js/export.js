/** Esportazione del brief: testo, JSON, PNG (canvas), link condivisibile, condivisione nativa. */
import { CATEGORIES } from '../data/categories.js';
import { makePitch, briefToText } from './pitch.js';

export { briefToText };

/* ---------- Download / clipboard / share ---------- */

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const downloadJson = (obj, filename) =>
  downloadBlob(new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' }), filename);

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback per contesti senza Clipboard API
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { /* niente */ }
    ta.remove();
    return ok;
  }
}

export const canShare = () => typeof navigator.share === 'function';
export async function shareNative(data) {
  try {
    await navigator.share(data);
    return true;
  } catch {
    return false;
  }
}

export const slug = (s) =>
  (s || 'gioco').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'gioco';

/* ---------- Link condivisibile (stato nell'hash) ---------- */

function toB64Url(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromB64Url(s) {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function encodeRun(run) {
  const o = {
    v: 1, t: run.title || '', s: run.seed, m: run.mode, l: run.length,
    p: run.picks.filter((p) => !p.skipped).map((p) => [p.catId, p.itemId, p.name, p.emoji, p.note || '']),
  };
  return toB64Url(JSON.stringify(o));
}

export function shareUrl(run) {
  const base = location.href.split('#')[0];
  return `${base}#/s/${encodeRun(run)}`;
}

/** Ricostruisce una run "di sola lettura" da un link condiviso. Ritorna null se non valido. */
export function decodeRun(payload) {
  try {
    const o = JSON.parse(fromB64Url(payload));
    if (!o || !Array.isArray(o.p) || !o.s) return null;
    const picks = o.p.map(([catId, itemId, name, emoji, note]) => {
      const cat = CATEGORIES.find((c) => c.id === catId);
      const item = cat?.items.find((i) => i.id === itemId);
      return {
        catId, catName: cat?.name || catId, catEmoji: cat?.emoji || '🎲',
        itemId, name: item?.name || name, emoji: item?.emoji || emoji, desc: item?.desc || '',
        tags: item?.tags || [], excludes: item?.excludes || [], pitch: item?.pitch || '', note: note || '',
      };
    });
    return {
      id: 'shared', shared: true, seed: o.s, mode: o.m === 'chaos' ? 'chaos' : 'classic', length: o.l || 'standard',
      title: o.t || '', picks, status: 'done', createdAt: Date.now(), checklist: [], rerollsAllowed: 2, banned: [], pool: {},
      catIds: picks.map((p) => p.catId),
    };
  } catch {
    return null;
  }
}

/* ---------- PNG (canvas) ---------- */

export const FORMATS = {
  '16x9': { w: 1920, h: 1080, label: '16:9 (miniatura/video)' },
  '9x16': { w: 1080, h: 1920, label: '9:16 (Shorts/TikTok/Stories)' },
  '1x1': { w: 1080, h: 1080, label: '1:1 (quadrato)' },
};

const FONT = '"Segoe UI", system-ui, -apple-system, Roboto, "Noto Sans", Arial, sans-serif';
const EMOJI = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji"';

function fit(ctx, text, maxW, size, weight = 700, min = 14) {
  let s = size;
  for (; s > min; s -= 2) {
    ctx.font = `${weight} ${s}px ${FONT}`;
    if (ctx.measureText(text).width <= maxW) break;
  }
  ctx.font = `${weight} ${s}px ${FONT}`;
  return s;
}

function wrap(ctx, text, maxW, maxLines) {
  const words = text.split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '') + '…';
  }
  return lines;
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h);
}

export function drawBrief(canvas, run, format = '16x9') {
  const F = FORMATS[format] || FORMATS['16x9'];
  const { w, h } = F;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const wide = w > h;
  const pad = Math.round(Math.min(w, h) * 0.05);

  // Sfondo
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#2a1c13'); g.addColorStop(1, '#0f0c0a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  // Motivo a pallini (pips) discreto
  ctx.fillStyle = 'rgba(245,165,36,0.05)';
  for (let y = 40; y < h; y += 90) for (let x = (y / 90) % 2 ? 40 : 85; x < w; x += 90) { ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill(); }
  // Cornice "scatola"
  ctx.strokeStyle = '#f5a524'; ctx.lineWidth = 6; rr(ctx, 20, 20, w - 40, h - 40, 30); ctx.stroke();
  ctx.strokeStyle = 'rgba(245,165,36,.35)'; ctx.lineWidth = 2; rr(ctx, 34, 34, w - 68, h - 68, 22); ctx.stroke();

  // Intestazione
  const picks = run.picks.filter((p) => !p.skipped);
  let y = pad + 20;
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  ctx.fillStyle = '#f5a524';
  ctx.font = `800 ${Math.round(h * (wide ? 0.03 : 0.018))}px ${FONT}`;
  ctx.fillText('DICETIDICE · BOARDGAME DRAFT', pad, y + 10);
  y += Math.round(h * (wide ? 0.02 : 0.015));
  const title = run.title || 'Il mio gioco da tavolo';
  const titleSize = fit(ctx, title, w - pad * 2, Math.round(h * (wide ? 0.105 : 0.06)), 900, 36);
  ctx.fillStyle = '#f4ead8';
  y += titleSize;
  ctx.fillText(title, pad, y);
  ctx.font = `600 ${Math.round(h * (wide ? 0.024 : 0.015))}px ${FONT}`;
  ctx.fillStyle = '#b9a98f';
  y += Math.round(h * 0.035);
  ctx.fillText(`Seed ${run.seed} · ${run.mode === 'chaos' ? 'Modalità Caos' : 'Modalità Classica'}`, pad, y);

  // Piè di pagina (pitch)
  const pitch = makePitch(run);
  const pitchSize = Math.round(h * (wide ? 0.027 : 0.0165));
  ctx.font = `500 ${pitchSize}px ${FONT}`;
  const lines = wrap(ctx, pitch, w - pad * 2, wide ? 3 : 5);
  const footH = lines.length * pitchSize * 1.35 + 20;
  const footY = h - pad - footH + pitchSize;

  // Griglia delle scelte
  const cols = wide ? 3 : format === '1x1' && picks.length > 14 ? 3 : 2;
  const rows = Math.max(1, Math.ceil(picks.length / cols));
  const gridTop = y + Math.round(h * 0.03);
  const gridBottom = footY - pitchSize - 14;
  const gap = Math.round(w * 0.012);
  const cellW = (w - pad * 2 - gap * (cols - 1)) / cols;
  const cellH = Math.min(wide ? 120 : 150, (gridBottom - gridTop - gap * (rows - 1)) / rows);
  picks.forEach((p, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = pad + col * (cellW + gap), yy = gridTop + row * (cellH + gap);
    ctx.fillStyle = 'rgba(255,255,255,0.06)'; rr(ctx, x, yy, cellW, cellH, 14); ctx.fill();
    ctx.fillStyle = '#f5a524'; rr(ctx, x, yy, 7, cellH, 4); ctx.fill();
    const em = Math.round(cellH * 0.5);
    ctx.font = `${em}px ${EMOJI}`; ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle';
    ctx.fillText(p.emoji, x + 22, yy + cellH / 2 + 2);
    const tx = x + 22 + em + 16, tw = cellW - (tx - x) - 14;
    ctx.textBaseline = 'alphabetic';
    const ls = Math.max(13, Math.round(cellH * 0.19));
    ctx.font = `700 ${ls}px ${FONT}`; ctx.fillStyle = '#f5a524';
    ctx.fillText(p.catName.toUpperCase(), tx, yy + cellH * 0.36, tw);
    fit(ctx, p.name, tw, Math.round(cellH * 0.3), 800, 14);
    ctx.fillStyle = '#f4ead8';
    ctx.fillText(p.name, tx, yy + cellH * 0.7);
  });

  // Pitch
  ctx.font = `500 ${pitchSize}px ${FONT}`; ctx.fillStyle = '#d8ccb6'; ctx.textBaseline = 'alphabetic';
  lines.forEach((l, i) => ctx.fillText(l, pad, footY + i * pitchSize * 1.35));
  return canvas;
}

export function briefToPngBlob(run, format) {
  const canvas = document.createElement('canvas');
  drawBrief(canvas, run, format);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}
