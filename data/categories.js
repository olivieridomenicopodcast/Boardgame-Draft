/**
 * DATI DEL DRAFT — categorie ed elementi.
 *
 * Per aggiungere un elemento basta una riga `it(...)` dentro la categoria giusta.
 * Per aggiungere una categoria basta un nuovo blocco `cat(...)` (l'ORDINE nell'array
 * è l'ordine del draft). `level` decide la lunghezza della run:
 *   'core' = Rapida · 'std' = Standard (core + std) · 'full' = Completa (tutte)
 *
 * Campi di un elemento:
 *   id        slug univoco dentro la categoria (diventa "categoria.slug")
 *   name      nome mostrato
 *   emoji     icona
 *   desc      descrizione di una riga
 *   t         (tags)     etichette che l'elemento "porta"
 *   x         (excludes) etichette con cui NON è compatibile
 *   p         (pitch)    frammento di frase usato dal generatore di pitch
 *
 * Compatibilità: due elementi sono incompatibili se i `x` dell'uno contengono
 * un `t` dell'altro (in qualunque direzione). Un tag può quindi essere "escluso"
 * senza che nessuno lo porti: semplicemente non ha effetto.
 *
 * Tag principali usati (non esaustivo):
 *   solo, teams, one-vs-all, party, kids, hardcore, heavy, dark, cozy, ruthless,
 *   competitive, pvp, direct-attack, coop-total, coop-win, hidden-traitor, hidden-info,
 *   social-bluff, negotiation, diplomacy, vp, race, last-survivor, elimination,
 *   cardcentric, dice, paper, board, tiles, wood, miniatures, personal-boards,
 *   mapboard, no-map, luck-zero, luck-high, random, short-rules, tiny, timer, ...
 */

const it = (id, name, emoji, desc, o = {}) => ({
  id,
  name,
  emoji,
  desc,
  tags: o.t || [],
  excludes: o.x || [],
  pitch: o.p || '',
});

const cat = (id, name, emoji, subtitle, level, items) => ({
  id,
  name,
  emoji,
  subtitle,
  level,
  items: items.map((i) => ({ ...i, id: `${id}.${i.id}` })),
});

// Un gioco in solitaria non ha senso con queste dinamiche multigiocatore.
const SOLO_X = [
  'hidden-traitor', 'one-vs-all', 'teams', 'negotiation', 'diplomacy', 'social-bluff',
  'semi-coop', 'party', 'last-survivor', 'race', 'majority', 'auction', 'pvp',
];
// Regolamenti brevi: incompatibili con cose pesanti.
const SHORT_X = ['heavy', 'legacy', 'asymmetric', 'rules-change', 'rpg-fans'];

export const CATEGORIES = [
  cat('players', 'Giocatori', '👥', 'Per quanti giocatori è pensato il tuo gioco?', 'core', [
    it('solo', 'Solitario (1)', '🧍', 'Si gioca da soli contro il sistema', { t: ['solo'], x: SOLO_X, p: 'per un solo giocatore' }),
    it('due', 'Solo in 2', '⚔️', 'Un duello perfetto a due', { t: ['p2'], x: ['hidden-traitor', 'teams', 'diplomacy', 'semi-coop', 'party', 'majority'], p: 'per 2 giocatori' }),
    it('2-3', '2–3 giocatori', '👫', 'Piccolo e compatto', { t: ['small'], x: ['hidden-traitor', 'teams', 'party'], p: 'per 2–3 giocatori' }),
    it('3-4', '3–4 giocatori', '🧑‍🤝‍🧑', 'Il tavolo da serata tra amici', { t: ['small'], x: ['party'], p: 'per 3–4 giocatori' }),
    it('2-4', '2–4 giocatori', '🎲', 'La fascia più classica', { t: ['small'], p: 'per 2–4 giocatori' }),
    it('2-5', '2–5 giocatori', '🖐️', 'Un po’ più di gente intorno al tavolo', { t: ['medium'], p: 'per 2–5 giocatori' }),
    it('4-6', '4–6 giocatori', '🍕', 'Per gruppi numerosi', { t: ['medium'], p: 'per 4–6 giocatori' }),
    it('party', 'Party 5–8', '🎉', 'Caos allegro con tanta gente', { t: ['large', 'party'], x: ['heavy'], p: 'per 5–8 giocatori' }),
    it('var', 'Numero variabile (1–99)', '♾️', 'Si adatta a qualunque gruppo', { t: ['variable'], x: ['miniatures', 'legacy', 'personal-boards', 'hidden-traitor'], p: 'per un numero variabile di giocatori (da 1 a 99)' }),
    it('squadre', 'A squadre 2 vs 2', '🤼', 'Due coppie si sfidano', { t: ['teams', 'p4'], x: ['hidden-traitor'], p: 'per 4 giocatori divisi in due squadre' }),
    it('1vsall', 'Uno contro tutti', '👑', 'Un giocatore contro il resto del tavolo', { t: ['one-vs-all'], p: 'con un giocatore contro tutti gli altri' }),
  ]),

  cat('audience', 'Pubblico e complessità', '🎯', 'A chi parla il tuo gioco?', 'std', [
    it('kids', 'Bambini 5+', '🧸', 'Regole semplicissime, colori vivaci', { t: ['kids'], x: ['hardcore', 'dark', 'heavy', 'ruthless', 'elimination'], p: 'pensato per bambini dai 5 anni in su' }),
    it('family', 'Famiglia 8+', '🏡', 'Giocabile da nonni e nipoti', { t: ['family'], x: ['hardcore'], p: 'pensato per tutta la famiglia (8+)' }),
    it('casual', 'Casual adulti', '🍷', 'Facile da spiegare, si gioca in tranquillità', { t: ['casual'], p: 'pensato per adulti occasionali' }),
    it('mid', 'Gamer medio', '🎮', 'Qualche strato strategico in più', { t: ['mid'], p: 'pensato per giocatori di esperienza media' }),
    it('hardcore', 'Gamer hardcore', '🧠', 'Profondo, lungo e senza sconti', { t: ['hardcore', 'heavy'], x: ['kids', 'party', 'short-rules'], p: 'pensato per giocatori hardcore' }),
    it('party', 'Party da aperitivo', '🍹', 'Si spiega in un minuto, si ride per ore', { t: ['party'], x: ['heavy', 'legacy'], p: 'pensato per feste e aperitivi' }),
    it('edu', 'Educativo', '📚', 'Si impara qualcosa giocando', { t: ['educational'], x: ['dark', 'ruthless'], p: 'pensato per imparare giocando' }),
    it('rpg', 'Per giocatori di ruolo', '🎭', 'Interpretazione e storie condivise', { t: ['rpg-fans'], x: ['short-rules'], p: 'pensato per chi ama i giochi di ruolo' }),
  ]),

  cat('setting', 'Ambientazione', '🌍', 'Dove si svolge la storia?', 'core', [
    it('fantasy', 'Fantasy medievale', '🏰', 'Draghi, cavalieri e regni in guerra', { p: 'ambientato in un mondo fantasy medievale' }),
    it('space', 'Spazio profondo', '🚀', 'Stazioni, astronavi e vuoto cosmico', { p: 'ambientato nello spazio profondo' }),
    it('postapo', 'Post-apocalisse', '☢️', 'Sopravvivere tra le rovine', { t: ['dark'], p: 'ambientato in un mondo post-apocalittico' }),
    it('rome', 'Antica Roma', '🏛️', 'Legioni, senatori e arene', { p: 'ambientato nell’antica Roma' }),
    it('pirates', 'Pirati', '🏴‍☠️', 'Tesori, tempeste e ciurme', { p: 'ambientato tra i pirati' }),
    it('west', 'Far West', '🤠', 'Duelli, treni e pepite d’oro', { p: 'ambientato nel Far West' }),
    it('cyber', 'Cyberpunk', '🌆', 'Neon, megacorporazioni e hacker', { p: 'ambientato in una metropoli cyberpunk' }),
    it('gothic', 'Horror gotico', '🦇', 'Castelli, vampiri e nebbia', { t: ['dark'], p: 'immerso nell’horror gotico' }),
    it('jungle', 'Giungla inesplorata', '🌴', 'Rovine, liane e creature misteriose', { p: 'ambientato in una giungla inesplorata' }),
    it('sea', 'Fondali marini', '🐙', 'Abissi, coralli e relitti', { p: 'ambientato nei fondali marini' }),
    it('dino', 'Dinosauri e preistoria', '🦖', 'Clan, caverne e giganti estinti', { p: 'ambientato nella preistoria tra i dinosauri' }),
    it('toys', 'Mondo dei giocattoli', '🧸', 'Quando i giocattoli si svegliano', { t: ['cute'], p: 'ambientato nel mondo dei giocattoli' }),
    it('magic', 'Scuola di magia', '🧙', 'Lezioni, incantesimi e rivalità', { p: 'ambientato in una scuola di magia' }),
    it('dungeon', 'Dungeon sotterraneo', '🕯️', 'Corridoi bui e tesori nascosti', { p: 'ambientato in un dungeon sotterraneo' }),
    it('spy', 'Spionaggio Guerra Fredda', '🕵️', 'Doppiogiochisti e valigette', { p: 'ambientato nello spionaggio della Guerra Fredda' }),
    it('norse', 'Mitologia norrena', '⚡', 'Dei, giganti e Ragnarok', { p: 'ambientato nella mitologia norrena' }),
    it('japan', 'Giappone feudale', '⛩️', 'Samurai, ninja e castelli', { p: 'ambientato nel Giappone feudale' }),
    it('circus', 'Circo/luna park', '🎪', 'Acrobati, giostre e zucchero filato', { p: 'ambientato in un circo o luna park' }),
    it('nature', 'Ecosistema naturale', '🌿', 'Catene alimentari e stagioni', { p: 'ambientato in un ecosistema naturale' }),
    it('factory', 'Fabbrica e industria', '🏭', 'Ingranaggi, turni e produzione', { p: 'ambientato in una fabbrica' }),
    it('kitchen', 'Cucina e ristorazione', '🍳', 'Ordini, fornelli e brigata', { p: 'ambientato in una cucina da ristorante' }),
    it('heroes', 'Supereroi', '🦸', 'Poteri, maschere e città da salvare', { p: 'ambientato nel mondo dei supereroi' }),
  ]),

  cat('tone', 'Tono', '🎭', 'Che atmosfera deve avere?', 'std', [
    it('comic', 'Comico', '😂', 'Si ride a ogni turno', { t: ['comedic'], p: 'comico' }),
    it('epic', 'Epico', '🛡️', 'Grandi imprese e colonne sonore immaginarie', { p: 'epico' }),
    it('horror', 'Horror', '👻', 'Tensione, paura e colpi di scena', { t: ['dark'], x: ['cozy'], p: 'horror' }),
    it('cozy', 'Cozy/rilassante', '☕', 'Una coperta, una tisana e un gioco', { t: ['cozy'], x: ['dark', 'ruthless', 'elimination', 'direct-attack'], p: 'cozy e rilassante' }),
    it('villain', 'Cattivissimo', '😈', 'Si gioca dalla parte dei cattivi', { t: ['villain'], x: ['cozy', 'kids'], p: 'cattivissimo' }),
    it('surreal', 'Surreale/nonsense', '🫠', 'Logica? No grazie', { p: 'surreale' }),
    it('noir', 'Noir', '🕶️', 'Pioggia, sigarette e segreti', { t: ['dark'], p: 'noir' }),
    it('narr', 'Narrativo', '📖', 'Conta la storia che si racconta', { t: ['narrative'], x: ['zero-text'], p: 'narrativo' }),
    it('ruthless', 'Spietato e competitivo', '🔪', 'Qui nessuno fa sconti', { t: ['ruthless'], x: ['cozy', 'coop-total'], p: 'spietato' }),
  ]),

  cat('mech1', 'Meccanica principale', '⚙️', 'Che meccanica sta al centro del gioco?', 'core', [
    it('deck', 'Deck building', '🃏', 'Costruisci il mazzo mentre giochi', { t: ['cardcentric', 'deckbuilding'] }),
    it('worker', 'Piazzamento lavoratori', '👷', 'Spazi limitati, scelte dolorose', { t: ['worker-placement'], x: ['realtime'] }),
    it('tiles', 'Piazzamento tessere', '🧩', 'Costruisci il paesaggio pezzo per pezzo', { t: ['tiles'] }),
    it('area', 'Controllo area', '🗺️', 'Chi domina il territorio vince', { t: ['area-control', 'competitive'], x: ['no-map'] }),
    it('hand', 'Gestione della mano', '✋', 'Quali carte giocare e quando', { t: ['cardcentric'] }),
    it('draft', 'Draft di carte', '🎴', 'Scegli e passa al vicino', { t: ['cardcentric', 'draft'] }),
    it('rollwrite', 'Roll & write', '✏️', 'Tira i dadi e scrivi sul foglio', { t: ['dice', 'paper'] }),
    it('auction', 'Aste', '🔨', 'Chi offre di più si porta a casa tutto', { t: ['auction', 'competitive'] }),
    it('sets', 'Collezione di set', '🧺', 'Completa le serie giuste', { t: ['set-collection'] }),
    it('move', 'Movimento punto a punto', '🚶', 'Da un luogo all’altro lungo i percorsi', { t: ['movement'], x: ['no-map'] }),
    it('program', 'Programmazione azioni', '🤖', 'Pianifica ora, soffri dopo', { t: ['programming', 'heavy'] }),
    it('bluff', 'Bluff e deduzione sociale', '🕵️', 'Chi mente? Chi dice la verità?', { t: ['social-bluff', 'hidden-info'] }),
    it('memory', 'Memoria', '🧠', 'Ricordare è già metà vittoria', { t: ['memory'] }),
    it('dexterity', 'Destrezza', '🎯', 'Mani ferme e nervi saldi', { t: ['dexterity'], x: ['heavy'] }),
    it('engine', 'Costruzione di motore', '🏭', 'Ogni azione alimenta la successiva', { t: ['engine', 'heavy', 'economy'], x: ['realtime'] }),
    it('pickup', 'Pick-up & deliver', '📦', 'Prendi qui, consegna là', { t: ['movement'], x: ['no-map'] }),
    it('td', 'Difesa cooperativa (tower defense)', '🏹', 'Tutti insieme contro le ondate', { t: ['coop-win', 'tower-defense'], x: ['competitive', 'direct-attack', 'hidden-traitor', 'last-survivor', 'reverse-win'] }),
    it('legacy', 'Legacy', '📜', 'Il gioco cambia per sempre a ogni partita', { t: ['legacy', 'heavy'], x: ['tiny'] }),
  ]),

  cat('mech2', 'Meccanica secondaria', '🔧', 'Quale meccanica fa da contorno?', 'core', [
    it('dice', 'Dadi', '🎲', 'Un tocco di fortuna', { t: ['dice'] }),
    it('trade', 'Scambi/commercio', '🔄', 'Do ut des', { t: ['trade', 'economy'] }),
    it('tracks', 'Tracciati di progresso', '📈', 'Salire, salire, salire', { t: ['tracks'] }),
    it('events', 'Carte evento', '📰', 'Qualcosa sta per succedere', { t: ['cardcentric', 'random'] }),
    it('secret-goals', 'Obiettivi segreti', '🤫', 'Nessuno sa cosa stai cercando', { t: ['hidden-info', 'secret-goal'] }),
    it('combo', 'Combo di carte', '⛓️', 'Una carta ne chiama un’altra', { t: ['cardcentric'] }),
    it('timer', 'Timer o clessidra', '⏳', 'Il tempo stringe', { t: ['timer'] }),
    it('betting', 'Scommesse', '🎰', 'Punta su di te (o sugli altri)', { t: ['betting'] }),
    it('dicedraft', 'Dice drafting', '🧲', 'Scegli un dado dalla riserva comune', { t: ['dice', 'draft'] }),
    it('commondeck', 'Mazzo comune che si esaurisce', '🕳️', 'Quando finisce, finisce tutto', { t: ['cardcentric', 'random', 'deck-end'] }),
    it('boardchange', 'Plancia che cambia', '🔀', 'Il terreno si trasforma mentre giochi', { t: ['mapboard'] }),
    it('negotiation', 'Negoziazione', '🗣️', 'Parlare, promettere, tradire', { t: ['negotiation'] }),
    it('majority', 'Maggioranze', '🗳️', 'Più influenza, più punti', { t: ['majority', 'competitive'] }),
  ]),

  cat('interaction', 'Interazione tra giocatori', '🤺', 'Come interagiscono i giocatori?', 'core', [
    it('direct', 'Competitivo diretto (attacco)', '⚔️', 'Si colpisce, si ruba, si distrugge', { t: ['direct-attack', 'competitive', 'pvp'], p: 'competitiva e diretta: ci si attacca a vicenda' }),
    it('indirect', 'Competitivo indiretto', '🏁', 'Si compete senza farsi male', { t: ['indirect', 'competitive'], p: 'competitiva ma indiretta: si gareggia senza attaccarsi' }),
    it('coop', 'Cooperativo totale', '🤝', 'Si vince o si perde tutti insieme', { t: ['coop-total'], x: ['competitive', 'hidden-traitor', 'vp', 'direct-attack', 'one-vs-all', 'ruthless', 'semi-coop', 'teams'], p: 'totalmente cooperativa: si vince o si perde insieme' }),
    it('semicoop', 'Semi-cooperativo', '🫱🏽‍🫲🏼', 'Alleati finché conviene', { t: ['semi-coop'], p: 'semi-cooperativa: alleati finché conviene' }),
    it('traitor', 'Traditore nascosto', '🗡️', 'Uno di voi lavora contro tutti', { t: ['hidden-traitor', 'hidden-info', 'social-bluff'], p: 'tinta di sospetto: c’è un traditore nascosto' }),
    it('1vsall', 'Uno contro tutti', '👑', 'Un giocatore gioca in modo diverso dagli altri', { t: ['one-vs-all'], p: 'impostata come uno contro tutti' }),
    it('teams', 'A squadre', '🧢', 'Due o più squadre si sfidano', { t: ['teams'], p: 'a squadre' }),
    it('diplo', 'Diplomazia e alleanze temporanee', '🕊️', 'Patti oggi, tradimenti domani', { t: ['diplomacy'], p: 'fatta di diplomazia e alleanze temporanee' }),
  ]),

  cat('turn', 'Struttura del turno', '⏱️', 'Come si struttura un turno?', 'std', [
    it('one', 'Una azione per turno', '1️⃣', 'Semplice e diretto', {}),
    it('ap', 'Punti azione', '🔋', 'Un budget da spendere con cura', {}),
    it('simul', 'Turni simultanei', '🔀', 'Tutti giocano nello stesso momento', { t: ['simultaneous'] }),
    it('phases', 'Fasi fisse', '📋', 'Ogni turno ha le sue fasi in ordine', {}),
    it('varorder', 'Ordine di turno variabile', '🔃', 'Chi gioca per primo? Dipende', {}),
    it('realtime', 'Tempo reale', '⚡', 'Niente turni, tutti agiscono subito', { t: ['realtime'], x: ['heavy', 'worker-placement', 'auction'] }),
    it('secretprog', 'Programmazione segreta simultanea', '🙈', 'Scegliete di nascosto, poi si svela', { t: ['simultaneous', 'hidden-info'] }),
    it('draftturn', 'Turni a draft', '🔁', 'Il turno cambia in base a ciò che scegli', { t: ['draft'] }),
  ]),

  cat('win', 'Condizione di vittoria', '🏆', 'Come si vince?', 'core', [
    it('vp', 'Più punti vittoria', '⭐', 'Il classico: vince chi ne ha di più', { t: ['vp', 'competitive'], p: 'totalizzando più punti vittoria' }),
    it('first', 'Primo a completare un obiettivo', '🥇', 'Una corsa verso il traguardo', { t: ['race', 'competitive'], p: 'completando per primi un obiettivo' }),
    it('lastsurv', 'Ultimo sopravvissuto', '🧟', 'Resta in piedi più a lungo degli altri', { t: ['last-survivor', 'competitive', 'elimination'], p: 'restando l’ultimo sopravvissuto' }),
    it('boss', 'Sconfiggere il boss', '🐉', 'Tutti insieme contro il mostro finale', { t: ['coop-win', 'boss'], x: ['competitive', 'direct-attack', 'hidden-traitor'], p: 'sconfiggendo il boss' }),
    it('survive', 'Sopravvivere N round (coop)', '🛟', 'Resistere fino alla fine', { t: ['coop-win', 'survive'], x: ['competitive', 'direct-attack', 'hidden-traitor'], p: 'sopravvivendo a un numero fisso di round' }),
    it('center', 'Raggiungere il centro', '🎯', 'Arriva al cuore della mappa', { t: ['race', 'competitive'], x: ['no-map'], p: 'raggiungendo per primi il centro' }),
    it('territories', 'Controllare X territori', '🚩', 'Conquista abbastanza terra', { t: ['territories', 'competitive'], x: ['no-map'], p: 'controllando più territori degli altri' }),
    it('resource', 'Accumulare una risorsa', '💎', 'Il primo scrigno pieno vince', { t: ['resource-win'], x: ['no-econ'], p: 'accumulando più risorse' }),
    it('secret', 'Obiettivo segreto', '🔐', 'Ognuno ha la sua missione nascosta', { t: ['secret-goal', 'hidden-info', 'competitive'], p: 'realizzando il proprio obiettivo segreto' }),
    it('collection', 'Completare una collezione', '🗃️', 'Gotta collect ’em all', { t: ['collection'], p: 'completando una collezione' }),
    it('lowscore', 'Vince chi ha meno punti', '📉', 'Qui meno è meglio', { t: ['reverse-win', 'competitive'], x: ['vp'], p: 'chiudendo con meno punti di tutti' }),
  ]),

  cat('end', 'Fine partita', '🏁', 'Come finisce la partita?', 'std', [
    it('deck', 'Mazzo esaurito', '🪫', 'Quando le carte finiscono, il gioco finisce', { t: ['cardcentric', 'deck-end'] }),
    it('rounds', 'Numero di round fisso', '🔢', 'Si sa dall’inizio quanto dura', { t: ['fixed-rounds'] }),
    it('track', 'Tracciato raggiunto', '📏', 'Un segnalino arriva in fondo', { t: ['tracks'] }),
    it('firstx', 'Primo a X', '🏃', 'Il primo che arriva a X chiude', { t: ['race', 'competitive'] }),
    it('trigger', 'Evento scatenante', '💥', 'Succede qualcosa e scatta l’ultimo giro', {}),
    it('timer', 'Timer scaduto', '⏰', 'Allo scadere, stop', { t: ['timer-end'] }),
    it('boss', 'Boss sconfitto', '☠️', 'Cade il boss, finisce la partita', { t: ['coop-win', 'boss'], x: ['competitive', 'direct-attack', 'hidden-traitor'] }),
  ]),

  cat('components', 'Componenti principali', '📦', 'Cosa c’è nella scatola?', 'core', [
    it('cards', 'Solo carte', '🃏', 'Un mazzo e basta', { t: ['cards-only', 'cardcentric'], x: ['board', 'miniatures', 'personal-boards', 'dice', 'tiles', 'paper', 'wood'] }),
    it('dice', 'Dadi custom', '🎲', 'Facce speciali stampate su misura', { t: ['dice', 'dice-custom'] }),
    it('board', 'Tabellone modulare', '🗺️', 'Un tabellone a pezzi componibili', { t: ['board'] }),
    it('hex', 'Tessere esagonali', '⬡', 'Tasselli a sei lati', { t: ['tiles'] }),
    it('mini', 'Miniature', '🗿', 'Statuine da dipingere', { t: ['miniatures'] }),
    it('wood', 'Token di legno', '🪵', 'Pezzi tattili e profumati', { t: ['wood'] }),
    it('boards', 'Plance personali', '🗂️', 'Ognuno ha la sua plancia', { t: ['personal-boards'] }),
    it('tower', 'Torre dei dadi', '🗼', 'I dadi cadono e il caso decide', { t: ['dice', 'dice-tower'] }),
    it('cardsdice', 'Carte + dadi', '🎴', 'Il miglior mix da tavolo', { t: ['cardcentric', 'dice', 'two-components'] }),
    it('meeple', 'Meeple', '🧍', 'Omini di legno', { t: ['wood', 'meeple'] }),
    it('domino', 'Tessere domino', '🀄', 'Rettangoli da accoppiare', { t: ['tiles'] }),
    it('pad', 'Blocchetto e matite', '📝', 'Si scrive e si cancella', { t: ['paper'], x: ['cardcentric', 'miniatures', 'board'] }),
  ]),

  cat('map', 'Plancia / mappa', '🗺️', 'Dove si gioca, fisicamente?', 'std', [
    it('none', 'Nessuna plancia', '⬜', 'Si gioca sul tavolo vuoto', { t: ['no-map'], x: ['mapboard', 'board', 'personal-boards'] }),
    it('grid', 'Griglia quadrata', '▦', 'Caselle ordinate', { t: ['mapboard'] }),
    it('hex', 'Esagoni modulari', '⬢', 'Mappa a esagoni componibili', { t: ['mapboard', 'tiles'] }),
    it('nodes', 'Mappa a nodi', '🕸️', 'Luoghi collegati da rotte', { t: ['mapboard'] }),
    it('ring', 'Percorso circolare', '⭕', 'Si gira in tondo (ma con stile)', { t: ['mapboard'] }),
    it('grow', 'Mappa che cresce', '🌱', 'Si costruisce giocando', { t: ['mapboard', 'tiles'] }),
    it('personal', 'Plance personali', '🗂️', 'Ognuno ha il suo piccolo mondo', { t: ['personal-boards'] }),
    it('dungeon', 'Dungeon a livelli', '🪜', 'Si scende piano dopo piano', { t: ['mapboard'] }),
    it('table', 'Il tavolo è la mappa', '🍽️', 'Gli oggetti reali diventano la mappa', { t: ['mapboard'] }),
  ]),

  cat('resources', 'Risorse ed economia', '💰', 'Cosa si raccoglie e si spende?', 'std', [
    it('coins', 'Monete', '🪙', 'Il classico denaro', {}),
    it('food', 'Cibo', '🍎', 'Si mangia o si muore', {}),
    it('energy', 'Energia', '🔌', 'Da generare e consumare', {}),
    it('raw', 'Materie prime colorate', '🟦', 'Cubetti di colori diversi', {}),
    it('time', 'Tempo', '⏳', 'La risorsa più scarsa', {}),
    it('rep', 'Reputazione', '🎖️', 'Fama, onore, influenza', {}),
    it('cards', 'Carte come moneta', '💳', 'Per pagare si scartano carte', { t: ['cardcentric'] }),
    it('none', 'Nessuna economia', '🚫', 'Non si spende nulla', { t: ['no-econ'], x: ['economy', 'resource-win'] }),
    it('health', 'Salute/vite', '❤️', 'Perdi cuori, perdi tutto', {}),
    it('info', 'Informazioni', '🔍', 'Sapere è potere', {}),
    it('mana', 'Mana', '🔮', 'Energia magica da incanalare', {}),
  ]),

  cat('luck', 'Fattore fortuna', '🍀', 'Quanto conta il caso?', 'std', [
    it('zero', 'Zero (informazione perfetta)', '♟️', 'Come negli scacchi', { t: ['luck-zero'], x: ['dice', 'luck-high', 'random', 'hidden-info', 'betting', 'chaos'] }),
    it('low', 'Bassa', '🌱', 'Il caso c’è, ma pesa poco', {}),
    it('mid', 'Media', '⚖️', 'Equilibrio tra abilità e sorte', {}),
    it('high', 'Alta', '🎰', 'La dea bendata comanda', { t: ['luck-high'], x: ['hardcore'] }),
    it('chaos', 'Caos controllato', '🌪️', 'Imprevedibile ma gestibile', { t: ['chaos'] }),
  ]),

  cat('asym', 'Asimmetria', '🎭', 'Quanto sono diversi i giocatori?', 'full', [
    it('none', 'Nessuna', '⚖️', 'Tutti partono uguali', { t: ['symmetric'] }),
    it('factions', 'Fazioni con poteri unici', '🏴', 'Ogni fazione gioca a modo suo', { t: ['asymmetric'], x: ['short-rules', 'tiny'] }),
    it('roles', 'Ruoli', '🎩', 'Ognuno ha un compito diverso', { t: ['asymmetric'], x: ['short-rules', 'tiny'] }),
    it('decks', 'Mazzi iniziali diversi', '🎴', 'Ognuno parte con carte diverse', { t: ['asymmetric', 'cardcentric'], x: ['short-rules', 'tiny'] }),
    it('chars', 'Personaggi con abilità', '🦸', 'Scegli il tuo eroe', { t: ['asymmetric'], x: ['short-rules', 'tiny'] }),
    it('private', 'Obiettivi privati', '🔒', 'Ognuno ha un traguardo personale', { t: ['hidden-info', 'secret-goal'] }),
    it('monster', 'Un giocatore è il mostro', '👹', 'Uno interpreta la minaccia', { t: ['one-vs-all', 'asymmetric'], x: ['short-rules', 'tiny'] }),
  ]),

  cat('gimmick', 'Gimmick', '✨', 'Quale trovata rende il gioco memorabile?', 'full', [
    it('hourglass', 'Clessidra', '⏳', 'Granelli che scorrono', { t: ['timer', 'hourglass'], x: ['timer'] }),
    it('app', 'Companion app', '📱', 'Un’app fa da arbitro o da avversario', { t: ['app'] }),
    it('audio', 'Colonna sonora/audio che guida il gioco', '🎵', 'La musica detta il ritmo', { t: ['audio'] }),
    it('die', 'Dado speciale', '🎲', 'Un dado con regole tutte sue', { t: ['dice', 'special-die'] }),
    it('secret-tokens', 'Segnalini segreti', '🕶️', 'Pedine rivelate solo al momento giusto', { t: ['hidden-info'] }),
    it('chaosdeck', 'Mazzo caos che rompe le regole', '🌀', 'Carte che sovvertono tutto', { t: ['cardcentric', 'random', 'chaos'] }),
    it('dexterity', 'Elemento di destrezza', '🤹', 'Una prova di abilità manuale', { t: ['dexterity'], x: ['dexterity', 'heavy'] }),
    it('rulechange', 'Regole che cambiano ogni round', '🔁', 'Non ti abitui mai', { t: ['rules-change'], x: ['rules-change', 'short-rules', 'zero-text'] }),
    it('stopwatch', 'Cronometro', '⏱️', 'Ogni mossa a tempo', { t: ['timer'], x: ['timer'] }),
    it('morse', 'Codice morse o messaggi cifrati', '📡', 'Segnali da decifrare (occhiolino ai radioamatori)', { t: ['cipher'] }),
  ]),

  cat('twist', 'Twist', '🌀', 'Quale colpo di scena?', 'full', [
    it('breakrule', 'Una regola si rompe ogni round', '💥', 'Ogni round una regola smette di valere', { t: ['rules-change'], x: ['rules-change', 'short-rules', 'zero-text'] }),
    it('extrainfo', 'Un giocatore ha info extra', '👁️', 'Uno sa più degli altri', { t: ['hidden-info', 'asymmetric-info'] }),
    it('consume', 'Il gioco si “consuma”', '🕯️', 'Componenti che si usurano o si strappano', { t: ['legacy-lite'], x: ['legacy'] }),
    it('steal', 'Rubare è obbligatorio', '🦹', 'Se puoi rubare, devi farlo', { t: ['direct-attack', 'stealing'] }),
    it('vanish', 'Un componente sparisce', '🫥', 'A metà partita qualcosa va tolto', { t: ['vanishing'] }),
    it('last', 'Vince chi è ultimo', '🐢', 'Arrivare ultimi è un successo', { t: ['reverse-win', 'competitive'], x: ['vp', 'race', 'reverse-win', 'last-survivor', 'coop-win'] }),
    it('silent', 'Vietato parlare', '🤐', 'Si gioca in silenzio assoluto', { t: ['silent'], x: ['negotiation', 'diplomacy', 'social-bluff', 'talk-forced'] }),
    it('talk', 'Obbligo di parlare', '🗣️', 'Non puoi stare zitto', { t: ['talk-forced'], x: ['silent'] }),
    it('sharedhand', 'Mano segreta condivisa', '🤲', 'Le carte sono di tutti, ma nascoste', { t: ['hidden-info', 'cardcentric'] }),
    it('surprise', 'Round finale a sorpresa', '🎁', 'Nessuno sa quando arriva l’ultimo giro', { t: ['surprise-end'], x: ['fixed-rounds'] }),
    it('dual', 'Ogni carta ha doppio uso', '♻️', 'Due funzioni, una scelta', { t: ['cardcentric', 'dual-use'] }),
  ]),

  cat('constraint', 'Vincolo di produzione', '🧰', 'Che limite ti imponi per realizzarlo?', 'full', [
    it('tiny', 'Scatola tascabile (max 18 carte)', '🪙', 'Un microgioco da tasca', { t: ['tiny', 'cardcentric'], x: ['board', 'miniatures', 'personal-boards', 'tiles', 'wood', 'heavy', 'asymmetric', 'dice-tower', 'paper', 'legacy'] }),
    it('c54', 'Solo 54 carte', '🂡', 'Un mazzo francese di possibilità', { t: ['cards54', 'cardcentric'], x: ['board', 'miniatures', 'personal-boards', 'tiles', 'wood', 'dice', 'paper'] }),
    it('pnp', 'Print & play', '🖨️', 'Si stampa a casa', { t: ['print-and-play'], x: ['miniatures', 'wood', 'dice-custom', 'dice-tower'] }),
    it('onecomp', 'Un solo tipo di componente', '☝️', 'Un solo tipo di pezzo', { t: ['one-component'], x: ['app', 'audio', 'two-components', 'special-die', 'hourglass'] }),
    it('onepage', 'Regolamento di una pagina', '📄', 'Le regole stanno in un foglio', { t: ['short-rules'], x: SHORT_X }),
    it('zerotext', 'Zero testo sulle carte', '🖼️', 'Solo simboli e immagini', { t: ['zero-text'], x: ['narrative', 'rules-change', 'typography'] }),
    it('twomin', 'Spiegabile in 2 minuti', '⏲️', 'Si spiega e si parte subito', { t: ['short-rules'], x: SHORT_X }),
    it('recycled', 'Materiali riciclati a costo zero', '🥫', 'Solo roba che hai già in casa', { t: ['zero-cost'], x: ['miniatures', 'dice-custom', 'app'] }),
    it('diceonly', 'Solo dadi', '🎲', 'Niente altro che dadi', { t: ['dice-only', 'dice'], x: ['cardcentric', 'board', 'mapboard', 'miniatures', 'tiles', 'wood', 'personal-boards', 'paper'] }),
    it('noboard', 'Senza tabellone', '🚫', 'Il tabellone non serve', { t: ['no-map'], x: ['mapboard', 'board'] }),
  ]),

  cat('art', 'Stile artistico', '🎨', 'Che aspetto ha il gioco?', 'full', [
    it('pixel', 'Pixel art', '👾', 'Quadratini nostalgici', {}),
    it('watercolor', 'Acquerello', '🖌️', 'Sfumature morbide', {}),
    it('minimal', 'Minimal geometrico', '🔷', 'Forme pulite e colori netti', {}),
    it('comic', 'Fumetto', '💬', 'Linee nere e nuvolette', {}),
    it('retro80', 'Retro anni ’80', '📼', 'Neon, griglie e VHS', {}),
    it('kawaii', 'Kawaii', '🌸', 'Tenerissimo', { t: ['cute'], x: ['dark', 'ruthless'] }),
    it('bw', 'Bianco e nero', '⚫', 'Solo contrasti', {}),
    it('collage', 'Collage', '✂️', 'Ritagli e incollature', {}),
    it('type', 'Solo tipografia', '🔤', 'Lettere come protagoniste', { t: ['typography'], x: ['zero-text'] }),
  ]),

  cat('videogame', 'Ispirazione videoludica', '🎮', 'Quale videogioco ti ispira?', 'full', [
    it('roguelike', 'Roguelike', '💀', 'Si muore, si impara, si riprova', { t: ['roguelike'] }),
    it('platform', 'Platform', '🏃', 'Salti, ostacoli e checkpoint', {}),
    it('towerdef', 'Tower defense', '🗼', 'Difendi la base dalle ondate', { t: ['tower-defense'] }),
    it('management', 'Gestionale', '📊', 'Numeri che salgono', { t: ['management', 'economy'] }),
    it('br', 'Battle royale', '🪂', 'Ne resta uno solo', { t: ['elimination', 'competitive'], x: ['solo'] }),
    it('puzzle', 'Puzzle', '🧩', 'Rompicapi eleganti', {}),
    it('vn', 'Visual novel', '📖', 'Storie a bivi', { t: ['narrative'] }),
    it('idle', 'Idle/clicker', '🖱️', 'I numeri crescono da soli', { t: ['idle'] }),
    it('rpg', 'GDR', '🗡️', 'Livelli, classi e bottino', { t: ['rpg'] }),
    it('rhythm', 'Rhythm game', '🥁', 'Tutto a tempo', { t: ['rhythm'] }),
  ]),

  cat('keyword', 'Parola chiave', '🔑', 'Una parola da cui far nascere titolo e identità', 'full', [
    it('ombra', 'Ombra', '🌑', 'Ciò che si nasconde dietro ogni cosa', {}),
    it('ingranaggio', 'Ingranaggio', '⚙️', 'Piccoli pezzi, grande macchina', {}),
    it('eco', 'Eco', '🔊', 'Ciò che torna indietro', {}),
    it('radice', 'Radice', '🌳', 'Origine e legami profondi', {}),
    it('marea', 'Marea', '🌊', 'Va e viene, e cambia tutto', {}),
    it('specchio', 'Specchio', '🪞', 'Riflessi e doppi', {}),
    it('cenere', 'Cenere', '🌫️', 'Dopo il fuoco, la rinascita', {}),
    it('bussola', 'Bussola', '🧭', 'Trovare la direzione', {}),
    it('lanterna', 'Lanterna', '🏮', 'Un lume nel buio', {}),
    it('labirinto', 'Labirinto', '🌀', 'Perdersi per ritrovarsi', {}),
    it('tempesta', 'Tempesta', '⛈️', 'Forze che non controlli', {}),
    it('chiave', 'Chiave', '🗝️', 'Apre, chiude, nasconde', {}),
    it('sipario', 'Sipario', '🎭', 'Che si alzi la scena', {}),
    it('miraggio', 'Miraggio', '🏜️', 'Ciò che sembra e non è', {}),
    it('eclissi', 'Eclissi', '🌘', 'Il giorno che diventa notte', {}),
    it('fiamma', 'Fiamma', '🔥', 'Calore, pericolo, luce', {}),
    it('orologio', 'Orologio', '🕰️', 'Il tempo che scorre', {}),
    it('maschera', 'Maschera', '🎭', 'Chi sei davvero?', {}),
    it('costellazione', 'Costellazione', '✨', 'Punti che formano una storia', {}),
    it('silenzio', 'Silenzio', '🤫', 'Ciò che non si dice', {}),
  ]),
];

export const LEVELS = { core: 'Rapida', std: 'Standard', full: 'Completa' };

export function findItem(itemId) {
  for (const c of CATEGORIES) {
    const i = c.items.find((x) => x.id === itemId);
    if (i) return { cat: c, item: i };
  }
  return null;
}
