/** Parole per il generatore di titoli e per i seed leggibili. Aggiungine quante vuoi. */

// Sostantivi con genere: g = 'm' | 'f'; art = articolo determinativo.
export const NOUNS = [
  { w: 'Tesoro', g: 'm', art: 'Il' }, { w: 'Regno', g: 'm', art: 'Il' }, { w: 'Segreto', g: 'm', art: 'Il' },
  { w: 'Viaggio', g: 'm', art: 'Il' }, { w: 'Torneo', g: 'm', art: 'Il' }, { w: 'Patto', g: 'm', art: 'Il' },
  { w: 'Enigma', g: 'm', art: 'L’' }, { w: 'Impero', g: 'm', art: 'L’' }, { w: 'Oracolo', g: 'm', art: 'L’' },
  { w: 'Mappa', g: 'f', art: 'La' }, { w: 'Corona', g: 'f', art: 'La' }, { w: 'Locanda', g: 'f', art: 'La' },
  { w: 'Fortezza', g: 'f', art: 'La' }, { w: 'Sfida', g: 'f', art: 'La' }, { w: 'Leggenda', g: 'f', art: 'La' },
  { w: 'Alleanza', g: 'f', art: 'L’' }, { w: 'Isola', g: 'f', art: 'L’' }, { w: 'Ultima Mano', g: 'f', art: 'L’' },
];

// Aggettivi [maschile, femminile]
export const ADJECTIVES = [
  ['Perduto', 'Perduta'], ['Proibito', 'Proibita'], ['Dimenticato', 'Dimenticata'], ['Infinito', 'Infinita'],
  ['Segreto', 'Segreta'], ['Spezzato', 'Spezzata'], ['Maledetto', 'Maledetta'], ['Impossibile', 'Impossibile'],
  ['Nascosto', 'Nascosta'], ['Sconosciuto', 'Sconosciuta'], ['Fragile', 'Fragile'], ['Scintillante', 'Scintillante'],
];

// Complementi "di ..." (già con preposizione articolata)
export const GENITIVES = [
  'dei Dadi', 'delle Ombre', 'dell’Abisso', 'del Tuono', 'dei Mille Mazzi', 'della Notte',
  'dell’Ultimo Turno', 'del Re Mancato', 'dei Sette Mari', 'del Cielo Vuoto', 'della Pedina Rossa', 'dei Bugiardi',
];

export const SEED_WORDS = [
  'DADO', 'LUPO', 'CARTA', 'TORRE', 'MEEPLE', 'DRAGO', 'FARO', 'GUFO', 'RUNA', 'ORSO', 'VOLPE', 'LUNA',
  'PEDINA', 'MAPPA', 'TESORO', 'CORVO', 'ALFIERE', 'TAVOLA', 'BUSSOLA', 'FUOCO', 'GATTO', 'PONTE',
];
