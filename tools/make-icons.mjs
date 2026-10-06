#!/usr/bin/env node
/**
 * Genera le icone PNG a partire da icons/icon.svg e icons/icon-maskable.svg.
 * Usa Playwright (Chromium) per renderizzare l'SVG:  npm i -D playwright  (una tantum)
 * Uso:  node tools/make-icons.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = await import('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const icons = path.join(root, 'icons');

const JOBS = [
  ['icon.svg', 'icon-192.png', 192],
  ['icon.svg', 'icon-512.png', 512],
  ['icon-maskable.svg', 'icon-maskable-512.png', 512],
  ['icon-maskable.svg', 'apple-touch-icon.png', 180], // iOS ritaglia da solo gli angoli
  ['icon.svg', 'favicon-32.png', 32],
];

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage();
for (const [src, dest, size] of JOBS) {
  const svg = fs.readFileSync(path.join(icons, src), 'utf8');
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body>`);
  await page.screenshot({ path: path.join(icons, dest), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  console.log('✓', dest);
}
await browser.close();
