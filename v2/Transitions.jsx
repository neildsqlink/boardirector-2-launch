import { useEffect, useRef, useState } from "react";
import { clamp, span, out3, inOut, mix } from "./ease.js";

/* ══════════════════════════════════════════════════════════════════
   The old → 2.0 transition on the chapter slides, in a few styles.
   Same contract as ParticleMorph: it holds both screens in a W×H box,
   plays when `stage` goes 0 → 1 (and back, reversed), and calls
   onSettled(stage) once it rests.

   Every style is a pure function of one progress value p (0 = old,
   1 = 2.0), so a frame can be drawn on its own — `progress` overrides
   the clock for recording.
   ══════════════════════════════════════════════════════════════════ */

export const TRANSITIONS = {
  slider: "קו לפני/אחרי שעובר על המסך, עוצר באמצע להשוואה וממשיך",
  zoom: "הישן מתקרב ונמס, החדש עולה מהעומק ומתחדד",
  flip: "המסך מסתובב בתלת־ממד ונוחת על 2.0 בצד השני",
  slats: "המסך מתפרק לרצועות שמתהפכות בגל",
  scan: "פס אור עובר על המסך — ומאחוריו כבר 2.0",
  tiles: "אריחים מתחלפים בגל אלכסוני",
};

const ORANGE = "254,117,1";

export function OldNewTransition({ kind = "slider", frames, stage = 0, W, H, dur = 1600, onSettled, progress }) {
  const [p, setP] = useState(stage ? 1 : 0);
  const pRef = useRef(p);
  const settle = useRef(onSettled); settle.current = onSettled;

  useEffect(() => {
    if (progress != null) return;
    const target = stage ? 1 : 0, from = pRef.current;
    if (from === target) { settle.current?.(target); return; }
    const d = dur * Math.abs(target - from), t0 = performance.now();
    let raf;
    const tick = (now) => {
      const k = clamp((now - t0) / d), v = mix(from, target, k);
      pRef.current = v; setP(v);
      if (k < 1) raf = requestAnimationFrame(tick); else settle.current?.(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stage, dur, progress]);

  const v = progress != null ? clamp(progress) : p;
  const [oldSrc, newSrc] = frames;
  const Draw = KINDS[kind] || KINDS.slider;
  return (
    <div style={{ position: "absolute", inset: 0, width: W, height: H, overflow: "hidden", background: "#0B0F18" }}>
      <Draw p={v} oldSrc={oldSrc} newSrc={newSrc} W={W} H={H} />
    </div>
  );
}

const full = { position: "absolute", left: 0, top: 0, width: "100%", height: "100%", display: "block" };
const Img = ({ src, style }) => <img src={src} alt="" draggable={false} style={{ ...full, ...style }} />;
/* a piece of a screen, cut out with a background so it can move on its own */
const crop = (src, W, H, x, y) => ({
  backgroundImage: `url(${src})`, backgroundSize: `${W}px ${H}px`, backgroundPosition: `${-x}px ${-y}px`, backgroundRepeat: "no-repeat",
});

/* ── 1 · slider: a before/after line; it stops halfway so the room can compare ── */
function Slider({ p, oldSrc, newSrc, W, H }) {
  // right → left, with a breath in the middle
  const e = p < 0.42 ? 0.5 * out3(span(p, 0, 0.42)) : p < 0.62 ? 0.5 : 0.5 + 0.5 * inOut(span(p, 0.62, 1));
  const x = W * (1 - e);                                   // the line's position; 2.0 is to its right
  const show = clamp(Math.min(p / 0.05, (1 - p) / 0.06));   // the line fades in and out at the ends
  return (
    <>
      <Img src={oldSrc} />
      <Img src={newSrc} style={{ clipPath: `inset(0 0 0 ${x}px)` }} />
      <div style={{ position: "absolute", top: 0, bottom: 0, left: x - 1, width: 2, opacity: show,
        background: "rgba(255,255,255,.95)", boxShadow: `0 0 18px 2px rgba(${ORANGE},.55), 0 0 2px rgba(255,255,255,.9)` }} />
      <div style={{ position: "absolute", top: H / 2 - 22, left: x - 22, width: 44, height: 44, borderRadius: "50%", opacity: show,
        background: "rgba(255,255,255,.96)", boxShadow: `0 6px 24px rgba(0,0,0,.35), 0 0 0 4px rgba(${ORANGE},.25)`,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
        {["M7 2 L2 7 L7 12", "M2 2 L7 7 L2 12"].map((d) => (
          <svg key={d} width="9" height="14" viewBox="0 0 9 14"><path d={d} fill="none" stroke="#172134" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        ))}
      </div>
    </>
  );
}

/* ── 2 · zoom: the old screen drifts past the camera, 2.0 rises from depth ── */
function Zoom({ p, oldSrc, newSrc }) {
  const a = span(p, 0, 0.55), b = out3(span(p, 0.18, 0.95));
  return (
    <>
      <Img src={newSrc} style={{ transform: `scale(${mix(0.93, 1, b)})`, filter: `blur(${6 * (1 - b)}px)`, opacity: clamp(b * 1.3), transformOrigin: "50% 50%" }} />
      <Img src={oldSrc} style={{ transform: `scale(${1 + 0.12 * inOut(a)})`, filter: `blur(${7 * inOut(a)}px)`, opacity: 1 - inOut(a), transformOrigin: "50% 50%" }} />
    </>
  );
}

/* ── 3 · flip: the card turns in 3D and lands on 2.0 on its back ── */
function Flip({ p, oldSrc, newSrc }) {
  const e = inOut(p), deg = 180 * e, dip = 1 - 0.1 * Math.sin(Math.PI * e);
  const face = { ...full, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" };
  return (
    <div style={{ ...full, perspective: 2600 }}>
      <div style={{ ...full, transformStyle: "preserve-3d", transform: `scale(${dip}) rotateY(${-deg}deg)` }}>
        <img src={oldSrc} alt="" style={face} />
        <img src={newSrc} alt="" style={{ ...face, transform: "rotateY(180deg)" }} />
        {/* a passing sheen as it turns */}
        <div style={{ ...face, background: `linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,${0.18 * Math.sin(Math.PI * e)}), rgba(255,255,255,0))` }} />
      </div>
    </div>
  );
}

/* ── 4 · slats: vertical strips flip over in a wave, right to left ── */
function Slats({ p, oldSrc, newSrc, W, H }) {
  const N = 10, sw = W / N;
  return (
    <>
      {Array.from({ length: N }, (_, i) => {
        const fromRight = N - 1 - i, start = (fromRight / (N - 1)) * 0.5;
        const e = inOut(span(p, start, start + 0.5)), x = Math.round(i * sw), w = Math.round((i + 1) * sw) - x;
        const face = { position: "absolute", inset: 0, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" };
        return (
          <div key={i} style={{ position: "absolute", left: x, top: 0, width: w + 0.5, height: H, perspective: 1400 }}>
            <div style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d", transform: `rotateY(${-180 * e}deg) scale(${1 - 0.06 * Math.sin(Math.PI * e)})` }}>
              <div style={{ ...face, ...crop(oldSrc, W, H, x, 0) }} />
              <div style={{ ...face, ...crop(newSrc, W, H, x, 0), transform: "rotateY(180deg)" }} />
              <div style={{ ...face, background: `rgba(0,0,0,${0.35 * Math.sin(Math.PI * e)})` }} />
            </div>
          </div>
        );
      })}
    </>
  );
}

/* ── 5 · scan: a band of light crosses the screen; behind it, it is already 2.0 ── */
function Scan({ p, oldSrc, newSrc, W }) {
  const e = inOut(p), edge = mix(W + 40, -40, e);                         // right → left
  const glow = clamp(Math.min(p / 0.06, (1 - p) / 0.08));
  return (
    <>
      <Img src={oldSrc} />
      <Img src={newSrc} style={{ clipPath: `inset(0 0 0 ${clamp(edge, 0, W)}px)` }} />
      {/* ahead of the line: the old screen warms in its light */}
      <div style={{ position: "absolute", top: 0, bottom: 0, left: edge - 220, width: 220, opacity: glow, pointerEvents: "none",
        background: `linear-gradient(90deg, rgba(${ORANGE},0), rgba(${ORANGE},.22))` }} />
      {/* behind it: 2.0, still catching the light */}
      <div style={{ position: "absolute", top: 0, bottom: 0, left: edge, width: 280, opacity: glow, pointerEvents: "none",
        background: "linear-gradient(90deg, rgba(255,255,255,.55), rgba(255,255,255,0))" }} />
      {/* the line itself */}
      <div style={{ position: "absolute", top: 0, bottom: 0, left: edge - 1.5, width: 3, opacity: glow, background: "#fff",
        boxShadow: `0 0 14px 3px rgba(${ORANGE},.85), 0 0 46px 14px rgba(${ORANGE},.35)` }} />
    </>
  );
}

/* ── 6 · tiles: a diagonal wave of tiles, top-right to bottom-left ── */
function Tiles({ p, oldSrc, newSrc, W, H }) {
  const C = 8, R = 5, tw = W / C, th = H / R, span0 = 0.42;
  const tiles = [];
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    const d = ((C - 1 - c) + r) / (C - 1 + R - 1), start = d * (1 - span0);
    const e = out3(span(p, start, start + span0)), x = Math.round(c * tw), y = Math.round(r * th);
    const w = Math.round((c + 1) * tw) - x, h = Math.round((r + 1) * th) - y;
    if (e <= 0) continue;
    const done = e >= 1;
    tiles.push(
      <div key={`${r}-${c}`} style={{ position: "absolute", left: x, top: y, width: w + (done ? 0.5 : 0), height: h + (done ? 0.5 : 0), ...crop(newSrc, W, H, x, y),
        opacity: clamp(e * 1.6), transform: `scale(${mix(0.82, 1, e)})`, borderRadius: done ? 0 : 8 * (1 - e),
        boxShadow: done ? "none" : `0 8px 24px rgba(0,0,0,${0.35 * (1 - e)})` }} />,
    );
  }
  return (
    <>
      <Img src={oldSrc} style={{ filter: `brightness(${1 - 0.35 * clamp(p * 1.5)})` }} />
      {tiles}
    </>
  );
}

const KINDS = { slider: Slider, zoom: Zoom, flip: Flip, slats: Slats, scan: Scan, tiles: Tiles };
