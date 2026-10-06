# CLAUDE.md — convenzioni del progetto

App: **Dicetidice Boardgame Draft**, PWA vanilla (HTML/CSS/JS con ES modules, **nessun build step**) per GitHub Pages in sottocartella. Interfaccia, commenti e commit **in italiano**.

## Regole d'oro
1. **Percorsi sempre relativi** (`js/app.js`, mai `/js/app.js`): l'app gira in `https://utente.github.io/repo/`.
2. **I dati stanno in `data/`**, non nel codice. Nuove categorie/elementi → `data/categories.js` (vedi README per `t`/`x`/`p`).
3. **Il motore (`js/draft-engine.js`, `js/rng.js`, `js/pitch.js`) è puro**: niente DOM, niente `localStorage`, niente `Math.random` per le opzioni (solo RNG seedabile). Deve restare eseguibile da Node.
4. **Nessuna libreria esterna, nessun CDN, nessun tracking.** Font di sistema, suoni con WebAudio.
5. Mai `innerHTML` con testo dell'utente: usa `h()` di `js/ui.js` (testo = `textContent`).
6. `localStorage` solo tramite `js/storage.js` (ha try/catch e fallback in memoria).

## Il numero di build sale da solo
- Ogni push su `main` fa partire `.github/workflows/deploy.yml`: `build = github.run_number` → `build.json` + stampa in `sw.js` e `js/version.js`.
- **Non modificare mai** i segnaposto `__BUILD__`, `__SHA__`, `__BUILD_DATE__` e **non committare** un `build.json` (è in `.gitignore`). Non serve cambiare nulla a mano: basta fare il push.
- Dopo ogni modifica richiesta da Niky: commit + push su `main` (se la richiesta lo prevede) e ricorda che il badge in basso a destra mostrerà la nuova build quando la Action ha finito.

## Quando aggiungi/rimuovi file
- Ogni file in `js/`, `data/`, `css/` **deve stare nell'array `PRECACHE` di `sw.js`**, altrimenti offline si rompe. `npm test` lo verifica (`tests/precache.test.mjs`).
- Se aggiungi una cartella nuova da pubblicare, aggiungila a `INCLUDE` in `tools/stamp-build.mjs`.
- Icone: modifica gli SVG in `icons/` e rigenera con `npm run icons` (serve `playwright`).

## Test e verifica
- `npm test` prima di ogni commit: compatibilità, 3 opzioni distinte, determinismo del seed, reroll, ban, caos, undo, PRECACHE.
- Se tocchi le regole di compatibilità, aggiungi un caso a `tests/engine.test.mjs`.
- Prova a mano: `npx serve .` (badge = `build dev`). Per simulare un deploy: `BUILD_NUMBER=7 npm run build && npx serve dist`.

## Stile
- JS moderno (ES2022), moduli, niente transpiler. Commenti brevi e solo dove servono.
- Accessibilità: focus visibile, tap target ≥ 48px, `prefers-reduced-motion` e impostazione "Animazioni" rispettati, contrasti dei temi scuro/chiaro.
- Mobile-first; controlla sempre anche 16:9 e la Modalità Stream (`html.stream`, scala legata all'altezza).
- Commit piccoli e descrittivi, in italiano.
