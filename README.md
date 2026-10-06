# 🎲 Dicetidice Boardgame Draft

PWA (HTML + CSS + JavaScript vanilla, **zero build step**) per la challenge di draft di un gioco da tavolo del canale **Dicetidice**.
Per ogni categoria di design (giocatori, ambientazione, meccaniche, vittoria…) l'app propone **3 opzioni casuali**: ne scegli una. Alla fine hai il *brief* di un gioco da tavolo che devi **realizzare davvero**.

- Interfaccia tutta in italiano, mobile-first ma ottima anche su desktop e a 16:9 (Modalità Stream per OBS).
- Installabile, funziona offline, nessun backend, nessun tracking (solo `localStorage`).
- Draft **deterministico**: stesso seed + stesse impostazioni = stesse opzioni.

## Provarla in locale

```bash
npx serve .          # oppure: python3 -m http.server 8000
# apri http://localhost:3000 (o :8000)
```

In locale il badge in basso a destra mostra **`build dev`** e il service worker è *network-first* per tutto (le modifiche si vedono subito).

```bash
npm test             # test del motore (compatibilità, 3 opzioni distinte, determinismo del seed…) + coerenza del PRECACHE
npm run build        # simula il deploy: crea dist/ con build.json e numero di build stampato (BUILD_NUMBER=7 npm run build)
```

## Pubblicarla su GitHub Pages (con la Action)

1. Su GitHub apri il repo → **Settings → Pages**.
2. In **Build and deployment → Source** scegli **GitHub Actions** (non "Deploy from a branch").
3. Fai merge/push su **`main`**: la workflow `.github/workflows/deploy.yml` esegue i test, genera la build e pubblica.
4. Troverai l'URL in *Actions → ultimo run → deploy* (di solito `https://<utente>.github.io/<repo>/`).

Funziona in sottocartella perché **tutti i percorsi sono relativi**. La workflow parte anche a mano (*Actions → Deploy su GitHub Pages → Run workflow*).

## Il numero di build

Angolo in basso a destra, sempre visibile: `build #42`. Tocca/clicca per espandere con sha corto, data e ora.

Come funziona:

- A ogni push su `main` la Action chiama `tools/stamp-build.mjs`, che:
  - crea `build.json` → `{ "build": <github.run_number>, "sha": "<sha corto>", "date": "<ISO>" }`;
  - "stampa" gli stessi valori in `sw.js` e in `js/version.js` (sostituendo i segnaposto `__BUILD__`, `__SHA__`, `__BUILD_DATE__`).
- Il badge mostra la build **effettivamente in esecuzione** (quella stampata nel codice), così capisci se l'app si è aggiornata davvero.
- L'app legge `build.json` con `fetch(..., { cache: "no-store" })` all'avvio, quando torna in primo piano, quando torna la rete e ogni 10 minuti. Se online c'è una build più recente appare il banner **"Nuova versione disponibile (build #N) — Aggiorna"**: il tasto fa `skipWaiting` + reload.
- Il service worker versiona la cache con la build (`dtd-bgd-<build>`): **network-first** per `build.json` e `index`/navigazioni, **cache-first** per gli asset.
- *Impostazioni → Forza aggiornamento* svuota cache e service worker (i tuoi dati salvati restano).
- In locale (nessuno stamp) la build è `dev`; se in locale esiste un `build.json` viene mostrato quello.

**Per verificare un aggiornamento:** fai il push su `main`, aspetta che la Action finisca (tab *Actions*), poi apri l'app: il badge deve salire (se avevi l'app già aperta/installata vedrai prima il banner "Aggiorna").

## Aggiungere categorie ed elementi

Tutto sta in **`data/categories.js`** (nessun dato sparso nel codice):

```js
// un nuovo elemento, dentro la categoria giusta
it('nuovo-slug', 'Nome visibile', '🎲', 'Descrizione di una riga', { t: ['tag-che-porta'], x: ['tag-incompatibili'], p: 'frammento per il pitch' }),
```

- `t` (tags) = etichette che l'elemento porta · `x` (excludes) = etichette con cui **non** è compatibile. Due elementi sono incompatibili se gli `x` dell'uno contengono un `t` dell'altro (in entrambe le direzioni). Esempio: *Solitario* ha `x: ['teams', …]` e *A squadre* ha `t: ['teams']`.
- Una **nuova categoria** è un nuovo blocco `cat('id', 'Nome', '🎯', 'Sottotitolo', 'core'|'std'|'full', [ …elementi ])`. **L'ordine nell'array è l'ordine del draft.** `core` = Rapida (7), `std` = si aggiunge a Standard (14), `full` = solo Completa (21).
- `TAG_LABELS` (in fondo al file) decide quali tag si vedono sulle carte.
- Curiosità del caricamento: `data/facts.js` · parole per titoli e seed: `data/words.js`.
- Gli utenti possono anche aggiungere elementi proprî dalla pagina **Personalizza** (senza toccare il codice) ed esportare/importare il pool in JSON.

## Struttura

```
index.html  manifest.json  sw.js
css/style.css
js/  app.js (router, SW, badge)   views.js (schermate)   ui.js   state.js   storage.js
     draft-engine.js (motore, puro)   rng.js (mulberry32)   pitch.js (pitch e titoli)
     export.js (testo, JSON, PNG, link)   audio.js (WebAudio)   build.js / version.js (build number)
data/ categories.js  facts.js  words.js
icons/  icon.svg  icon-maskable.svg  + PNG generati
tools/  make-icons.mjs  stamp-build.mjs
tests/  engine.test.mjs  precache.test.mjs
.github/workflows/deploy.yml
```

Rigenerare le icone dopo aver modificato gli SVG: `npm i -D playwright && npm run icons` (usa Chromium per renderizzare l'SVG).

## Scelte di default (le ho prese io)

- **Reroll**: 0 / 1 / 2 / 3 / ∞ (default 2), contati sull'intera run. In **Caos** il reroll è disattivato.
- **Caos**: ogni categoria mostra una sola carta assegnata dal seed; si conferma con "Avanti". Stesso seed ⇒ stesso gioco.
- **Ban**: fino a N elementi (0–3) scelti prima di cominciare, da una lista cercabile.
- **Deadline**: il countdown parte quando il draft finisce (quando compare il brief). Custom = numero di giorni.
- **Pool compatibile < 3**: mostra gli elementi disponibili (anche 1). Se una categoria non ha **nessuna** opzione compatibile viene saltata in automatico (capita raramente, quasi solo per *Vincolo di produzione*).
- **Seed**: normalizzato in maiuscolo, spazi → trattini. Un pool personalizzato cambia le opzioni: la run salva uno snapshot del pool con cui è partita ("Rifai con lo stesso seed" lo riusa).
- **Link condivisibile**: lo stato è codificato nell'hash (`#/s/…`): titolo, seed, modalità, scelte e note. Chi lo apre vede il brief e può "rifare la challenge".
- **Formati PNG**: 16:9 (1920×1080), 9:16 (1080×1920), 1:1 (1080×1080), disegnati con canvas (nessuna libreria).
- **Modalità Stream**: la scala dell'interfaccia segue l'altezza dello schermo, quindi una schermata 16:9 (720p/1080p/4K) è sempre piena e senza scroll.
- **Font**: solo font di sistema (funziona offline). **Suoni**: sintetizzati con WebAudio.
- **Stato salvato** in `localStorage` con prefisso `dtd-bgd:`; se non è disponibile (navigazione privata) l'app usa la memoria e funziona comunque.

## Tastiera (draft)

`1` `2` `3` scegli · `Invio` conferma · `R` reroll · `Z` annulla ultima scelta · `S` salta (se attivo nelle impostazioni)

## Licenza e crediti

Un'app di Dicetidice. Nessun logo né IP di terzi: l'icona è un'illustrazione originale (dado + carte a ventaglio).
