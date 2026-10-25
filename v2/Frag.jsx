import { useEffect, useRef } from "react";
import REPLICA_CSS from "./replica.css?raw";

const FA = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css";

/* A piece of the replica at any size — the same shadow-root isolation as
   Screen, without the cursor or the fixed 1440×900 frame. w0/h0 are its
   natural size; it is scaled to width w.

   The stylesheet and icon font are set up once; after that only the
   content is rewritten, so a fragment can change every frame (the film's
   live close-ups) without reloading anything. */
export function Frag({ html, w0, h0, w, style }) {
  const host = useRef(null);
  const scr = useRef(null);
  const last = useRef(null);            // compare our own string, not the DOM's re-serialisation of it
  useEffect(() => {
    const root = host.current.shadowRoot || host.current.attachShadow({ mode: "open" });
    root.innerHTML =
      `<link rel="stylesheet" href="${FA}"><style>${REPLICA_CSS}
        .scr{position:relative!important;background:transparent!important}
        .scr[dir=rtl] .lr .sb,.scr[dir=rtl] .ph small{direction:rtl;unicode-bidi:normal}</style>` +
      `<div class="scr" dir="rtl" style="width:${w0}px;height:${h0}px;font-family:Rubik,system-ui,sans-serif"></div>`;
    scr.current = root.querySelector(".scr");
    last.current = null;
  }, [w0, h0]);
  useEffect(() => {
    if (scr.current && last.current !== html) { scr.current.innerHTML = html; last.current = html; }
  }, [html, w0, h0]);
  const k = w / w0;
  return (
    <div style={{ width: w, height: h0 * k, overflow: "hidden", position: "relative", ...style }}>
      {/* pinned left: in the RTL page an over-wide block would hang off the right edge */}
      <div ref={host} style={{
        position: "absolute", left: 0, top: 0, width: w0, height: h0,
        transform: `scale(${k})`, transformOrigin: "0 0",
      }} />
    </div>
  );
}
