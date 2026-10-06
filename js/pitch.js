/** Generatore di pitch e titoli (template in italiano). Puro, testabile da Node. */
import { makeRng } from './rng.js';
import { NOUNS, ADJECTIVES, GENITIVES } from '../data/words.js';

const pickOf = (run, catId) => run.picks.find((p) => p.catId === catId && !p.skipped);
const low = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);

export function makePitch(run) {
  const g = (id) => pickOf(run, id);
  const players = g('players'), aud = g('audience'), setting = g('setting'), tone = g('tone');
  const m1 = g('mech1'), m2 = g('mech2'), inter = g('interaction'), win = g('win');
  const comp = g('components'), constraint = g('constraint'), key = g('keyword');

  const s = [];
  const head = ['Un gioco da tavolo'];
  if (tone) head.push(tone.pitch || low(tone.name));
  if (players) head.push(players.pitch || `per ${players.name}`);
  let first = head.join(' ');
  first += setting ? `, ${setting.pitch || 'ambientato in ' + low(setting.name)}.` : '.';
  s.push(first);
  if (aud) s.push(`È ${aud.pitch || 'pensato per ' + low(aud.name)}.`);
  if (inter) s.push(`L’interazione è ${inter.pitch || low(inter.name)}.`);
  if (m1) {
    let t = `Si basa su ${low(m1.name)}`;
    if (m2) t += `, con ${low(m2.name)}`;
    if (comp) t += `, e si gioca con ${low(comp.name)}`;
    s.push(t + '.');
  } else if (comp) s.push(`Si gioca con ${low(comp.name)}.`);
  if (win) s.push(`Si vince ${win.pitch || 'come da regola: ' + low(win.name)}.`);
  if (constraint) s.push(`Vincolo di produzione: ${low(constraint.name)}.`);
  if (key) s.push(`Parola guida: «${key.name}».`);
  return s.join(' ');
}

/** Titolo casuale; se c'è una parola chiave la usa a volte come ispirazione. Rng opzionale (per i test). */
export function makeTitle(run, rng = makeRng(Math.random() + ':' + Date.now())) {
  const key = pickOf(run, 'keyword');
  const n = rng.pick(NOUNS);
  const adj = rng.pick(ADJECTIVES)[n.g === 'm' ? 0 : 1];
  const patterns = [
    () => `${n.art === 'L’' ? 'L’' : n.art + ' '}${n.w} ${adj}`,
    () => `${n.art === 'L’' ? 'L’' : n.art + ' '}${n.w} ${rng.pick(GENITIVES)}`,
  ];
  if (key) {
    patterns.push(() => `${key.name}: ${n.art === 'L’' ? 'L’' : n.art + ' '}${n.w} ${adj}`);
    patterns.push(() => `${n.art === 'L’' ? 'L’' : n.art + ' '}${n.w} di ${key.name}`);
  }
  return rng.pick(patterns)();
}

/** Testo semplice del brief (per "Copia come testo"). */
export function briefToText(run) {
  const lines = [];
  lines.push(`🎲 ${run.title || 'Il mio gioco da tavolo'} — Dicetidice Boardgame Draft`);
  lines.push(`Seed: ${run.seed} · Modalità: ${run.mode === 'chaos' ? 'Caos' : 'Classica'}`);
  lines.push('');
  for (const p of run.picks) {
    if (p.skipped) continue;
    lines.push(`${p.emoji} ${p.catName}: ${p.name}${p.note ? ` (${p.note})` : ''}`);
  }
  lines.push('');
  lines.push(makePitch(run));
  return lines.join('\n');
}
