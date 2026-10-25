import { useEffect, useRef, useState } from "react";
import REPLICA_CSS from "./replica.css?raw";

/* The replica is a fixed 1440×900 desktop, exactly as the live app is
   designed. It renders inside a shadow root because its stylesheet also
   styles body/button/h1 — loaded globally it would restyle the deck. */
const FA = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css";
export const SCR_W = 1440, SCR_H = 900;

/* extra motion the static replica doesn't need but a demo does */
const DEMO_CSS = `
.scr .lr.in   { animation: rowIn 620ms cubic-bezier(.16,1,.3,1) both }
.scr .lr.lit  { background:#FFF8F2; box-shadow: inset 3px 0 0 #FE7501 }
.scr .lr.drag { transform: translateY(-58px) scale(1.012); z-index:5;
                box-shadow: 0 18px 40px rgba(23,33,52,.18); border-radius:10px }
.scr .lr.push { transform: translateY(56px) }
.scr .lr      { transition: transform 520ms cubic-bezier(.16,1,.3,1), background 420ms, box-shadow 420ms }
.scr .wp-it.out { opacity:.32; transform: translateX(-12px) }
.scr .wp-it   { transition: opacity 420ms, transform 520ms cubic-bezier(.16,1,.3,1) }
.scr .over    { animation: rowIn 520ms cubic-bezier(.16,1,.3,1) both }
/* The replica isolates these as LTR because it was written in English. The
   live Hebrew app renders them RTL — "09:10 - 09:00 (10 דק)", "8 נושאים, 0 הפסקות". */
.scr[dir=rtl] .lr .sb, .scr[dir=rtl] .ph small { direction: rtl; unicode-bidi: normal }
/* a toast that lands, and a spinner that keeps turning */
.scr .toast { animation: rowIn 520ms cubic-bezier(.16,1,.3,1) both }
@keyframes spin { to { transform: rotate(360deg) } }
@keyframes rowIn { from { opacity:0; transform: translateY(-10px) } to { opacity:1; transform:none } }
`;

export function Screen({ html, width, cursor }) {
  const host = useRef(null);
  const shadow = useRef(null);
  const [at, setAt] = useState(null);
  const k = width / SCR_W;

  useEffect(() => {
    if (!shadow.current) {
      shadow.current = host.current.attachShadow({ mode: "open" });
      shadow.current.innerHTML =
        `<link rel="stylesheet" href="${FA}">` +
        `<style>${REPLICA_CSS}${DEMO_CSS}</style>` +
        `<div class="scr" dir="rtl"></div>`;
    }
    const scr = shadow.current.querySelector(".scr");
    scr.innerHTML = html;

    /* A cursor given as a selector lands on that element's centre, measured
       after layout — so it stays on target however the replica reflows. */
    if (typeof cursor === "string") {
      const place = () => {
        const el = scr.querySelector(cursor);
        if (!el) return;
        const r = el.getBoundingClientRect(), b = scr.getBoundingClientRect();
        const sx = SCR_W / b.width;
        setAt([(r.left + r.width / 2 - b.left) * sx, (r.top + r.height / 2 - b.top) * sx]);
      };
      requestAnimationFrame(() => requestAnimationFrame(place));
    } else {
      setAt(cursor || null);
    }
  }, [html, cursor]);

  return (
    <div style={{ width, height: SCR_H * k, position: "relative", overflow: "hidden" }}>
      <div ref={host} style={{
        width: SCR_W, height: SCR_H, position: "absolute", top: 0, left: 0,
        transform: `scale(${k})`, transformOrigin: "0 0",
      }} />
      {at && (
        <div style={{
          position: "absolute", left: at[0] * k, top: at[1] * k, zIndex: 30,
          transition: "left 760ms cubic-bezier(.16,1,.3,1), top 760ms cubic-bezier(.16,1,.3,1)",
          pointerEvents: "none",
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24"
            style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,.35))" }}>
            <path d="M5 2l14 10-6.5 1.2L15 20l-2.6 1-2.7-6.6L5 18z"
              fill="#fff" stroke="#172134" strokeWidth="1.3" />
          </svg>
        </div>
      )}
    </div>
  );
}
