// Test minimi del motore del draft. Esegui con: node tests/engine.test.mjs
import assert from 'node:assert/strict';
import { CATEGORIES } from '../data/categories.js';
import {
  createRun, startDraft, choose, reroll, undo, skip, prepareCurrent, resolveCategories,
  selectCategories, incompatible, isCompatible, canReroll,
} from '../js/draft-engine.js';
import { makeRng } from '../js/rng.js';
import { makePitch, makeTitle } from '../js/pitch.js';

let passed = 0;
const test = (name, fn) => {
  try { fn(); passed++; console.log('  ✓', name); } catch (e) { console.error('  ✗', name, '\n   ', e.message); process.exitCode = 1; }
};

const mk = (o = {}) => startDraft(createRun({ seed: 'DADO-LUPO-1234', mode: 'classic', length: 'completa', rerolls: 3, bans: 0, ...o }, CATEGORIES), CATEGORIES);
// Gioca una run intera scegliendo con un RNG indipendente (così il test copre molte combinazioni)
function playAll(run, pickSeed = 'x', rerollEvery = 0) {
  const r = makeRng(pickSeed);
  let guard = 0;
  while (run.current && guard++ < 200) {
    if (rerollEvery && r.int(rerollEvery) === 0 && canReroll(run)) { reroll(run, CATEGORIES); continue; }
    choose(run, r.pick(run.current.options), CATEGORIES);
  }
  return run;
}

console.log('Dati');
test('21 categorie, ordine e livelli', () => {
  assert.equal(CATEGORIES.length, 21);
  assert.equal(selectCategories(CATEGORIES, 'rapida').length, 7);
  assert.equal(selectCategories(CATEGORIES, 'standard').length, 14);
  assert.equal(selectCategories(CATEGORIES, 'completa').length, 21);
});
test('id univoci e campi obbligatori', () => {
  const ids = new Set();
  for (const c of CATEGORIES) for (const i of c.items) {
    assert.ok(i.name && i.emoji && i.desc, i.id);
    assert.ok(!ids.has(i.id), 'duplicato ' + i.id); ids.add(i.id);
  }
});
test('ogni categoria ha almeno 3 elementi', () => CATEGORIES.forEach((c) => assert.ok(c.items.length >= 3, c.id)));

console.log('Compatibilità');
const byId = (id) => CATEGORIES.flatMap((c) => c.items).find((i) => i.id === id);
test('regole minime della specifica', () => {
  const bad = [
    ['players.solo', 'interaction.traitor'], ['players.solo', 'interaction.1vsall'], ['players.solo', 'interaction.teams'],
    ['players.solo', 'mech2.negotiation'], ['players.solo', 'interaction.diplo'],
    ['components.cards', 'components.board'], ['components.cards', 'components.mini'], ['components.cards', 'components.boards'],
    ['map.none', 'map.grid'], ['map.none', 'map.hex'], ['luck.zero', 'mech2.dice'], ['luck.zero', 'luck.high'],
    ['interaction.coop', 'interaction.direct'], ['interaction.coop', 'interaction.traitor'], ['interaction.coop', 'win.vp'],
    ['twist.silent', 'mech2.negotiation'], ['twist.silent', 'interaction.diplo'], ['twist.silent', 'mech1.bluff'],
    ['constraint.noboard', 'map.grid'], ['constraint.noboard', 'map.nodes'], ['audience.kids', 'audience.hardcore'],
  ];
  for (const [a, b] of bad) assert.ok(incompatible(byId(a), byId(b)), `${a} dovrebbe escludere ${b}`);
});
test('elementi compatibili restano compatibili', () => {
  assert.ok(!incompatible(byId('players.2-4'), byId('interaction.direct')));
  assert.ok(isCompatible(byId('mech1.deck'), [byId('setting.fantasy')]));
});

console.log('Motore');
test('3 opzioni distinte in ogni categoria (modalità classica)', () => {
  for (let s = 0; s < 40; s++) {
    const run = mk({ seed: 'S' + s });
    while (run.current) {
      const o = run.current.options;
      assert.ok(o.length >= 1 && o.length <= 3);
      assert.equal(new Set(o).size, o.length, 'opzioni duplicate');
      choose(run, o[0], CATEGORIES);
    }
  }
});
test('nessuna coppia incompatibile in una run completa (100 seed, con reroll)', () => {
  for (let s = 0; s < 100; s++) {
    const run = playAll(mk({ seed: 'C' + s, rerolls: -1 }), 'p' + s, 3);
    const items = run.picks.filter((p) => !p.skipped);
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++)
      assert.ok(!incompatible(items[i], items[j]), `${items[i].itemId} vs ${items[j].itemId} (seed C${s})`);
    assert.equal(run.status, 'done');
  }
});
test('determinismo: stesso seed e stesse scelte => stessi risultati', () => {
  const a = playAll(mk({ seed: 'DETERMINISMO' }), 'k', 4);
  const b = playAll(mk({ seed: 'DETERMINISMO' }), 'k', 4);
  assert.deepEqual(a.picks.map((p) => p.itemId), b.picks.map((p) => p.itemId));
  const c = playAll(mk({ seed: 'ALTRO-SEED' }), 'k', 4);
  assert.notDeepEqual(a.picks.map((p) => p.itemId), c.picks.map((p) => p.itemId));
});
test('modalità caos: deterministica, una sola opzione, niente reroll', () => {
  const a = playAll(mk({ seed: 'CAOS', mode: 'chaos' }));
  const b = playAll(mk({ seed: 'CAOS', mode: 'chaos' }));
  assert.deepEqual(a.picks.map((p) => p.itemId), b.picks.map((p) => p.itemId));
  assert.equal(mk({ mode: 'chaos' }).current.options.length, 1);
  assert.equal(canReroll(mk({ mode: 'chaos' })), false);
});
test('reroll: niente ripetizioni finché il pool non si esaurisce', () => {
  const run = mk({ seed: 'REROLL', rerolls: -1 });
  const pool = run.current.options.length; // 3
  const cat = resolveCategories(CATEGORIES, run.pool)[0]; // players: 11 elementi
  const seen = [...run.current.options];
  for (let i = 0; i < 2; i++) { reroll(run, CATEGORIES); seen.push(...run.current.options); }
  assert.equal(pool, 3);
  assert.equal(new Set(seen).size, 9, 'nei primi 3 giri nessuna opzione si ripete');
  assert.ok(cat.items.length >= 9);
  // Dopo l'esaurimento continua a dare 3 opzioni distinte
  for (let i = 0; i < 6; i++) { reroll(run, CATEGORIES); assert.equal(new Set(run.current.options).size, 3); }
});
test('limite reroll rispettato', () => {
  const run = mk({ rerolls: 2 });
  assert.ok(reroll(run, CATEGORIES)); assert.ok(reroll(run, CATEGORIES));
  assert.equal(reroll(run, CATEGORIES), false);
  const zero = mk({ rerolls: 0 });
  assert.equal(canReroll(zero), false);
});
test('ban: gli elementi bannati non compaiono mai', () => {
  const banned = CATEGORIES[0].items.slice(0, 8).map((i) => i.id);
  const run = createRun({ seed: 'BAN', mode: 'classic', length: 'rapida', rerolls: -1, bans: 3, banned }, CATEGORIES);
  startDraft(run, CATEGORIES);
  for (let i = 0; i < 10; i++) { run.current.options.forEach((id) => assert.ok(!banned.includes(id))); reroll(run, CATEGORIES); }
});
test('Solitario non propone mai interazioni multigiocatore', () => {
  for (let s = 0; s < 50; s++) {
    const run = mk({ seed: 'SOLO' + s, length: 'rapida' });
    choose(run, 'players.solo', CATEGORIES) || (run.current.options = ['players.solo'], choose(run, 'players.solo', CATEGORIES));
    playAll(run, 'z' + s);
    const ids = run.picks.map((p) => p.itemId);
    for (const bad of ['interaction.traitor', 'interaction.1vsall', 'interaction.teams', 'interaction.diplo', 'mech2.negotiation'])
      assert.ok(!ids.includes(bad), bad);
  }
});
test('pool con meno di 3 elementi compatibili: mostra quelli disponibili', () => {
  const run = mk({ seed: 'POCHI', length: 'rapida' });
  run.current.options = ['players.solo']; choose(run, 'players.solo', CATEGORIES);
  // Dopo "Solitario" l'interazione ha pochi elementi compatibili
  while (run.current && run.current.catIdx < 4) choose(run, run.current.options[0], CATEGORIES);
  assert.equal(run.current.catIdx, 4);
  assert.ok(run.current.options.length >= 1 && run.current.options.length <= 3);
});
test('undo ripristina le stesse opzioni', () => {
  const run = mk({ seed: 'UNDO' });
  const before = [...run.current.options];
  choose(run, before[1], CATEGORIES);
  assert.equal(run.picks.length, 1);
  undo(run, CATEGORIES);
  assert.equal(run.picks.length, 0);
  assert.deepEqual(run.current.options, before);
});
test('skip registra la categoria come saltata', () => {
  const run = mk({ skipAllowed: true });
  assert.ok(skip(run, CATEGORIES));
  assert.ok(run.picks[0].skipped);
  assert.equal(skip(mk({ skipAllowed: false }), CATEGORIES), false);
});

console.log('Pitch e titolo');
test('pitch e titolo non vuoti', () => {
  const run = playAll(mk({ seed: 'PITCH' }));
  const pitch = makePitch(run);
  assert.ok(pitch.startsWith('Un gioco da tavolo') && pitch.length > 60, pitch);
  assert.ok(makeTitle(run, makeRng('t')).length > 3);
});

console.log(`\n${passed} test superati`);
