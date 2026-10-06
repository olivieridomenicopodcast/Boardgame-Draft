#!/usr/bin/env node
/**
 * Prepara la cartella da pubblicare (default: dist/):
 *  - copia i file dell'app (esclude test, tools, .github, ecc.)
 *  - scrive build.json {build, sha, date}
 *  - sostituisce i segnaposto __BUILD__/__SHA__/__BUILD_DATE__ in sw.js e js/version.js
 *
 * Variabili d'ambiente (le imposta la GitHub Action): BUILD_NUMBER, BUILD_SHA, BUILD_DATE.
 * Uso locale:  BUILD_NUMBER=7 node tools/stamp-build.mjs --out dist
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outArg = process.argv.indexOf('--out');
const out = path.resolve(root, outArg > -1 ? process.argv[outArg + 1] : 'dist');

const build = process.env.BUILD_NUMBER || 'dev';
const sha = (process.env.BUILD_SHA || 'local').slice(0, 7);
const date = process.env.BUILD_DATE || new Date().toISOString();

const INCLUDE = ['index.html', 'manifest.json', 'sw.js', 'css', 'js', 'data', 'icons'];
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const item of INCLUDE) fs.cpSync(path.join(root, item), path.join(out, item), { recursive: true });

for (const f of ['sw.js', 'js/version.js']) {
  const file = path.join(out, f);
  const txt = fs.readFileSync(file, 'utf8')
    .replaceAll('__BUILD_DATE__', date)
    .replaceAll('__BUILD__', build)
    .replaceAll('__SHA__', sha);
  fs.writeFileSync(file, txt);
}
fs.writeFileSync(path.join(out, 'build.json'), JSON.stringify({ build: Number(build) || build, sha, date }, null, 2) + '\n');
fs.writeFileSync(path.join(out, '.nojekyll'), '');
console.log(`Build #${build} (${sha}) -> ${path.relative(root, out) || '.'}`);
