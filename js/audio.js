/** Suoni generati con WebAudio (nessun file audio esterno). */
let ctx = null;
let enabled = true;

export const setSoundEnabled = (v) => { enabled = !!v; };

function ac() {
  if (!enabled) return null;
  try {
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function note(c, freq, start, dur, { type = 'sine', gain = 0.12, slideTo = null } = {}) {
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const sfx = {
  tick() { const c = ac(); if (c) note(c, 900, 0, 0.05, { type: 'square', gain: 0.05 }); },
  reveal() {
    const c = ac(); if (!c) return;
    note(c, 220, 0, 0.18, { type: 'triangle', gain: 0.12, slideTo: 660 });
    note(c, 660, 0.12, 0.2, { type: 'sine', gain: 0.1 });
  },
  confirm() {
    const c = ac(); if (!c) return;
    note(c, 523, 0, 0.12, { type: 'triangle' });
    note(c, 784, 0.09, 0.18, { type: 'triangle' });
  },
  fanfare() {
    const c = ac(); if (!c) return;
    [523, 659, 784, 1047].forEach((f, i) => note(c, f, i * 0.14, 0.28, { type: 'triangle', gain: 0.14 }));
    note(c, 1047, 0.62, 0.7, { type: 'sine', gain: 0.12 });
    note(c, 784, 0.62, 0.7, { type: 'sine', gain: 0.08 });
    note(c, 523, 0.62, 0.7, { type: 'sine', gain: 0.08 });
  },
};
