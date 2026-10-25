/* ══════════════════════════════════════════════════════════════════
   The opening film's score — composed in code, so there is nothing to
   license and nothing to download, and it lands on the film's cuts to
   the millisecond because both read the same CUE sheet.

   96 BPM, so one bar is exactly 2.5 s and every cut lands on a bar.
     0 – 10    pad + a bell under each word
    10 – 30    a plucked arpeggio and a sub-bass carry the close-ups
    30 – 35    the AI glimpse: the same pulse, with chimes under the answer
    35 – 40    the claim: the pulse stops, pad and a bell under each line
    40 – 47.5  the build: kick, riser, the arpeggio doubles
    47.25      a quarter-second of air
    47.5       THE HIT — the screen is revealed
    47.5 – 66  it rings out under the logo and into the next slide

   scheduleScore() takes any BaseAudioContext, so the same score plays
   live in the deck and renders offline for the review video.
   ══════════════════════════════════════════════════════════════════ */

export const BPM = 96;
export const BEAT = 60 / BPM;          // 0.625 s
export const BAR = BEAT * 4;           // 2.5 s

/* The cue sheet is set on the film's music — "Vibrant Days" (AlexGrohl, Pixabay licence), cut to
   the film: 119.8 BPM, a kick on every beat. Every cut lands on a beat of it (47.5 − 0.50096·k):
   the claim on the breakdown, where the kick drops out; the reveal on the drop. */
export const CUE = {
  words: [2.41, 4.92, 7.42],           // ישיבה. החלטה. משימה.
  wordsOut: 9.93,
  shots: [9.93, 14.94, 19.95, 24.96, 29.97],   // four close-ups and the AI glimpse, ten beats each
  claim: [35.44, 37.48],               // בנינו את Boardirector מחדש. (the breakdown begins) / מהיסוד.
  build: 39.48,                        // the screen assembles — the kick comes back softly
  hit: 47.5,                           // the reveal — on the drop
  title: 49.0,                         // the mark arrives
  end: 56,                             // the last frame holds from here
};
const CALM = [35, 40];                 // the claim's two bars, without the pulse
export const SCORE_LEN = 66;

const SEMI = { C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5, "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11 };
const hz = (n) => {
  const m = /^([A-G]#?)(\d)$/.exec(n);
  return 440 * 2 ** ((SEMI[m[1]] + (+m[2] + 1) * 12 - 69) / 12);
};

const CHORD = {
  Am:  { pad: ["A2", "E3", "B3", "C4", "E4"], arp: ["A3", "C4", "E4", "A4"], root: "A1" },
  F:   { pad: ["F2", "C3", "A3", "C4", "E4"], arp: ["F3", "A3", "C4", "E4"], root: "F1" },
  C:   { pad: ["C3", "G3", "C4", "E4", "G4"], arp: ["C4", "E4", "G4", "C5"], root: "C2" },
  G:   { pad: ["G2", "D3", "G3", "B3", "D4"], arp: ["G3", "B3", "D4", "G4"], root: "G1" },
  Gs4: { pad: ["G2", "D3", "G3", "C4", "D4"], arp: ["G3", "C4", "D4", "G4"], root: "G1" },
};

/* [start, chord, length] — two bars each, then the build splits in half */
const PROG = [
  [0.2, "Am", 4.8], [5, "F", 5], [10, "C", 5], [15, "G", 5],
  [20, "Am", 5], [25, "F", 5], [30, "C", 5], [35, "Am", 5], [40, "F", 3.75], [43.75, "Gs4", 3.5],
];
const chordAt = (t) => CHORD[[...PROG].reverse().find(([s]) => t >= s)[1]];

/* seeded, so the live score and the offline render are the same take */
const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;

function noiseBuffer(ctx) {
  const r = rng(11), len = ctx.sampleRate * 2, b = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = r();
  return b;
}

function impulse(ctx, sec, decay) {
  const r = rng(7), len = Math.floor(ctx.sampleRate * sec);
  const b = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = r() * (1 - i / len) ** decay;
  }
  return b;
}

/* the room and the instruments, shared by every style */
function rig(ctx, out, t0, { level = 0.78, padWave = "sawtooth" } = {}) {
  const T = (s) => t0 + s;
  const jitter = rng(3);

  /* ── the room ─────────────────────────────────────────────── */
  const master = ctx.createGain();
  master.gain.setValueAtTime(level, T(0));
  master.gain.setValueAtTime(level, T(SCORE_LEN - 5));
  master.gain.linearRampToValueAtTime(0, T(SCORE_LEN));
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -12; comp.knee.value = 10; comp.ratio.value = 2.5;
  comp.attack.value = 0.008; comp.release.value = 0.3;
  master.connect(comp); comp.connect(out);

  const revIn = ctx.createGain();
  const rev = ctx.createConvolver(); rev.buffer = impulse(ctx, 4.6, 2.4);
  const revOut = ctx.createGain(); revOut.gain.value = 0.5;
  revIn.connect(rev); rev.connect(revOut); revOut.connect(master);

  /* dotted-eighth echo, darkened on every repeat */
  const dlyIn = ctx.createGain();
  const dly = ctx.createDelay(2); dly.delayTime.value = BEAT * 0.75;
  const dlyF = ctx.createBiquadFilter(); dlyF.type = "lowpass"; dlyF.frequency.value = 2400;
  const dlyFb = ctx.createGain(); dlyFb.gain.value = 0.34;
  const dlyOut = ctx.createGain(); dlyOut.gain.value = 0.38;
  dlyIn.connect(dly); dly.connect(dlyF); dlyF.connect(dlyFb); dlyFb.connect(dly);
  dlyF.connect(dlyOut); dlyOut.connect(master); dlyOut.connect(revIn);

  const bus = (dry, wet, echo = 0) => {
    const g = ctx.createGain();
    const a = ctx.createGain(); a.gain.value = dry; g.connect(a); a.connect(master);
    const b = ctx.createGain(); b.gain.value = wet; g.connect(b); b.connect(revIn);
    if (echo) { const c = ctx.createGain(); c.gain.value = echo; g.connect(c); c.connect(dlyIn); }
    return g;
  };
  const noise = noiseBuffer(ctx);

  /* ── voices ───────────────────────────────────────────────── */
  const pad = (notes, at, dur, { vol = 0.16, cut = [420, 1400], att = 1.4, rel = 2.6, Q = 0.6, wave = padWave } = {}) => {
    const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.Q.value = Q;
    f.frequency.setValueAtTime(cut[0], T(at));
    f.frequency.linearRampToValueAtTime(cut[1], T(at + dur));
    const g = ctx.createGain(), peak = vol / Math.sqrt(notes.length * 3);
    g.gain.setValueAtTime(0, T(at));
    g.gain.linearRampToValueAtTime(peak, T(at + att));
    g.gain.setValueAtTime(peak, T(at + dur));
    g.gain.linearRampToValueAtTime(0, T(at + dur + rel));
    f.connect(g); g.connect(bus(0.7, 0.6));
    for (const n of notes) for (const d of [-8, 0, 8]) {
      const o = ctx.createOscillator(); o.type = wave;
      o.frequency.value = hz(n); o.detune.value = d + jitter() * 3;
      o.connect(f); o.start(T(at)); o.stop(T(at + dur + rel + 0.05));
    }
  };

  const bell = (n, at, { vol = 0.12, dec = 2.8 } = {}) => {
    const o2 = bus(0.6, 0.7, 0.35);
    for (const [ratio, amp] of [[1, 1], [2, 0.32], [3.01, 0.12], [4.2, 0.05]]) {
      const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = hz(n) * ratio;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, T(at));
      g.gain.linearRampToValueAtTime(vol * amp, T(at + 0.006));
      g.gain.exponentialRampToValueAtTime(0.0001, T(at + dec / ratio ** 0.6));
      o.connect(g); g.connect(o2); o.start(T(at)); o.stop(T(at + dec + 0.1));
    }
  };

  const arpBus = bus(0.55, 0.35, 0.5);
  const pluck = (n, at, vol, cut, dec) => {
    const o = ctx.createOscillator(); o.type = "triangle"; o.frequency.value = hz(n);
    const o2 = ctx.createOscillator(); o2.type = "square"; o2.frequency.value = hz(n) * 2;
    const g2 = ctx.createGain(); g2.gain.value = 0.16;
    const f = ctx.createBiquadFilter(); f.type = "lowpass";
    f.frequency.setValueAtTime(cut, T(at));
    f.frequency.exponentialRampToValueAtTime(Math.max(220, cut * 0.25), T(at + dec));
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, T(at));
    g.gain.linearRampToValueAtTime(vol, T(at + 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, T(at + dec));
    o.connect(f); o2.connect(g2); g2.connect(f); f.connect(g); g.connect(arpBus);
    o.start(T(at)); o2.start(T(at)); o.stop(T(at + dec + 0.05)); o2.stop(T(at + dec + 0.05));
  };

  const sub = (n, at, dur, vol = 0.13) => {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, T(at));
    g.gain.linearRampToValueAtTime(vol, T(at + 0.5));
    g.gain.setValueAtTime(vol, T(at + dur - 0.25));
    g.gain.linearRampToValueAtTime(0, T(at + dur));
    g.connect(master);
    for (const [ratio, amp] of [[1, 1], [2, 0.35]]) {      // the octave keeps it audible on laptop speakers
      const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = hz(n) * ratio;
      const a = ctx.createGain(); a.gain.value = amp;
      o.connect(a); a.connect(g); o.start(T(at)); o.stop(T(at + dur + 0.05));
    }
  };

  const kick = (at, vol = 0.7, len = 0.45, f0 = 140, f1 = 42) => {
    const o = ctx.createOscillator(); o.type = "sine";
    o.frequency.setValueAtTime(f0, T(at));
    o.frequency.exponentialRampToValueAtTime(f1, T(at + 0.14));
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, T(at));
    g.gain.exponentialRampToValueAtTime(0.0001, T(at + len));
    o.connect(g); g.connect(master); o.start(T(at)); o.stop(T(at + len + 0.05));
  };

  const swell = (at, dur, vol, from = 300, to = 7000) => {
    const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 2.5;
    f.frequency.setValueAtTime(from, T(at));
    f.frequency.exponentialRampToValueAtTime(to, T(at + dur));
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, T(at));
    g.gain.exponentialRampToValueAtTime(vol, T(at + dur));
    g.gain.linearRampToValueAtTime(0, T(at + dur + 0.04));
    s.connect(f); f.connect(g); g.connect(bus(0.8, 0.3));
    s.start(T(at)); s.stop(T(at + dur + 0.1));
  };


  /* ── softer voices, for the calmer styles ─────────────────── */
  /* electric piano: a sine carrier, its brightness (FM index) falling away */
  const ep = (n, at, { vol = 0.06, dec = 2.2, dest } = {}) => {
    const f = hz(n), car = ctx.createOscillator(), mod = ctx.createOscillator(), mg = ctx.createGain();
    car.type = "sine"; mod.type = "sine"; car.frequency.value = f; mod.frequency.value = f;
    mg.gain.setValueAtTime(f * 2.2, T(at)); mg.gain.exponentialRampToValueAtTime(f * 0.15, T(at + 0.6));
    mod.connect(mg); mg.connect(car.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, T(at)); g.gain.linearRampToValueAtTime(vol, T(at + 0.005));
    g.gain.exponentialRampToValueAtTime(vol * 0.35, T(at + 0.7)); g.gain.exponentialRampToValueAtTime(0.0001, T(at + dec));
    car.connect(g); g.connect(dest || epBus);
    car.start(T(at)); mod.start(T(at)); car.stop(T(at + dec + 0.05)); mod.stop(T(at + dec + 0.05));
  };
  const epBus = bus(0.7, 0.45, 0.15);
  const chordEP = (notes, at, o = {}) => notes.forEach((n, i) => ep(n, at + i * 0.012, o));

  /* marimba: a wooden bar — fundamental, a 4th partial, a quick knock */
  const mbBus = bus(0.6, 0.35, 0.3);
  const marimba = (n, at, vol = 0.07, dec = 0.7) => {
    for (const [r, a, d] of [[1, 1, dec], [3.98, 0.22, dec * 0.35], [9.8, 0.06, dec * 0.12]]) {
      const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = hz(n) * r;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, T(at)); g.gain.linearRampToValueAtTime(vol * a, T(at + 0.003));
      g.gain.exponentialRampToValueAtTime(0.0001, T(at + d));
      o.connect(g); g.connect(mbBus); o.start(T(at)); o.stop(T(at + d + 0.05));
    }
  };

  /* piano: slightly stretched partials, each dying sooner than the one below */
  const pnBus = bus(0.7, 0.5, 0);
  const piano = (n, at, vol = 0.08, dec = 3.2) => {
    const f = hz(n), lp = ctx.createBiquadFilter(); lp.type = "lowpass";
    lp.frequency.setValueAtTime(Math.min(9000, f * 14), T(at)); lp.frequency.exponentialRampToValueAtTime(Math.max(600, f * 3), T(at + dec));
    lp.connect(pnBus);
    for (let k = 1; k <= 6; k++) {
      const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = f * k * Math.sqrt(1 + 0.0004 * k * k);
      const g = ctx.createGain(), d = dec / k ** 0.7;
      g.gain.setValueAtTime(0, T(at)); g.gain.linearRampToValueAtTime(vol / k ** 1.3, T(at + 0.004));
      g.gain.exponentialRampToValueAtTime(0.0001, T(at + d));
      o.connect(g); g.connect(lp); o.start(T(at)); o.stop(T(at + d + 0.05));
    }
  };

  /* a high, dry tick — the minimal style's hi-hat */
  const tickBus = bus(0.5, 0.15, 0);
  const tick = (at, vol = 0.03, dec = 0.05, f = 8500) => {
    const sN = ctx.createBufferSource(); sN.buffer = noise;
    const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = f;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, T(at)); g.gain.exponentialRampToValueAtTime(0.0001, T(at + dec));
    sN.connect(hp); hp.connect(g); g.connect(tickBus); sN.start(T(at), (at * 0.37) % 1.5); sN.stop(T(at + dec + 0.02));
  };

  /* glockenspiel / celesta: a metal bar's partials, bright and short */
  const glBus = bus(0.55, 0.5, 0.3);
  const glock = (n, at, vol = 0.05, dec = 1.4) => {
    for (const [r, a, d] of [[1, 1, dec], [2.76, 0.3, dec * 0.5], [5.4, 0.12, dec * 0.25]]) {
      const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = hz(n) * r;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, T(at)); g.gain.linearRampToValueAtTime(vol * a, T(at + 0.002));
      g.gain.exponentialRampToValueAtTime(0.0001, T(at + d));
      o.connect(g); g.connect(glBus); o.start(T(at)); o.stop(T(at + d + 0.05));
    }
  };

  /* a soft hand clap: three quick noise bursts and a short tail */
  const clBus = bus(0.5, 0.35, 0);
  const clap = (at, vol = 0.05) => {
    const sN = ctx.createBufferSource(); sN.buffer = noise;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1300; bp.Q.value = 0.9;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, T(at));
    for (const d of [0, 0.011, 0.022]) { g.gain.setValueAtTime(vol, T(at + d)); g.gain.exponentialRampToValueAtTime(vol * 0.2, T(at + d + 0.009)); }
    g.gain.setValueAtTime(vol * 0.7, T(at + 0.033)); g.gain.exponentialRampToValueAtTime(0.0001, T(at + 0.2));
    sN.connect(bp); bp.connect(g); g.connect(clBus); sN.start(T(at), (at * 0.53) % 1.5); sN.stop(T(at + 0.25));
  };

  /* bouncy bass: a short round note, dry */
  const bassBus = bus(0.9, 0.05, 0);
  const bass = (n, at, vol = 0.12, dec = 0.3) => {
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 700; lp.connect(bassBus);
    for (const [type, r, a] of [["sine", 1, 1], ["triangle", 2, 0.35]]) {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = hz(n) * r;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, T(at)); g.gain.linearRampToValueAtTime(vol * a, T(at + 0.008));
      g.gain.exponentialRampToValueAtTime(0.0001, T(at + dec));
      o.connect(g); g.connect(lp); o.start(T(at)); o.stop(T(at + dec + 0.05));
    }
  };

  /* finger snap */
  const snapBus = bus(0.6, 0.3, 0);
  const snap = (at, vol = 0.04) => {
    const sN = ctx.createBufferSource(); sN.buffer = noise;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 2700; bp.Q.value = 2.4;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, T(at)); g.gain.exponentialRampToValueAtTime(0.0001, T(at + 0.07));
    sN.connect(bp); bp.connect(g); g.connect(snapBus); sN.start(T(at), (at * 0.71) % 1.5); sN.stop(T(at + 0.1));
  };

  /* a whistle-like lead: a sine with a little vibrato */
  const leadBus = bus(0.6, 0.35, 0.25);
  const whistle = (n, at, dur, vol = 0.05) => {
    const f = hz(n), o = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    o.type = "sine"; o.frequency.value = f; lfo.frequency.value = 5.6; lg.gain.value = f * 0.008;
    lfo.connect(lg); lg.connect(o.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, T(at)); g.gain.linearRampToValueAtTime(vol, T(at + 0.03));
    g.gain.setValueAtTime(vol, T(at + Math.max(0.04, dur - 0.08))); g.gain.linearRampToValueAtTime(0, T(at + dur));
    o.connect(g); g.connect(leadBus);
    o.start(T(at)); lfo.start(T(at)); o.stop(T(at + dur + 0.05)); lfo.stop(T(at + dur + 0.05));
  };

  /* a strummed ukulele chord: bright short plucks, a few ms apart */
  const ukBus = bus(0.65, 0.25, 0.1);
  const strum = (notes, at, vol = 0.04, up = false, dec = 0.42) => {
    (up ? [...notes].reverse() : notes).forEach((n, i) => {
      const t = at + i * 0.013, o = ctx.createOscillator(), o2 = ctx.createOscillator(), g2 = ctx.createGain();
      o.type = "triangle"; o.frequency.value = hz(n); o2.type = "square"; o2.frequency.value = hz(n) * 2; g2.gain.value = 0.12;
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass";
      lp.frequency.setValueAtTime(3600, T(t)); lp.frequency.exponentialRampToValueAtTime(700, T(t + dec));
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, T(t)); g.gain.linearRampToValueAtTime(vol, T(t + 0.003));
      g.gain.exponentialRampToValueAtTime(0.0001, T(t + dec));
      o.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(g); g.connect(ukBus);
      o.start(T(t)); o2.start(T(t)); o.stop(T(t + dec + 0.05)); o2.stop(T(t + dec + 0.05));
    });
  };

  return { ctx, out, T, master, bus, noise, pad, bell, pluck, sub, kick, swell, ep, chordEP, marimba, piano, tick, glock, clap, bass, snap, whistle, strum };
}

/* ── the original: dramatic, minor, a kick and a big hit ─────── */
function drama({ ctx, T, master, bus, noise, pad, bell, pluck, sub, kick, swell }) {
  /* ── the cue sheet ────────────────────────────────────────── */
  for (const [at, name, len] of PROG) {
    const c = CHORD[name];
    const intro = at < 10, build = at >= CUE.build;
    pad(c.pad, at, len, {
      vol: intro ? 0.13 : build ? 0.2 : 0.16,
      cut: intro ? [320, 700] : build ? [1500, 3000] : [700 + (at - 10) * 40, 900 + (at - 10) * 40],
      att: at === 0.2 ? 2.4 : 1.2,
      rel: name === "Gs4" ? 0.15 : 2.6,             // the last one is cut dead for the breath before the hit
    });
    if (at >= 15) sub(c.root, at, at + len > CUE.hit - 0.3 ? CUE.hit - 0.3 - at : len);
  }

  /* a bell under each word, rising */
  ["E5", "A5", "C6"].forEach((n, i) => bell(n, CUE.words[i], { vol: 0.13, dec: 3.2 }));
  swell(8.8, 1.2, 0.05, 400, 3000);                  // a breath into the first close-up

  /* the arpeggio: eighths through the close-ups, sixteenths in the build */
  for (let t = CUE.shots[0]; t < CUE.build; t += BEAT / 2) {
    if (t >= CALM[0] && t < CALM[1]) continue;
    const k = Math.round((t - CUE.shots[0]) / (BEAT / 2));
    const c = chordAt(t), idx = [0, 1, 2, 3, 2, 1, 2, 3][k % 8];
    const fade = Math.min(1, (t - CUE.shots[0]) / 5);
    pluck(c.arp[idx], t, 0.018 + 0.04 * fade, 1400 + (t - 10) * 40, 0.34);
  }
  for (let t = CUE.build; t < CUE.hit - 0.3; t += BEAT / 4) {
    const k = Math.round((t - CUE.build) / (BEAT / 4));
    const c = chordAt(t), idx = [0, 1, 2, 3, 3, 2, 1, 2][k % 8];
    const p = (t - CUE.build) / (CUE.hit - CUE.build);
    pluck(c.arp[idx], t, 0.045 + 0.035 * p, 2200 + 2200 * p, 0.2);
  }

  /* a soft pulse from the third close-up, a real kick in the build */
  for (let t = 20; t < CALM[0]; t += BEAT * 2) kick(t, 0.22, 0.35);
  CUE.claim.forEach((at, i) => bell(["A5", "E6"][i], at, { vol: 0.11, dec: 3.4 }));
  for (let t = CUE.build; t < CUE.hit - BAR; t += BEAT) kick(t, 0.3 + 0.25 * (t - CUE.build) / 5, 0.4);
  for (let t = CUE.hit - BAR; t < CUE.hit - 0.3; t += BEAT / 2) kick(t, 0.5, 0.3);
  swell(CUE.build, CUE.hit - 0.3 - CUE.build, 0.16);

  /* THE HIT */
  kick(CUE.hit, 1.0, 3.2, 90, 30);
  {
    const s = ctx.createBufferSource(); s.buffer = noise;
    const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 5000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.3, T(CUE.hit));
    g.gain.exponentialRampToValueAtTime(0.0001, T(CUE.hit + 1.9));
    s.connect(f); f.connect(g); g.connect(bus(0.35, 0.9));
    s.start(T(CUE.hit)); s.stop(T(CUE.hit + 2));
  }
  pad(["C2", "G2", "C3", "G3", "C4", "E4", "G4"], CUE.hit, 5.5,
    { vol: 0.5, cut: [2800, 1100], att: 0.03, rel: 5 });
  bell("C6", CUE.hit, { vol: 0.1, dec: 4 });
  bell("G5", CUE.hit, { vol: 0.08, dec: 4 });
  bell("E6", CUE.hit + 0.12, { vol: 0.05, dec: 3.4 });

  /* chimes under the AI answer: the question lands, the answer starts, its source lights */
  const ai = CUE.shots[4];
  bell("E6", ai + 1.7, { vol: 0.05, dec: 2.2 });
  bell("G6", ai + 2.4, { vol: 0.045, dec: 2.2 });
  bell("C7", ai + 3.95, { vol: 0.05, dec: 2.8 });

  /* and it settles under the mark */
  bell("G5", CUE.hit + 2.5, { vol: 0.06, dec: 3 });
  bell("E5", CUE.hit + 3.75, { vol: 0.05, dec: 3 });
  bell("C6", CUE.hit + 5, { vol: 0.05, dec: 3.6 });
  pad(["C3", "F3", "A3", "C4", "G4"], CUE.hit + 5.5, 5, { vol: 0.2, cut: [1400, 500], att: 2, rel: 5 });
}

/* the calmer styles share one bright progression: I – vi – IV – I – V – vi – IV – I … – IV – V → I */
const BRIGHT = [[0.2, "C", 4.8], [5, "Am", 5], [10, "F", 5], [15, "C", 5], [20, "G", 5], [25, "Am", 5],
  [30, "F", 5], [35, "C", 5], [40, "F", 3.75], [43.75, "G", 3.5]];
const BCH = {
  C:  { pad: ["C3", "G3", "E4", "G4"], ep: ["E4", "G4", "C5"], arp: ["C4", "E4", "G4", "C5"], root: "C2" },
  Am: { pad: ["A2", "E3", "C4", "E4"], ep: ["C4", "E4", "A4"], arp: ["A3", "C4", "E4", "A4"], root: "A1" },
  F:  { pad: ["F2", "C3", "A3", "E4"], ep: ["A3", "C4", "E4"], arp: ["F3", "A3", "C4", "E4"], root: "F1" },
  G:  { pad: ["G2", "D3", "B3", "D4"], ep: ["B3", "D4", "G4"], arp: ["G3", "B3", "D4", "G4"], root: "G1" },
};
const bchAt = (t) => BCH[[...BRIGHT].reverse().find(([s]) => t >= s)[1]];
const WORDS = ["E5", "G5", "C6"];

/* ── warm & light: electric piano and marimba, no drums; the reveal blooms ── */
function warm({ T, pad, bell, sub, ep, chordEP, marimba }) {
  for (const [at, name, len] of BRIGHT) {
    const c = BCH[name], intro = at < 10, build = at >= CUE.build;
    pad(c.pad, at, len, { vol: intro ? 0.07 : build ? 0.11 : 0.09, cut: intro ? [300, 650] : build ? [900, 1800] : [600, 900],
      att: at === 0.2 ? 2.4 : 1.2, rel: name === "G" && at > 40 ? 0.3 : 2.4 });
    if (at >= 10 && at < CUE.hit) chordEP(c.ep, at, { vol: 0.045, dec: 2.4 });
    if (at >= 15 && at < CUE.hit) sub(c.root, at, at + len > CUE.hit - 0.3 ? CUE.hit - 0.3 - at : len, 0.07);
  }
  CUE.words.forEach((w, i) => { chordEP(BCH.C.ep, w, { vol: 0.04, dec: 2.6 }); marimba(WORDS[i], w, 0.09, 1.1); });
  for (let t = CUE.shots[0]; t < CUE.build; t += BEAT / 2) {
    if (t >= CALM[0] && t < CALM[1]) continue;
    const k = Math.round((t - CUE.shots[0]) / (BEAT / 2)), c = bchAt(t);
    marimba(c.arp[[0, 2, 1, 3, 2, 1, 3, 2][k % 8]], t, 0.035 + 0.02 * Math.min(1, (t - 10) / 5), 0.6);
  }
  CUE.claim.forEach((at, i) => { chordEP(i ? BCH.C.ep : BCH.Am.ep, at, { vol: 0.05, dec: 3 }); marimba(["A5", "E6"][i], at, 0.07, 1.2); });
  for (let t = CUE.build; t < CUE.hit - 0.3; t += BEAT / 2) {        // the build stays in eighths, just brighter
    const k = Math.round((t - CUE.build) / (BEAT / 2)), c = bchAt(t), p = (t - CUE.build) / (CUE.hit - CUE.build);
    marimba(c.arp[[0, 1, 2, 3][k % 4]], t, 0.04 + 0.03 * p, 0.55);
    if (k % 2) marimba(c.arp[3], t + BEAT / 4, 0.02 + 0.025 * p, 0.4);
  }
  /* the reveal: a major chord that opens, no boom */
  pad(["C3", "G3", "C4", "E4", "G4", "C5"], CUE.hit, 6, { vol: 0.3, cut: [1600, 900], att: 0.25, rel: 5 });
  chordEP(["C4", "E4", "G4", "C5"], CUE.hit, { vol: 0.06, dec: 4 });
  sub("C2", CUE.hit, 4, 0.07);
  bell("C6", CUE.hit + 0.05, { vol: 0.07, dec: 4 }); bell("G5", CUE.hit + 0.3, { vol: 0.05, dec: 4 });
  const ai = CUE.shots[4];
  marimba("E6", ai + 1.7, 0.05, 1.2); marimba("G6", ai + 2.4, 0.045, 1.2); marimba("C7", ai + 3.95, 0.05, 1.4);
  marimba("G5", CUE.hit + 2.5, 0.05, 1.4); marimba("E5", CUE.hit + 3.75, 0.05, 1.4); marimba("C6", CUE.hit + 5, 0.05, 1.8);
  pad(["C3", "F3", "A3", "C4", "G4"], CUE.hit + 5.5, 5, { vol: 0.12, cut: [1000, 450], att: 2, rel: 5 });
}

/* ── minimal tech: a muted pulse and light ticks; the build lifts, the reveal is a small sting ── */
function minimal({ T, pad, bell, pluck, sub, kick, tick, swell }) {
  for (const [at, name, len] of BRIGHT) {
    const c = BCH[name], intro = at < 10, build = at >= CUE.build;
    pad(c.pad.slice(0, 3), at, len, { vol: intro ? 0.06 : build ? 0.09 : 0.075, cut: intro ? [260, 520] : build ? [700, 1500] : [480, 700],
      att: at === 0.2 ? 2.6 : 1.4, rel: name === "G" && at > 40 ? 0.3 : 2.6 });
    if (at >= 15 && at < CUE.hit) sub(c.root, at, at + len > CUE.hit - 0.3 ? CUE.hit - 0.3 - at : len, 0.08);
  }
  CUE.words.forEach((w, i) => { pluck(WORDS[i], w, 0.05, 2600, 0.6); tick(w, 0.025, 0.08, 6000); });
  for (let t = CUE.shots[0]; t < CUE.build; t += BEAT / 2) {             // one muted note, root and fifth
    if (t >= CALM[0] && t < CALM[1]) continue;
    const k = Math.round((t - CUE.shots[0]) / (BEAT / 2)), c = bchAt(t);
    pluck(c.arp[[0, 0, 2, 0, 0, 2, 0, 3][k % 8]], t, 0.025 + 0.02 * Math.min(1, (t - 10) / 5), 900 + (t - 10) * 25, 0.18);
    if (t >= 15) tick(t + BEAT / 4, k % 2 ? 0.018 : 0.012, 0.04);
  }
  CUE.claim.forEach((at, i) => { pluck(["A5", "E6"][i], at, 0.05, 2400, 0.7); });
  for (let t = CUE.build; t < CUE.hit - 0.3; t += BEAT / 2) {
    const k = Math.round((t - CUE.build) / (BEAT / 2)), c = bchAt(t), p = (t - CUE.build) / (CUE.hit - CUE.build);
    pluck(c.arp[[0, 2, 1, 3][k % 4]], t, 0.03 + 0.03 * p, 1400 + 2600 * p, 0.2);
    tick(t + BEAT / 4, 0.014 + 0.016 * p, 0.04);
    if (p > 0.6) tick(t + BEAT / 8, 0.01 + 0.01 * p, 0.03);
  }
  swell(CUE.hit - 2.5, 2.2, 0.035, 800, 5000);                            // a light lift, not a riser
  kick(CUE.hit, 0.32, 0.6, 110, 45);                                       // a soft thud, not a hit
  pad(["C3", "G3", "E4", "G4", "C5"], CUE.hit, 5.5, { vol: 0.2, cut: [1800, 800], att: 0.08, rel: 5 });
  pluck("C5", CUE.hit, 0.06, 3000, 1.2); pluck("G5", CUE.hit + 0.02, 0.04, 3000, 1.2);
  bell("C6", CUE.hit + 0.05, { vol: 0.05, dec: 3.2 });
  const ai = CUE.shots[4];
  bell("E6", ai + 1.7, { vol: 0.035, dec: 2 }); bell("G6", ai + 2.4, { vol: 0.03, dec: 2 }); bell("C7", ai + 3.95, { vol: 0.035, dec: 2.4 });
  pluck("G5", CUE.hit + 2.5, 0.035, 2200, 0.9); pluck("E5", CUE.hit + 3.75, 0.035, 2200, 0.9); pluck("C6", CUE.hit + 5, 0.035, 2200, 1.2);
  pad(["C3", "F3", "A3", "C4"], CUE.hit + 5.5, 5, { vol: 0.09, cut: [900, 400], att: 2, rel: 5 });
}

/* ── calm piano: sparse, over a soft pad; the reveal is a full chord ── */
function calmPiano({ T, pad, sub, piano, bell }) {
  for (const [at, name, len] of BRIGHT) {
    const c = BCH[name], intro = at < 10;
    pad(c.pad, at, len, { vol: intro ? 0.05 : 0.07, cut: intro ? [260, 520] : [450, 700],
      att: at === 0.2 ? 2.6 : 1.6, rel: name === "G" && at > 40 ? 0.3 : 2.8 });
    if (at >= 10 && at < CUE.hit) piano(c.root.replace(/\d/, (d) => +d + 1), at, 0.07, 3.6);      // left hand, once a bar pair
    if (at >= 20 && at < CUE.hit) sub(c.root, at, at + len > CUE.hit - 0.3 ? CUE.hit - 0.3 - at : len, 0.05);
  }
  CUE.words.forEach((w, i) => piano(WORDS[i], w, 0.08, 3.4));
  for (let t = CUE.shots[0]; t < CUE.build; t += BEAT) {                   // quarter notes, a broken chord
    if (t >= CALM[0] && t < CALM[1]) continue;
    const k = Math.round((t - CUE.shots[0]) / BEAT), c = bchAt(t);
    piano(c.arp[[1, 2, 3, 2][k % 4]], t, 0.035 + 0.02 * Math.min(1, (t - 10) / 5), 2.2);
  }
  CUE.claim.forEach((at, i) => { piano(["A4", "E5"][i], at, 0.08, 3.6); piano(["E5", "A5"][i], at + 0.02, 0.05, 3.6); });
  for (let t = CUE.build; t < CUE.hit - 0.3; t += BEAT / 2) {             // the build: eighths, a little louder
    const k = Math.round((t - CUE.build) / (BEAT / 2)), c = bchAt(t), p = (t - CUE.build) / (CUE.hit - CUE.build);
    piano(c.arp[[0, 1, 2, 3, 2, 3, 1, 2][k % 8]], t, 0.035 + 0.035 * p, 1.6);
  }
  for (const [n, d] of [["C2", 0], ["G2", 0.01], ["C3", 0.02], ["E4", 0.03], ["G4", 0.035], ["C5", 0.04], ["E5", 0.05]]) piano(n, CUE.hit + d, 0.08, 6);
  pad(["C3", "G3", "C4", "E4", "G4"], CUE.hit, 6, { vol: 0.18, cut: [1200, 600], att: 0.4, rel: 5 });
  const ai = CUE.shots[4];
  piano("E6", ai + 1.7, 0.04, 2.4); piano("G6", ai + 2.4, 0.035, 2.4); piano("C7", ai + 3.95, 0.04, 3);
  piano("G5", CUE.hit + 2.5, 0.045, 3.2); piano("E5", CUE.hit + 3.75, 0.045, 3.2); piano("C6", CUE.hit + 5, 0.045, 4);
  pad(["C3", "F3", "A3", "C4", "G4"], CUE.hit + 5.5, 5, { vol: 0.09, cut: [900, 400], att: 2, rel: 5 });
}


const up = (n, o = 1) => n.replace(/\d$/, (d) => +d + o);
const SW = BEAT / 2 * 0.14;                   // a little swing on the off-beats

/* ── breeze: airy — pads and glockenspiel chimes, no pulse at all ── */
function breeze({ pad, bell, sub, glock }) {
  for (const [at, name, len] of BRIGHT) {
    const c = BCH[name], intro = at < 10;
    pad(c.pad, at, len, { vol: intro ? 0.08 : 0.1, cut: intro ? [380, 800] : [700, 1300], att: at === 0.2 ? 2.4 : 1.8, rel: name === "G" && at > 40 ? 0.4 : 3 });
    if (at >= 20 && at < CUE.hit) sub(c.root, at, at + len > CUE.hit - 0.3 ? CUE.hit - 0.3 - at : len, 0.045);
  }
  CUE.words.forEach((w, i) => { glock(up(WORDS[i]), w, 0.06, 2.2); glock(WORDS[i], w + 0.01, 0.04, 2); });
  for (let t = CUE.shots[0]; t < CUE.build; t += BAR / 2) {               // two chimes every half bar, drifting
    if (t >= CALM[0] && t < CALM[1]) continue;
    const c = bchAt(t), k = Math.round((t - CUE.shots[0]) / (BAR / 2));
    glock(up(c.arp[[1, 2, 3, 2][k % 4]]), t, 0.04, 1.8);
    glock(up(c.arp[[3, 1, 2, 0][k % 4]]), t + BEAT * 1.5, 0.028, 1.6);
  }
  CUE.claim.forEach((at, i) => { glock(["A5", "E6"][i], at, 0.06, 2.4); });
  for (let t = CUE.build; t < CUE.hit - 0.3; t += BEAT / 2) {             // the build: a quiet glock arpeggio
    const k = Math.round((t - CUE.build) / (BEAT / 2)), c = bchAt(t), p = (t - CUE.build) / (CUE.hit - CUE.build);
    glock(up(c.arp[[0, 1, 2, 3][k % 4]]), t, 0.02 + 0.03 * p, 1.1);
  }
  pad(["C3", "G3", "C4", "E4", "G4", "C5"], CUE.hit, 6, { vol: 0.24, cut: [1500, 800], att: 0.6, rel: 5 });
  ["C6", "E6", "G6", "C7"].forEach((n, i) => glock(n, CUE.hit + i * 0.07, 0.05, 2.6));
  bell("C6", CUE.hit + 0.1, { vol: 0.05, dec: 4 });
  const ai = CUE.shots[4];
  glock("E6", ai + 1.7, 0.04, 1.6); glock("G6", ai + 2.4, 0.035, 1.6); glock("C7", ai + 3.95, 0.04, 2);
  glock("G5", CUE.hit + 2.5, 0.04, 2); glock("E5", CUE.hit + 3.75, 0.04, 2); glock("C6", CUE.hit + 5, 0.04, 2.6);
  pad(["C3", "F3", "A3", "C4", "G4"], CUE.hit + 5.5, 5, { vol: 0.1, cut: [1000, 450], att: 2, rel: 5 });
}

/* ── lo-fi: mellow electric piano with a lazy swing and brushed ticks ── */
function lofi({ pad, sub, ep, chordEP, tick, bell, kick }) {
  for (const [at, name, len] of BRIGHT) {
    const c = BCH[name], intro = at < 10;
    pad(c.pad.slice(0, 3), at, len, { vol: intro ? 0.06 : 0.07, cut: intro ? [300, 600] : [500, 750], att: at === 0.2 ? 2.4 : 1.4, rel: name === "G" && at > 40 ? 0.3 : 2.6 });
    if (at >= 15 && at < CUE.hit) sub(c.root, at, at + len > CUE.hit - 0.3 ? CUE.hit - 0.3 - at : len, 0.07);
  }
  CUE.words.forEach((w, i) => { chordEP(BCH.C.ep, w, { vol: 0.045, dec: 2.8 }); ep(WORDS[i], w + 0.02, { vol: 0.04, dec: 2 }); });
  for (let t = CUE.shots[0]; t < CUE.build; t += BEAT) {
    if (t >= CALM[0] && t < CALM[1]) continue;
    const k = Math.round((t - CUE.shots[0]) / BEAT), c = bchAt(t), f = Math.min(1, (t - 10) / 5);
    if (k % 4 === 0) chordEP(c.ep, t, { vol: 0.04 + 0.01 * f, dec: 2.2 });
    if (k % 4 === 1) chordEP(c.ep.slice(1), t + BEAT / 2 + SW, { vol: 0.03 + 0.01 * f, dec: 1.4 });
    if (t >= 15) { tick(t, 0.012, 0.05, 7000); tick(t + BEAT / 2 + SW, 0.018, 0.05, 7000); }
    if (t >= 20 && k % 2 === 1) tick(t, 0.03, 0.16, 2500);                 // the brush on 2 and 4
    if (t >= 20 && k % 4 === 0) kick(t, 0.12, 0.3, 100, 50);
  }
  CUE.claim.forEach((at, i) => { chordEP(i ? BCH.C.ep : BCH.Am.ep, at, { vol: 0.05, dec: 3.2 }); });
  for (let t = CUE.build; t < CUE.hit - 0.3; t += BEAT) {
    const k = Math.round((t - CUE.build) / BEAT), c = bchAt(t), p = (t - CUE.build) / (CUE.hit - CUE.build);
    chordEP(c.ep, t, { vol: 0.035 + 0.025 * p, dec: 1.6 });
    tick(t + BEAT / 2 + SW, 0.02 + 0.015 * p, 0.05, 7000);
    if (k % 2 === 1) tick(t, 0.035, 0.16, 2500);
    if (k % 2 === 0) kick(t, 0.13 + 0.07 * p, 0.3, 100, 50);
  }
  chordEP(["C4", "E4", "G4", "B4", "D5"], CUE.hit, { vol: 0.055, dec: 4.5 });
  pad(["C3", "G3", "E4", "B4"], CUE.hit, 6, { vol: 0.18, cut: [1200, 600], att: 0.4, rel: 5 });
  sub("C2", CUE.hit, 3.5, 0.07);
  const ai = CUE.shots[4];
  ep("E5", ai + 1.7, { vol: 0.035, dec: 1.8 }); ep("G5", ai + 2.4, { vol: 0.03, dec: 1.8 }); ep("C6", ai + 3.95, { vol: 0.035, dec: 2.2 });
  ep("G4", CUE.hit + 2.5, { vol: 0.035, dec: 2.4 }); ep("E4", CUE.hit + 3.75, { vol: 0.035, dec: 2.4 }); ep("C5", CUE.hit + 5, { vol: 0.035, dec: 3 });
  pad(["C3", "F3", "A3", "C4", "E4"], CUE.hit + 5.5, 5, { vol: 0.09, cut: [900, 400], att: 2, rel: 5 });
}

/* ── bright: a light, upbeat groove — offbeat piano, shaker, soft claps ── */
function bright({ pad, sub, piano, tick, clap, kick, bell, swell }) {
  for (const [at, name, len] of BRIGHT) {
    const c = BCH[name], intro = at < 10;
    pad(c.pad, at, len, { vol: intro ? 0.06 : 0.08, cut: intro ? [400, 800] : [800, 1200], att: at === 0.2 ? 2 : 1, rel: name === "G" && at > 40 ? 0.3 : 2.2 });
    if (at >= 10 && at < CUE.hit) sub(c.root, at, at + len > CUE.hit - 0.3 ? CUE.hit - 0.3 - at : len, 0.08);
  }
  CUE.words.forEach((w, i) => { piano(WORDS[i], w, 0.08, 2.4); piano(up(WORDS[i], -1), w + 0.015, 0.05, 2.4); });
  for (let t = CUE.shots[0]; t < CUE.build; t += BEAT / 2) {
    if (t >= CALM[0] && t < CALM[1]) continue;
    const k = Math.round((t - CUE.shots[0]) / (BEAT / 2)), c = bchAt(t), f = Math.min(1, (t - 10) / 5);
    if (k % 2 === 1) c.ep.forEach((n, j) => piano(n, t + j * 0.008, 0.03 + 0.015 * f, 0.5));   // offbeat chords
    tick(t + (k % 2 ? 0 : BEAT / 4), 0.012 + 0.008 * f, 0.06, 6500);                           // the shaker
    if (t >= 20 && k % 4 === 2) clap(t, 0.045);
    if (t >= 20 && k % 4 === 0) kick(t, 0.16, 0.3, 110, 48);
  }
  CUE.claim.forEach((at, i) => { piano(["A4", "E5"][i], at, 0.08, 3.2); piano(["C5", "A5"][i], at + 0.015, 0.06, 3.2); });
  for (let t = CUE.build; t < CUE.hit - 0.3; t += BEAT / 2) {
    const k = Math.round((t - CUE.build) / (BEAT / 2)), c = bchAt(t), p = (t - CUE.build) / (CUE.hit - CUE.build);
    if (k % 2 === 1) c.ep.forEach((n, j) => piano(n, t + j * 0.008, 0.04 + 0.025 * p, 0.45));
    tick(t, 0.014 + 0.012 * p, 0.05, 6500); tick(t + BEAT / 4, 0.01 + 0.01 * p, 0.04, 6500);
    if (k % 4 === 2) clap(t, 0.05 + 0.02 * p);
    if (k % 2 === 0) kick(t, 0.17 + 0.08 * p, 0.3, 110, 48);
  }
  swell(CUE.hit - 1.6, 1.3, 0.03, 1200, 6000);
  [["C3", 0], ["G3", 0.01], ["C4", 0.02], ["E4", 0.03], ["G4", 0.04], ["C5", 0.05]].forEach(([n, d]) => piano(n, CUE.hit + d, 0.08, 5));
  kick(CUE.hit, 0.28, 0.5, 100, 45); clap(CUE.hit, 0.05);
  pad(["C3", "G3", "C4", "E4", "G4"], CUE.hit, 6, { vol: 0.2, cut: [1600, 700], att: 0.2, rel: 5 });
  bell("C6", CUE.hit + 0.05, { vol: 0.05, dec: 3.6 });
  const ai = CUE.shots[4];
  piano("E6", ai + 1.7, 0.04, 2); piano("G6", ai + 2.4, 0.035, 2); piano("C7", ai + 3.95, 0.04, 2.6);
  piano("G5", CUE.hit + 2.5, 0.045, 3); piano("E5", CUE.hit + 3.75, 0.045, 3); piano("C6", CUE.hit + 5, 0.045, 3.6);
  pad(["C3", "F3", "A3", "C4", "G4"], CUE.hit + 5.5, 5, { vol: 0.1, cut: [1000, 450], att: 2, rel: 5 });
}

/* ── music box: a simple celesta melody over a light pad ── */
function musicBox({ pad, sub, glock, bell }) {
  for (const [at, name, len] of BRIGHT) {
    const c = BCH[name], intro = at < 10;
    pad(c.pad, at, len, { vol: intro ? 0.06 : 0.075, cut: intro ? [350, 700] : [600, 1000], att: at === 0.2 ? 2.4 : 1.6, rel: name === "G" && at > 40 ? 0.3 : 2.8 });
    if (at >= 15 && at < CUE.hit) sub(c.root, at, at + len > CUE.hit - 0.3 ? CUE.hit - 0.3 - at : len, 0.05);
  }
  CUE.words.forEach((w, i) => glock(up(WORDS[i]), w, 0.06, 2));
  const MEL = [2, 3, 4, 3, 2, 1, 2, -1];                                    // an arpeggio index per beat; 4 = an octave up, -1 = rest
  for (let t = CUE.shots[0]; t < CUE.build; t += BEAT) {
    if (t >= CALM[0] && t < CALM[1]) continue;
    const k = Math.round((t - CUE.shots[0]) / BEAT), c = bchAt(t), m = MEL[k % 8];
    if (m < 0) continue;
    const n = m === 4 ? up(c.arp[0]) : c.arp[m];
    glock(up(n), t, 0.035 + 0.015 * Math.min(1, (t - 10) / 5), 1.4);
  }
  CUE.claim.forEach((at, i) => { glock(["A5", "E6"][i], at, 0.06, 2.2); glock(["E5", "A5"][i], at + 0.01, 0.035, 2); });
  for (let t = CUE.build; t < CUE.hit - 0.3; t += BEAT / 2) {             // the build: the melody doubles
    const k = Math.round((t - CUE.build) / (BEAT / 2)), c = bchAt(t), p = (t - CUE.build) / (CUE.hit - CUE.build);
    const m = [0, 1, 2, 3, 4, 3, 2, 1][k % 8], n = m === 4 ? up(c.arp[0]) : c.arp[m];
    glock(up(n), t, 0.03 + 0.03 * p, 1);
  }
  pad(["C3", "G3", "C4", "E4", "G4"], CUE.hit, 6, { vol: 0.2, cut: [1400, 700], att: 0.4, rel: 5 });
  ["C6", "E6", "G6", "C7"].forEach((n, i) => glock(n, CUE.hit + i * 0.09, 0.05, 2.6));
  sub("C2", CUE.hit, 3, 0.05);
  bell("C6", CUE.hit + 0.1, { vol: 0.045, dec: 3.6 });
  const ai = CUE.shots[4];
  glock("E6", ai + 1.7, 0.04, 1.6); glock("G6", ai + 2.4, 0.035, 1.6); glock("C7", ai + 3.95, 0.04, 2);
  glock("G5", CUE.hit + 2.5, 0.04, 2); glock("E5", CUE.hit + 3.75, 0.04, 2); glock("C6", CUE.hit + 5, 0.04, 2.6);
  pad(["C3", "F3", "A3", "C4", "G4"], CUE.hit + 5.5, 5, { vol: 0.09, cut: [900, 400], att: 2, rel: 5 });
}

/* ══ the fun family: no sustained strings at all — short notes, a groove, a tune, a "ta-da" ══
   One arrangement, three sets of instruments. */
const UKE = { C: ["G4", "C4", "E4", "C5"], Am: ["A4", "C4", "E4", "A4"], F: ["A4", "C4", "F4", "A4"], G: ["G4", "B3", "D4", "G4"] };
const LEAD = [[0, 2, 0.45], [0.75, 1, 0.3], [1.5, 2, 0.45], [2, 3, 0.9], [3.5, 2, 0.4], [4, 1, 0.45], [4.75, 0, 0.3], [5.5, 1, 0.45], [6, 2, 1.2]];
const STRUM = [[0, false], [1, false], [1.5, true], [2.5, true], [3, false], [3.5, true]];

function fun(R, v) {
  const { bass, snap, clap, kick, tick, glock, whistle, strum, marimba, piano } = R;
  const chordHit = (c, at, vol, upStroke) => {
    if (v.chords === "uke") strum(UKE[c], at, vol, upStroke);
    else if (v.chords === "piano") BCH[c].ep.forEach((n, j) => piano(n, at + j * 0.006, vol * 1.6, 0.35));
    else BCH[c].ep.forEach((n, j) => marimba(n, at + j * 0.006, vol * 1.4, 0.4));
  };
  const lead = (n, at, dur, vol) => (v.lead === "whistle" ? whistle(n, at, dur, vol) : glock(up(n), at, vol * 1.1, Math.max(0.6, dur * 1.4)));
  const nameAt = (t) => [...BRIGHT].reverse().find(([s]) => t >= s)[1];
  const segStart = (t) => [...BRIGHT].reverse().find(([s]) => t >= s)[0];
  const END = CUE.hit + BAR * 3;                  // the groove carries on lightly under the mark, then a last stab

  /* the words: a bright stab and a chime on each */
  CUE.words.forEach((w, i) => { chordHit("C", w, 0.05, false); glock(up(WORDS[i]), w + 0.01, 0.055, 1.2); });
  for (let t = CUE.words[0]; t < CUE.shots[0]; t += BEAT) if (Math.round(t / BEAT) % 2) snap(t, 0.03);

  for (let t = CUE.shots[0]; t < END; t += BEAT / 2) {
    const calm = t >= CALM[0] && t < CALM[1], build = t >= CUE.build && t < CUE.hit, after = t >= CUE.hit;
    if (after && t < CUE.hit + BEAT * 2) continue;                       // a breath after the ta-da
    const name = after ? (t < CUE.hit + BAR * 2 ? "C" : "F") : nameAt(t), c = BCH[name];
    const k = Math.round((t - CUE.shots[0]) / (BEAT / 2)), beat = (k % 8) / 2, down = after ? 0.6 : 1;
    if (calm) { if (k % 2) snap(t, 0.03); continue; }
    /* the bass hops: root, octave, fifth, octave */
    const root = up(c.root), fifth = up(c.pad[1], -1);
    const bn = { 0: root, 1.5: up(root), 2: fifth, 3.5: up(root) }[beat];
    if (bn) bass(bn, t, 0.11 * down, beat === 0 ? 0.42 : 0.26);
    /* the chords */
    if (v.chords === "uke") { const st = STRUM.find(([b]) => b === beat); if (st) strum(UKE[name], t, (build ? 0.036 : 0.03) * down, st[1]); }
    else if (beat === 0.5 || beat === 2.5 || beat === 3.5) chordHit(name, t, (build ? 0.04 : 0.032) * down, false);
    /* the beat */
    if (beat === 0 || beat === 2) kick(t, (build ? 0.16 : 0.12) * down, 0.28, 120, 50);
    if ((beat === 1 || beat === 3) && t >= 12.5) (v.snaps ? snap : clap)(t, (v.snaps ? 0.04 : 0.045) * down);
    tick(t + (k % 2 ? 0 : 0.0), (k % 2 ? 0.016 : 0.01) * down, 0.05, 6800);
    if (build && t >= CUE.hit - BAR) clap(t, 0.03 + 0.03 * (t - (CUE.hit - BAR)) / BAR);   // a clap roll into the reveal
  }

  /* the tune: from the third close-up, one phrase per chord; an octave up in the build */
  for (const [at, name] of BRIGHT) {
    if (at < 20 || at >= CUE.hit || (at >= CALM[0] && at < CALM[1])) continue;
    const c = BCH[name], hi = at >= CUE.build ? 1 : 0;
    for (const [o, idx, d] of LEAD) {
      const t = at + o * BEAT; if (t >= CUE.hit - 0.2 || (at === 40 && t >= 43.75)) continue;
      lead(up(c.arp[idx], hi), t, d * BEAT, 0.045);
    }
  }
  if (v.lead) for (let i = 0; i < 6; i++) glock(["C5", "D5", "E5", "G5", "A5", "B5"][i], CUE.hit - 1.25 + i * 0.2, 0.03 + i * 0.006, 0.6);  // a little run up

  /* the claim: a breakdown — a stab and a chime on each line */
  CUE.claim.forEach((at, i) => { chordHit(i ? "C" : "Am", at, 0.045, false); glock(["A5", "E6"][i], at + 0.01, 0.055, 1.4); });

  /* ta-da */
  chordHit("C", CUE.hit, 0.04, false); bass("C3", CUE.hit, 0.09, 0.6); kick(CUE.hit, 0.12, 0.45, 110, 45); clap(CUE.hit, 0.03);
  ["C6", "E6", "G6", "C7"].forEach((n, i) => glock(n, CUE.hit + 0.05 + i * 0.07, 0.04, 1.2));
  if (v.lead === "whistle") whistle("C6", CUE.hit + 0.05, 0.7, 0.04);

  /* the AI glimpse: three chimes under the answer */
  const ai = CUE.shots[4];
  glock("E6", ai + 1.7, 0.04, 1); glock("G6", ai + 2.4, 0.035, 1); glock("C7", ai + 3.95, 0.04, 1.2);

  /* and out: one last stab and a sparkle */
  chordHit("C", END, 0.055, false); bass("C3", END, 0.11, 0.5);
  ["G6", "C7"].forEach((n, i) => glock(n, END + 0.05 + i * 0.09, 0.045, 1.4));
}
const funPop = (R) => fun(R, { chords: "marimba", lead: "whistle" });
const funUke = (R) => fun(R, { chords: "uke", lead: "glock", snaps: true });
const funBounce = (R) => fun(R, { chords: "piano", lead: null });

/* ── the film's music: the edited track, decoded ahead of time ── */
const TRACK_URL = `${import.meta.env.BASE_URL}audio/film-music.wav`;
let trackBuf = null;
if (typeof window !== "undefined" && window.OfflineAudioContext) {
  fetch(TRACK_URL).then((r) => r.arrayBuffer())
    .then((b) => new OfflineAudioContext(2, 44100, 44100).decodeAudioData(b))
    .then((buf) => { trackBuf = buf; }).catch(() => {});
}
function track(R) {
  if (!trackBuf) return drama(R);                           // not loaded (offline, or a broken file): the coded score
  const src = R.ctx.createBufferSource(); src.buffer = trackBuf;
  const g = R.ctx.createGain(); g.gain.value = 0.72;        // mastered already: straight out, no compressor, a little lower
  src.connect(g); g.connect(R.out); src.start(R.T(0));
}

/* the options; ?music=<key> picks one */
export const STYLES = {
  track: { name: "Vibrant Days", fn: track, level: 1 },
  warm: { name: "חם ואופטימי", fn: warm, level: 1.2, padWave: "triangle" },
  minimal: { name: "מינימלי טכנולוגי", fn: minimal, level: 1.5, padWave: "triangle" },
  piano: { name: "פסנתר רגוע", fn: calmPiano, level: 1.6, padWave: "triangle" },
  pop: { name: "כיפי: מרימבה, מחיאות כפיים ושריקה", fn: funPop, level: 3.2 },
  uke: { name: "כיפי: יוקללה וגלוקנשפיל", fn: funUke, level: 3.4 },
  bounce: { name: "כיפי: פסנתר קופצני", fn: funBounce, level: 3.2 },
  breeze: { name: "אוורירי", fn: breeze, level: 1.48, padWave: "triangle" },
  lofi: { name: "לו-פיי רגוע", fn: lofi, level: 1.4, padWave: "triangle" },
  bright: { name: "קליל וקצבי", fn: bright, level: 1.3, padWave: "triangle" },
  musicbox: { name: "תיבת נגינה", fn: musicBox, level: 1.68, padWave: "triangle" },
  drama: { name: "דרמטי (המקורי)", fn: drama, level: 0.78 },
};
let style = (typeof location !== "undefined" && new URLSearchParams(location.search).get("music")) || "track";
if (!STYLES[style]) style = "track";
export const scoreStyle = () => style;
export const setScoreStyle = (s) => { if (STYLES[s]) style = s; };

export function scheduleScore(ctx, out, t0, which = style) {
  const st = STYLES[which] || STYLES.drama;
  st.fn(rig(ctx, out, t0, { level: st.level, padWave: st.padWave }));
}

/* ── live playback ───────────────────────────────────────────── */
let live = null;

export function playScore() {
  stopScore(0.15);
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  const ctx = new AC();
  ctx.resume?.();
  const out = ctx.createGain(); out.connect(ctx.destination);
  const t0 = ctx.currentTime + 0.08;
  scheduleScore(ctx, out, t0);
  live = { ctx, out, t0 };
  return live;
}

export function stopScore(fade = 0.8) {
  if (!live) return;
  const { ctx, out } = live;
  live = null;
  try { out.gain.setTargetAtTime(0, ctx.currentTime, fade / 4); } catch {}
  setTimeout(() => ctx.close().catch(() => {}), fade * 1000 + 300);
}

/* pausing the audio context freezes its clock too — and the film reads
   that clock, so picture and music pause together */
export function pauseScore() { live?.ctx.suspend().catch(() => {}); }
export function resumeScore() { live?.ctx.resume().catch(() => {}); }

export function muteScore() {
  if (!live) return;
  const g = live.out.gain;
  g.setTargetAtTime(g.value > 0.5 ? 0 : 1, live.ctx.currentTime, 0.05);
}

/* seconds since the score started, or null when nothing is playing */
export const scoreClock = () => (live ? live.ctx.currentTime - live.t0 : null);
