import { useEffect, useRef, useState } from "react";
import { T } from "../tokens.js";
import { CUE, playScore, stopScore, scoreClock, pauseScore, resumeScore } from "./score.js";
import { Play, Pause, RotateCcw, SkipForward } from "lucide-react";
import { clamp, span, out3, inOut, mix } from "./ease.js";
import { Frag } from "./Frag.jsx";
import { SHOT_W, SHOT_H, agendaShot, decisionsShot, tasksShot, workplanShot, askShot } from "./filmShots.js";

/* ══════════════════════════════════════════════════════════════════
   The opening film — about 46 seconds, plays itself, no speaker.

   Every frame is a pure function of t (seconds), read from the score's
   own audio clock — so picture and music cannot drift apart, and any
   frame can be rendered on its own for review (window.__filmSeek).

     0 – 10    three words: ישיבה. החלטה. משימה.
    10 – 30    four close-ups of the live app, drifting in depth — rows land,
               a ring fills, a card crosses the board, a committee opens
    30 – 35    a glimpse of AI: querying documents and meetings
    35 – 40    the claim: בנינו את Boardirector מחדש. מהיסוד.
    40 – 47.5  the home screen assembles itself, piece by piece
    47.5       the hit — camera pulls back, the screen tilts, the mark lands
   ══════════════════════════════════════════════════════════════════ */

export const FILM_BG = "#05080F";
const A = (p) => `${import.meta.env.BASE_URL}${p.replace(/^\//, "")}`;
const SRC = {
  agenda: A("captures/new/agenda-published.png"),   // the raw capture shows this meeting as בוטל
  decisions: A("captures/new/decisions.png"),
  tasks: A("captures/new/tasks.png"),
  workplan: A("captures/new/workplan.png"),
  documents: A("captures/new/documents-published.png"),
  home: A("captures/new/home-v2.png"),       // product capture + the recent-documents widget from the dev build
};
const NAT = [3200, 2000];

/* a rectangle of a real capture, [x, y, w, h] in its 3200×2000 pixels */
function Crop({ src, r, w, style }) {
  const k = w / r[2];
  return (
    <div style={{
      width: w, height: r[3] * k,
      backgroundImage: `url(${src})`, backgroundRepeat: "no-repeat",
      backgroundSize: `${NAT[0] * k}px ${NAT[1] * k}px`,
      backgroundPosition: `${-r[0] * k}px ${-r[1] * k}px`,
      ...style,
    }} />
  );
}

/* ── 1 · the words ───────────────────────────────────────────── */
const WORDS = ["ישיבה.", "החלטה.", "משימה."];

function Words({ t }) {
  const gone = span(t, CUE.wordsOut - 0.7, CUE.wordsOut + 0.2);
  if (gone >= 1) return null;
  return (
    <div style={{
      position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
      gap: 64, direction: "rtl",
      opacity: 1 - gone, transform: `scale(${1 + gone * 0.14})`, filter: `blur(${gone * 10}px)`,
    }}>
      {WORDS.map((w, i) => {
        const p = out3(span(t, CUE.words[i], CUE.words[i] + 0.9));
        const dim = i < 2 ? span(t, CUE.words[i + 1], CUE.words[i + 1] + 0.6) : 0;
        return (
          <span key={w} style={{
            fontFamily: T.font, fontWeight: 700, fontSize: 150, letterSpacing: "-0.02em",
            color: `rgba(255,255,255,${p * (1 - dim * 0.68)})`,
            transform: `translateY(${(1 - p) * 34}px)`, filter: `blur(${(1 - p) * 14}px)`,
          }}>{w}</span>
        );
      })}
    </div>
  );
}

/* ── 3 · the claim, just before the reveal ───────────────────── */
const CLAIM = [
  ["בנינו את Boardirector"],
  [<>מחדש. <span key="o" style={{ color: T.orange }}>מהיסוד.</span></>],
];

function Claim({ t }) {
  const [a, b] = CUE.claim;
  const gone = span(t, CUE.build - 0.75, CUE.build - 0.05);   // gone before the app arrives
  if (t < a - 0.1 || gone >= 1) return null;
  return (
    <div style={{
      position: "absolute", inset: 0, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", direction: "rtl",
      opacity: 1 - gone, transform: `scale(${1 + gone * 0.1})`, filter: `blur(${gone * 10}px)`,
    }}>
      {CLAIM.map(([line], i) => {
        const p = out3(span(t, [a, b][i], [a, b][i] + 0.9));
        return (
          <div key={i} style={{
            fontFamily: T.font, fontWeight: 700, fontSize: 128, lineHeight: 1.18, letterSpacing: "-0.02em",
            color: "#fff", opacity: p, transform: `translateY(${(1 - p) * 34}px)`, filter: `blur(${(1 - p) * 12}px)`,
          }}>{line}</div>
        );
      })}
    </div>
  );
}

/* ── 2 · the close-ups ───────────────────────────────────────── */
/* The sharp layer is the live app (filmShots.js); the blurred layers
   behind it are real captures, where nobody reads them. */
const SHOTS = [
  { src: "agenda", label: "סדר יום", side: -1, live: agendaShot,
    mid: [60, 1250, 1980, 620], far: [0, 0, 3200, 2000] },
  { src: "decisions", label: "מעקב החלטות", side: 1, live: decisionsShot,
    mid: [150, 1400, 2500, 560], far: [0, 0, 3200, 2000] },
  { src: "tasks", label: "משימות", side: -1, live: tasksShot,
    mid: [0, 180, 2650, 220], far: [0, 0, 3200, 2000] },
  { src: "workplan", label: "תוכנית עבודה", side: 1, live: workplanShot,
    mid: [0, 140, 2650, 260], far: [0, 0, 3200, 2000] },
  { src: "documents", label: "תשאול מסמכים וישיבות", tag: "AI", side: -1, live: askShot,
    far: [0, 0, 3200, 2000] },
];
const SHOT_LEN = 5, XF = 0.7;

function Shot({ s, t0, t }) {
  const p = span(t, t0, t0 + SHOT_LEN);
  const fadeIn = out3(span(t, t0, t0 + XF));
  const fadeOut = span(t, t0 + SHOT_LEN - XF * 0.4, t0 + SHOT_LEN + XF * 0.6);
  const op = fadeIn * (1 - fadeOut);
  const d = s.side, e = inOut(p);
  const html = s.live(clamp(t - t0, 0, SHOT_LEN + XF));
  /* stays mounted while hidden, so its fragment is ready the moment it is needed */
  const through = 1 + fadeOut * 0.12;        // leaving: the camera keeps moving through it
  return (
    <div style={{
      position: "absolute", inset: 0, opacity: op, visibility: op > 0 ? "visible" : "hidden",
      perspective: 2000, perspectiveOrigin: "50% 45%",
    }}>
      <div style={{
        position: "absolute", left: "50%", top: "50%",
        transform: `translate(-50%,-50%) translateX(${mix(70, -70, e) * d}px) scale(${mix(1.08, 1.16, e)})`,
        filter: "blur(18px)", opacity: 0.2,
      }}>
        <Crop src={SRC[s.src]} r={s.far} w={2700} />
      </div>
      {s.mid && (
        <div style={{
          position: "absolute", left: "50%", top: "50%",
          transform: `translate(-50%,-50%) translate(${mix(-430, -360, e) * d}px, ${mix(300, 250, e)}px)
                      rotateY(${18 * d}deg) translateZ(-260px)`,
          filter: "blur(3px)", opacity: 0.5,
        }}>
          <Crop src={SRC[s.src]} r={s.mid} w={1250} style={{ borderRadius: 18 }} />
        </div>
      )}
      <div style={{
        position: "absolute", left: "50%", top: "48%",
        transform: `translate(-50%,-50%) translateX(${mix(90, -60, e) * d}px)
                    rotateY(${mix(17, 7, e) * d}deg) rotateX(${mix(8, 3, e)}deg)
                    scale(${mix(0.95, 1.05, e) * through})`,
      }}>
        <Frag html={html} w0={SHOT_W} h0={SHOT_H} w={1460} style={{
          borderRadius: 20, background: "#fff",
          boxShadow: "0 50px 120px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.06)",
        }} />
      </div>
      <div style={{
        position: "absolute", right: 130, bottom: 96, direction: "rtl",
        fontFamily: T.font, fontWeight: 600, fontSize: 44, color: "#fff",
        opacity: out3(span(t, t0 + 0.5, t0 + 1.3)) * (1 - fadeOut),
        transform: `translateY(${(1 - out3(span(t, t0 + 0.5, t0 + 1.3))) * 16}px)`,
        display: "flex", alignItems: "center", gap: 18,
      }}>
        {s.label}
        {s.tag && (
          <span style={{
            fontFamily: T.font, fontSize: 22, fontWeight: 600, padding: "6px 16px", borderRadius: 999,
            background: "rgba(123,47,214,.28)", color: "#D9C2FA", border: "1px solid rgba(185,150,240,.4)",
          }}>{s.tag}</span>
        )}
      </div>
    </div>
  );
}

/* ── 3 · the screen assembles, 4 · the reveal ────────────────── */
/* The empty app — page, sidebar, header — arrives as ONE object out of
   the depth. Only then does the content settle into it, the way the
   real app fills in: on its own grey page, never floating on black. */
const FRAME = { w: 1600, h: 1000, x: 160, y: 40 };       // the home screen at half its 3200×2000
const SHELL = [
  [2739, 0, 461, 2000],                                   // sidebar
  [0, 0, 2739, 160],                                      // header
];
const CONTENT = [                                         // [x, y, w, h] in the capture, and when it lands
  { r: [2250, 200, 450, 150], at: 1.5 },                  // greeting   (seconds into the build)
  { r: [2042, 379, 632, 231], at: 1.95 },                 // the four counters, right to left
  { r: [1387, 379, 632, 231], at: 2.2 },
  { r: [731, 379, 632, 231], at: 2.45 },
  { r: [75, 379, 634, 231], at: 2.7 },
  { r: [762, 661, 1912, 885], at: 3.2 },                  // tasks
  { r: [75, 661, 635, 885], at: 3.65 },                   // meetings
  { r: [1402, 1597, 1272, 403], at: 4.1 },                // committees
  { r: [64, 1596, 1282, 404], at: 4.4 },                  // recently opened documents
];
const LAND = 1.1;

function Assembly({ t }) {
  const k = FRAME.w / NAT[0];
  const arrive = out3(span(t, CUE.build, CUE.build + 1.9));
  const cam = inOut(span(t, CUE.build, CUE.hit));
  const rv = out3(span(t, CUE.hit, CUE.hit + 2.6));
  const flash = t >= CUE.hit ? 1 - span(t, CUE.hit, CUE.hit + 0.7) : 0;

  return (
    <div style={{ position: "absolute", inset: 0, perspective: 2400, perspectiveOrigin: "50% 26%" }}>
      {/* the light under the screen, once it is revealed */}
      <div style={{
        position: "absolute", left: "50%", top: 740, width: 1500, height: 520,
        transform: "translate(-50%,-50%)", borderRadius: "50%",
        background: `radial-gradient(closest-side, ${T.orange}55, ${T.orange}00)`,
        filter: "blur(40px)", opacity: rv * 0.9,
      }} />
      <div style={{
        position: "absolute", left: FRAME.x, top: FRAME.y, width: FRAME.w, height: FRAME.h,
        transformOrigin: "50% 50%", borderRadius: 14, overflow: "hidden",
        opacity: Math.min(1, arrive * 1.8),
        boxShadow: "0 60px 160px rgba(0,0,0,.55)",
        transform: `translateY(${rv * 330}px) translateZ(${mix(-1500, 0, arrive)}px)
                    scale(${mix(1.06, 1, cam) * mix(1, 0.8, rv)})
                    rotateX(${mix(24, 0, arrive) + rv * 27}deg)`,
      }}>
        <div style={{ position: "absolute", inset: 0, background: "#F7F7F7" }} />
        {SHELL.map((r, i) => (
          <Crop key={i} src={SRC.home} r={r} w={r[2] * k}
            style={{ position: "absolute", left: r[0] * k, top: r[1] * k }} />
        ))}
        {CONTENT.map((c, i) => {
          const p = out3(span(t, CUE.build + c.at, CUE.build + c.at + LAND));
          if (p <= 0) return null;
          const q = 1 - p;
          return (
            <div key={i} style={{
              position: "absolute", left: c.r[0] * k, top: c.r[1] * k,
              opacity: Math.min(1, p * 1.4),
              transform: `translateY(${q * 26}px) scale(${1 + q * 0.035})`,
              transformOrigin: "50% 0",
            }}>
              <Crop src={SRC.home} r={c.r} w={c.r[2] * k} style={{
                boxShadow: q > 0.02 ? `0 ${16 * q}px ${36 * q}px rgba(23,33,52,${0.16 * q})` : "none",
              }} />
            </div>
          );
        })}
      </div>
      {/* the bottom of the tilted screen falls away into the dark */}
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0, height: 420,
        background: `linear-gradient(to bottom, ${FILM_BG}00, ${FILM_BG} 88%)`, opacity: rv,
      }} />
      <div style={{ position: "absolute", inset: 0, background: "#fff", opacity: flash * 0.22 }} />
    </div>
  );
}

/* The lockup. "2.0" is drawn in the logo's OWN coordinate space
   (325×164, measured from bd-logo-full-white.svg): the wordmark sits on
   y = 130.3 and stands 45.3 tall, so "2.0" takes that baseline and that
   height. Two SVG layers on one viewBox can animate separately without
   ever drifting out of alignment. */
const LOGO = { w: 325, h: 164, base: 130.3, cap: 45.3 };
const VER = { x: LOGO.w + 17, fs: LOGO.cap / 0.7275, w: 100 };   // Inter's figures stand at its cap height
const LOCK_W = VER.x + VER.w;
const LOCK_PX = 560 / LOGO.w;                                    // logo drawn 560px wide

export function Mark({ t }) {
  const p = out3(span(t, CUE.title, CUE.title + 1.4));
  const v = out3(span(t, CUE.title + 0.45, CUE.title + 1.8));
  if (p <= 0) return null;
  const layer = (q) => ({
    position: "absolute", inset: 0, overflow: "visible",
    opacity: q, transform: `translateY(${(1 - q) * 22}px)`, filter: `blur(${(1 - q) * 8}px)`,
  });
  return (
    <div style={{
      position: "absolute", top: 84, left: "50%", transform: "translateX(-50%)",
      width: LOCK_W * LOCK_PX, height: LOGO.h * LOCK_PX,
    }}>
      <svg viewBox={`0 0 ${LOCK_W} ${LOGO.h}`} style={layer(p)}>
        <image href={A("bd-logo-full-white.svg")} width={LOGO.w} height={LOGO.h} />
      </svg>
      <svg viewBox={`0 0 ${LOCK_W} ${LOGO.h}`} style={layer(v)}>
        {/* ltr: the page is RTL, which would anchor the text by its right edge */}
        <text x={VER.x} y={LOGO.base} direction="ltr" textAnchor="start" fill={T.orange} fontFamily={T.fontEn} fontWeight="700"
          fontSize={VER.fs} letterSpacing={-VER.fs * 0.02}>2.0</text>
      </svg>
    </div>
  );
}

/* the ground: near-black with two slow lights */
const Ground = ({ t }) => (
  <div style={{ position: "absolute", inset: 0, background: FILM_BG, overflow: "hidden" }}>
    <div style={{
      position: "absolute", width: 1400, height: 1400, borderRadius: "50%",
      left: mix(-500, -300, span(t, 0, CUE.end)), top: 300,
      background: `radial-gradient(closest-side, ${T.orange}22, ${T.orange}00)`,
      opacity: 0.3 + 0.7 * span(t, 8, 14),
    }} />
    <div style={{
      position: "absolute", width: 1600, height: 1600, borderRadius: "50%",
      right: mix(-700, -500, span(t, 0, CUE.end)), top: -800,
      background: "radial-gradient(closest-side, #5877E622, #5877E600)",
      opacity: 0.25 + 0.75 * span(t, 8, 14),
    }} />
  </div>
);

export function FilmFrame({ t }) {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <Ground t={t} />
      {t < CUE.wordsOut + 0.3 && <Words t={t} />}
      {t < CUE.build + 1 && SHOTS.map((s, i) => <Shot key={s.src} s={s} t0={CUE.shots[i]} t={t} />)}
      <Claim t={t} />
      {t >= CUE.build && <Assembly t={t} />}
      <Mark t={t} />
    </div>
  );
}

/* ── the player ──────────────────────────────────────────────── */
let now = 0;                       // the presenter shell asks this whether the film is still running
export const filmTime = () => now;

/* the shell's keys reach the player through this */
export const filmControl = { toggle() {}, restart() {}, skip() {} };

export function Film({ playing }) {
  const [t, setT] = useState(0);
  const [run, setRun] = useState(0);            // bumping it starts the film again from 0
  const [paused, setPaused] = useState(false);
  const [done, setDone] = useState(false);      // skipped to the end
  const [bar, setBar] = useState(false);
  const raf = useRef(0), hide = useRef(0);
  const wall = useRef({ start: 0, held: 0, at: 0 });   // the clock when there is no audio device

  /* decode every capture during the black hold, so nothing pops in late */
  useEffect(() => {
    Object.values(SRC).forEach((s) => { const i = new Image(); i.src = s; i.decode?.().catch(() => {}); });
  }, []);

  /* review hook: freeze the film on any frame */
  useEffect(() => {
    window.__filmSeek = (s) => { cancelAnimationFrame(raf.current); stopScore(0.05); now = s; setT(s); };
    return () => { delete window.__filmSeek; };
  }, []);

  useEffect(() => {
    setPaused(false); setDone(false);
    if (!playing) { now = 0; setT(0); return; }
    if (window.__filmFrozen) return;
    const audio = playScore();
    wall.current = { start: performance.now(), held: 0, at: 0 };
    const tick = () => {
      const c = scoreClock();
      const w = wall.current;
      now = c ?? (performance.now() - w.start - w.held - (w.at ? performance.now() - w.at : 0)) / 1000;
      setT(now);
      if (now < CUE.end + 12) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    if (!audio) setT(0);
    return () => cancelAnimationFrame(raf.current);
    /* the score is NOT stopped on unmount — its tail rings on under the next slide */
  }, [playing, run]);

  const toggle = () => {
    if (!playing || done) return;
    const w = wall.current;
    if (paused) { resumeScore(); if (w.at) { w.held += performance.now() - w.at; w.at = 0; } }
    else { pauseScore(); w.at = performance.now(); }
    setPaused(!paused);
  };
  const restart = () => { if (playing) { setRun((r) => r + 1); } };
  const skip = () => {
    if (!playing) return;
    cancelAnimationFrame(raf.current);
    stopScore(1.2);
    now = CUE.end; setT(CUE.end); setDone(true); setPaused(false);
  };
  filmControl.toggle = toggle; filmControl.restart = restart; filmControl.skip = skip;

  /* the bar shows on mouse movement and hides again — it never sits over the film on its own */
  const wake = () => {
    setBar(true);
    clearTimeout(hide.current);
    hide.current = setTimeout(() => setBar(false), 2400);
  };
  useEffect(() => () => clearTimeout(hide.current), []);
  const showBar = playing && (bar || paused);

  return (
    <div onMouseMove={wake} style={{ position: "absolute", inset: 0, cursor: showBar ? "default" : playing ? "none" : "default" }}>
      <FilmFrame t={Math.max(0, t)} />
      {playing && <FilmBar paused={paused} done={done} visible={showBar}
        onToggle={toggle} onRestart={restart} onSkip={skip} onHover={wake} />}
    </div>
  );
}

function FilmBar({ paused, done, visible, onToggle, onRestart, onSkip, onHover }) {
  const btn = (label, Icon, on) => (
    <button title={label} onClick={(e) => { e.stopPropagation(); e.currentTarget.blur(); on(); }} style={{   // blur: keys must keep working after a click
      width: 30, height: 30, borderRadius: "50%", border: "none", cursor: "pointer", padding: 0,
      display: "grid", placeItems: "center", color: "rgba(255,255,255,.85)", background: "transparent",
    }}><Icon size={15} strokeWidth={1.75} fill={Icon === Play || Icon === Pause ? "currentColor" : "none"} /></button>
  );
  return (
    <div data-nonav onMouseMove={onHover} onClick={(e) => e.stopPropagation()} style={{
      position: "absolute", left: "50%", bottom: 22, transform: `translate(-50%, ${visible ? 0 : 8}px)`,
      opacity: visible ? 1 : 0, pointerEvents: visible ? "auto" : "none",
      transition: "opacity 300ms ease, transform 400ms cubic-bezier(.16,1,.3,1)",
      display: "flex", alignItems: "center", gap: 2, padding: "2px 6px", borderRadius: 999, direction: "ltr",
      background: "rgba(14,18,28,.5)", backdropFilter: "blur(12px)", zIndex: 40,
    }}>
      {btn("Start over", RotateCcw, onRestart)}
      {btn(paused || done ? "Play" : "Pause", paused || done ? Play : Pause, done ? onRestart : onToggle)}
      {btn("Skip to the end", SkipForward, onSkip)}
    </div>
  );
}

export function skipFilm() {
  filmControl.skip();
}
