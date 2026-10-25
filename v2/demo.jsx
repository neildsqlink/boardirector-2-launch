import { useState, useEffect, useRef, useCallback } from "react";
import { T } from "../tokens.js";
import { Screen } from "./Screen.jsx";

/* ══════════════════════════════════════════════════════════════════
   Demo — a simulated product that plays itself, and that you can
   take over mid-flight and drive by hand.

   It is a state machine, not a video. That matters on stage: a video
   runs on its own clock, but this waits, and if a client asks "what
   happens if you click there" you click there.

   A spec looks like:
     { start, init(data), states: { k: { hint, auto:[next,ms], render(data,go) } },
       script: [[state, dataPatch, holdMs], ...] }
   ══════════════════════════════════════════════════════════════════ */
export function useDemo(spec, { autostart = false } = {}) {
  const [st, setSt] = useState(spec.start);
  const [data, setData] = useState(() => ({ ...(spec.init?.() || {}) }));
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [take, setTake] = useState(0);   // each play is a new take, even if one is already running
  const hist = useRef([]);
  const stepTimer = useRef(null);
  const autoTimer = useRef(null);
  const run = useRef(0);          // invalidates timers from an abandoned branch
  const pi = useRef(0);

  const clearAll = () => { clearTimeout(stepTimer.current); clearTimeout(autoTimer.current); };

  /* move to a state; honour its own auto-advance */
  const go = useCallback((next, { silent = false } = {}) => {
    setSt((cur) => {
      if (!silent && cur) hist.current.push([cur, JSON.stringify(data)]);
      return next;
    });
    run.current += 1;
    clearTimeout(autoTimer.current);
    const s = spec.states[next];
    if (s?.auto) {
      const r = run.current;
      autoTimer.current = setTimeout(() => {
        if (run.current === r) go(s.auto[0], { silent: true });
      }, s.auto[1]);
    }
  }, [spec, data]);

  /* the scripted run */
  const play = useCallback(() => {
    clearAll();
    hist.current = [];
    pi.current = 0;
    setData({ ...(spec.init?.() || {}) });
    setEnded(false);
    setPlaying(true);
    setTake((n) => n + 1);
  }, [spec]);

  const stop = useCallback(() => { clearAll(); setPlaying(false); }, []);

  const restart = useCallback(() => {
    clearAll();
    hist.current = [];
    setData({ ...(spec.init?.() || {}) });
    setEnded(false);
    setPlaying(false);
    setSt(spec.start);
  }, [spec]);

  const back = useCallback(() => {
    const h = hist.current.pop();
    if (!h) return;
    stop();
    setData(JSON.parse(h[1]));
    go(h[0], { silent: true });
  }, [go, stop]);

  useEffect(() => {
    if (!playing) return;
    const tick = () => {
      if (pi.current >= spec.script.length) {
        setPlaying(false); setEnded(true); return;
      }
      const [state, patch, hold] = spec.script[pi.current++];
      if (patch && Object.keys(patch).length) setData((d) => ({ ...d, ...patch }));
      go(state, { silent: true });
      stepTimer.current = setTimeout(tick, hold);
    };
    tick();
    return clearAll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, take, spec]);

  useEffect(() => { if (autostart) play(); return clearAll; }, [autostart, play]);

  /* for frame-by-frame checks from the console, like the film's __filmSeek */
  useEffect(() => { window.__demo = { go, setData, stop }; });

  /* any click inside the surface hands control to the room */
  const takeOver = useCallback(() => { if (playing) stop(); }, [playing, stop]);

  return { st, data, setData, go, play, stop, restart, back, playing, ended, takeOver,
           state: spec.states[st] || {} };
}

/* ── the frame around a demo ─────────────────────────────────────
   No fake window chrome: the replica IS the app, 1:1, so it sits on
   the slide the way the live product sits on a screen. */
export function DemoFrame({ demo, w = 1440, dark = false }) {
  const { state, data, playing, ended, play, restart, back, takeOver } = demo;
  const view = state.view ? state.view(data) : { html: "" };
  /* data-nonav: a click in here drives the demo, it does not change slide */
  return (
    <div data-nonav style={{ width: w }}>
      <div onClick={takeOver} style={{
        position: "relative", borderRadius: 14, overflow: "hidden",
        boxShadow: dark
          ? "0 50px 130px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.06)"
          : "0 34px 90px rgba(23,33,52,.22), 0 6px 18px rgba(23,33,52,.08)",
      }}>
        <Screen html={view.html} cursor={view.cursor} width={w} />
      </div>

      <div style={{
        marginTop: 18, display: "flex", alignItems: "center", gap: 14,
        padding: dark ? "10px 6px" : "16px 22px", borderRadius: 12,
        background: dark ? "transparent" : T.white,
        border: dark ? "none" : `1px solid ${T.grey200}`, boxShadow: dark ? "none" : T.shadowSoft,
      }}>
        <span style={{ flex: 1, fontFamily: T.font, fontSize: 25, color: dark ? "rgba(255,255,255,.88)" : T.ink, textAlign: "right" }}
          dangerouslySetInnerHTML={{ __html: state.hint || "" }} />
        <span style={{
          display: "flex", alignItems: "center", gap: 7, padding: "6px 14px", borderRadius: 999,
          background: playing ? `${T.orange}${dark ? "26" : "18"}` : dark ? "rgba(255,255,255,.08)" : T.grey100,
          color: playing ? T.orange : dark ? "rgba(255,255,255,.6)" : T.grey650,
          fontFamily: T.font, fontSize: 16, fontWeight: 500, whiteSpace: "nowrap",
        }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: playing ? T.orange : T.grey500 }} />
          {playing ? "הדגמה פועלת" : ended ? "סוף ההדגמה" : "ידני"}
        </span>
        <Btn dark={dark} onClick={back}>חזור</Btn>
        <Btn dark={dark} onClick={restart}>התחל מחדש</Btn>
        <Btn dark={dark} primary onClick={play}>{ended ? "הפעל שוב" : playing ? "מתנגן…" : "הפעל"}</Btn>
      </div>
    </div>
  );
}

function Btn({ children, onClick, primary, dark }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); onClick(); }} style={{
      border: primary ? "none" : `1px solid ${dark ? "rgba(255,255,255,.14)" : T.grey200}`,
      background: primary ? T.orange : dark ? "rgba(255,255,255,.04)" : T.white,
      color: primary ? T.white : dark ? "rgba(255,255,255,.75)" : T.grey650,
      borderRadius: 9, padding: "10px 20px", cursor: "pointer",
      fontFamily: T.font, fontSize: 19, fontWeight: 500,
    }}>{children}</button>
  );
}
