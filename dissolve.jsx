import { useEffect, useRef, useState } from "react";
import { T } from "./tokens.js";

/* The brand frame is drawn twice — once into the particle field, once as crisp
   DOM once it settles. Both must use THESE numbers, or the mark jumps at the
   hand-off. Fractions of the frame, so they hold at any resolution. */
export const BRAND = {
  logoW: 0.30,     // logo width, fraction of frame width
  logoCY: 0.40,    // logo centre, fraction of frame height
  verCY: 0.615,    // "2.0" centre, fraction of frame height
  verSize: 0.15,   // "2.0" cap size, fraction of frame height
  /* Canvas textBaseline:"middle" centres the EM BOX, but digit ink sits above
     that centre, so canvas text lands ~0.011 of frame height higher than the
     same type centred in a DOM line box. Measured, not guessed: canvas ink
     centre came out at 0.6038 against the DOM's 0.6150. This pushes the canvas
     draw down so both agree and the mark does not jump at the hand-off. */
  verInkFix: 0.0112,
};

/* ══════════════════════════════════════════════════════════════════
   ParticleMorph — one cloud of dust, several destinations.

   The same ~250,000 particles are sampled from every frame in the
   sequence. Each keeps its grid cell: on a beat it boils outward,
   swaps colour at the top of its arc while it is scattered and
   unreadable, and settles back — so the screen becomes the logo,
   and the logo becomes the new product.

   Each hop is its own beat, so the presenter decides how long the
   logo holds rather than a timer deciding for them.

   >250k particles means ARGB words written into an ImageData buffer
   and blitted once; fillRect per particle caps out around 30k.
   ══════════════════════════════════════════════════════════════════ */
export function ParticleMorph({
  frames,             // entries: image src | null (draw the brand) | "void" (nothing)
  stage = 0,          // which frame we should be resting on
  W, H, nat = [3200, 2000],
  logoSrc, brandText = "2.0",
  render = 0.7,
  grain = 2,
  dur = 1700,         // one hop
  scatter = 34,
  swirl = 0.38,
  stagger = 560,
  converge = 3.2,     // how far out particles start when arriving from "void"
  onSettled,          // (index) => void — fires when a hop finishes, so the
                      // caller can swap the soft canvas for the crisp original
}) {
  const canvasRef = useRef(null);
  const parts = useRef(null);
  const raf = useRef(0);
  const at = useRef(0);               // the frame we are resting on
  const [built, setBuilt] = useState(false);
  const [moving, setMoving] = useState(false);

  const cw = Math.round(W * render), ch = Math.round(H * render);

  useEffect(() => {
    let dead = false;
    const load = (src) => new Promise((res, rej) => {
      const i = new Image(); i.crossOrigin = "anonymous";
      i.onload = () => res(i); i.onerror = rej; i.src = src;
    });

    (async () => {
      const [nw, nh] = nat;
      const k = Math.max(cw / nw, ch / nh);
      const dw = nw * k, dh = nh * k, ox = (cw - dw) / 2;

      const sample = (paint) => {
        const c = document.createElement("canvas");
        c.width = cw; c.height = ch;
        const x = c.getContext("2d", { willReadFrequently: true });
        paint(x);
        return new Uint32Array(x.getImageData(0, 0, cw, ch).data.buffer);
      };

      const logoImg = logoSrc ? await load(logoSrc).catch(() => null) : null;
      try { await document.fonts.ready; } catch {}

      const maps = [];
      for (const f of frames) {
        if (f === "void") {
          maps.push(sample(() => {}));          // nothing at all — dust arrives from here
        } else if (f) {
          const img = await load(f);
          maps.push(sample((x) => x.drawImage(img, ox, 0, dw, dh)));
        } else {
          /* the brand frame, drawn rather than captured */
          maps.push(sample((x) => {
            x.fillStyle = T.inkDeep; x.fillRect(0, 0, cw, ch);
            const lw = cw * BRAND.logoW;
            if (logoImg) {
              const lh = lw * (logoImg.height / logoImg.width || 0.18);
              x.drawImage(logoImg, (cw - lw) / 2, ch * BRAND.logoCY - lh / 2, lw, lh);
            }
            x.fillStyle = T.orange;
            x.textAlign = "center"; x.textBaseline = "middle";
            x.font = `700 ${Math.round(ch * BRAND.verSize)}px Inter, system-ui, sans-serif`;
            x.fillText(brandText, cw / 2, ch * (BRAND.verCY + BRAND.verInkFix));
          }));
        }
      }
      if (dead) return;

      const cols = Math.ceil(cw / grain), rows = Math.ceil(ch / grain);
      const n = cols * rows;
      const x = new Float32Array(n), y = new Float32Array(n);
      const dx = new Float32Array(n), dy = new Float32Array(n);
      const delay = new Float32Array(n);
      const cols32 = maps.map((m) => {
        const out = new Uint32Array(n);
        let i = 0;
        for (let gy = 0; gy < rows; gy++)
          for (let gx = 0; gx < cols; gx++, i++) {
            const sx = Math.min(cw - 1, Math.round(gx * grain + grain / 2));
            const sy = Math.min(ch - 1, Math.round(gy * grain + grain / 2));
            out[i] = m[sy * cw + sx] & 0x00ffffff;
          }
        return out;
      });

      const mx = cw / 2, my = ch / 2;
      let i = 0;
      for (let gy = 0; gy < rows; gy++) {
        for (let gx = 0; gx < cols; gx++, i++) {
          const px = gx * grain, py = gy * grain;
          x[i] = px; y[i] = py;
          const ang = Math.random() * Math.PI * 2;
          const mag = (0.35 + Math.random() * 0.95) * scatter * render;
          const rx = px - mx, ry = py - my, len = Math.hypot(rx, ry) || 1;
          const bias = 0.28;
          dx[i] = (Math.cos(ang) + (rx / len) * bias - (ry / len) * swirl * bias) * mag;
          dy[i] = (Math.sin(ang) + (ry / len) * bias + (rx / len) * swirl * bias) * mag;
          const wave = (px / cw) * 0.5 + (py / ch) * 0.5;
          delay[i] = wave * stagger * 0.65 + Math.random() * stagger * 0.35;
        }
      }
      parts.current = { n, x, y, dx, dy, delay, cols32 };
      setBuilt(true);
    })().catch(() => {});
    return () => { dead = true; };
  }, [frames, logoSrc, brandText, cw, ch, grain, nat, scatter, swirl, stagger, render]);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || !built || !parts.current) return;
    const ctx = cv.getContext("2d");
    const p = parts.current;
    const imgData = ctx.createImageData(cw, ch);
    const buf = new Uint32Array(imgData.data.buffer);
    const last = p.cols32.length - 1;
    const target = Math.max(0, Math.min(stage, last));
    const source = Math.max(0, Math.min(at.current, last));

    const put = (px, py, color, a) => {
      const av = (a << 24) >>> 0;
      const x0 = px | 0, y0 = py | 0;
      for (let ddy = 0; ddy < grain; ddy++) {
        const yy = y0 + ddy;
        if (yy < 0 || yy >= ch) continue;
        let o = yy * cw + x0;
        for (let ddx = 0; ddx < grain; ddx++, o++) {
          const xx = x0 + ddx;
          if (xx < 0 || xx >= cw) continue;
          buf[o] = (av | color) >>> 0;
        }
      }
    };
    const rest = (idx) => {
      buf.fill(0);
      const c = p.cols32[idx];
      for (let i = 0; i < p.n; i++) put(p.x[i], p.y[i], c[i], 255);
      ctx.putImageData(imgData, 0, 0);
    };

    if (target === source) { rest(target); at.current = target; setMoving(false); onSettled?.(target); return; }

    const A = p.cols32[source], B = p.cols32[target];
    /* Coming FROM nothing is not a boil — the dust has to fly in from far out and
       condense, otherwise the mark just appears where it already was. */
    const arriving = frames[source] === "void";
    setMoving(true);
    const t0 = performance.now(), total = dur + stagger, PI = Math.PI;
    const tick = (now) => {
      const t = now - t0;
      buf.fill(0);
      for (let i = 0; i < p.n; i++) {
        const local = t - p.delay[i];
        if (local <= 0) { if (!arriving) put(p.x[i], p.y[i], A[i], 255); continue; }
        const u = local / dur;
        if (u >= 1) { put(p.x[i], p.y[i], B[i], 255); continue; }

        if (arriving) {
          const e = 1 - Math.pow(1 - u, 3);      // ease out — fast in, settles gently
          const away = (1 - e) * converge;
          put(p.x[i] + p.dx[i] * away, p.y[i] + p.dy[i] * away, B[i], (255 * e) | 0);
          continue;
        }
        const bulge = Math.sin(PI * u);
        const ease = bulge * bulge * (3 - 2 * bulge);
        put(p.x[i] + p.dx[i] * ease, p.y[i] + p.dy[i] * ease,
            u < 0.5 ? A[i] : B[i], (255 * (1 - 0.06 * ease)) | 0);
      }
      ctx.putImageData(imgData, 0, 0);
      if (t < total) raf.current = requestAnimationFrame(tick);
      else { rest(target); at.current = target; setMoving(false); onSettled?.(target); }
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [stage, built, cw, ch, grain, dur, stagger, converge, frames, onSettled]);

  return (
    <canvas ref={canvasRef} width={cw} height={ch}
      style={{
        position: "absolute", inset: 0, width: "100%", height: "100%",
        filter: moving ? "blur(0.6px)" : "none",
        transition: "filter 160ms linear",
      }} />
  );
}
