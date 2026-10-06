// Verifica che ogni file elencato nel PRECACHE del service worker esista davvero
// (un file mancante farebbe fallire l'installazione del SW e quindi l'offline).
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const m = sw.match(/const PRECACHE = \[([\s\S]*?)\];/);
assert.ok(m, 'PRECACHE non trovato in sw.js');
const files = [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]).filter((f) => f !== './');
for (const f of files) assert.ok(fs.existsSync(path.join(root, f)), `PRECACHE: manca ${f}`);

// Ogni modulo js/ e data/ deve essere nel PRECACHE, altrimenti offline si rompe.
for (const dir of ['js', 'data', 'css']) {
  for (const f of fs.readdirSync(path.join(root, dir))) assert.ok(files.includes(`${dir}/${f}`), `manca nel PRECACHE: ${dir}/${f}`);
}
console.log(`  ✓ PRECACHE coerente (${files.length} file)`);
