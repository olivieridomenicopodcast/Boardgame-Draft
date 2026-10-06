/** RNG seedabile e deterministico: stesso seed => stessa sequenza. */

// Hash stringa -> intero a 32 bit (xmur3)
export function hashString(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

// mulberry32: generatore a 32 bit, veloce e di buona qualità per i giochi
export function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed) {
  const next = mulberry32(hashString(String(seed)));
  const rng = {
    next,
    int: (n) => Math.floor(next() * n),
    pick: (arr) => arr[rng.int(arr.length)],
    shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = rng.int(i + 1);
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
  };
  return rng;
}

/** Seed leggibile tipo DADO-LUPO-4821 (usa Math.random: serve solo a "inventare" il seed). */
export function randomSeed(words, random = Math.random) {
  const w = () => words[Math.floor(random() * words.length)];
  const n = String(1000 + Math.floor(random() * 9000));
  return `${w()}-${w()}-${n}`;
}

export function normalizeSeed(s) {
  return String(s || '').trim().toUpperCase().replace(/\s+/g, '-');
}
