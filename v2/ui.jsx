import { T } from "../tokens.js";

/* A small kit of bd-client-looking parts, so a demo can be assembled
   from real-feeling UI instead of screenshots. Everything is plain
   divs — it animates, it is sharp at any size, and it never goes
   stale when the product changes. */

export const Sidebar = ({ active }) => (
  <div style={{
    position: "absolute", top: 0, right: 0, bottom: 0, width: 196,
    background: T.ink, padding: "22px 0", display: "flex", flexDirection: "column", gap: 2,
  }}>
    <div style={{ padding: "0 20px 22px", display: "flex", alignItems: "center", gap: 9, direction: "ltr" }}>
      <span style={{ width: 24, height: 24, borderRadius: 6, background: T.orange }} />
      <span style={{ fontFamily: T.fontEn, fontSize: 17, color: T.white, fontWeight: 500 }}>Boardirector</span>
    </div>
    {["דף הבית", "ועדות", "ישיבות", "תוכנית עבודה", "משימות", "מעקב החלטות"].map((t) => (
      <div key={t} style={{
        padding: "11px 20px", fontFamily: T.font, fontSize: 16,
        color: t === active ? T.white : "rgba(255,255,255,0.55)",
        background: t === active ? "rgba(255,255,255,0.08)" : "transparent",
        borderRight: t === active ? `3px solid ${T.orange}` : "3px solid transparent",
      }}>{t}</div>
    ))}
  </div>
);

export const Page = ({ title, children, sub }) => (
  <div style={{ position: "absolute", inset: 0, marginRight: 196, background: T.paper }}>
    <div style={{
      height: 64, background: T.white, borderBottom: `1px solid ${T.grey200}`,
      display: "flex", alignItems: "center", padding: "0 26px",
    }}>
      <span style={{ fontFamily: T.font, fontWeight: 600, fontSize: 21, color: T.ink }}>{title}</span>
      {sub && <span style={{ marginInlineStart: 12, fontFamily: T.font, fontSize: 16, color: T.grey600 }}>{sub}</span>}
    </div>
    <div style={{ padding: 24, height: "calc(100% - 64px)", overflow: "hidden" }}>{children}</div>
  </div>
);

export const Card = ({ children, style, lit, onClick }) => (
  <div onClick={onClick} style={{
    background: T.white, borderRadius: 11,
    border: `1px solid ${lit ? T.orange : T.grey200}`,
    boxShadow: lit ? `0 0 0 3px ${T.orange}22, 0 8px 22px rgba(254,117,1,.12)` : T.shadowSoft,
    transition: `border-color 320ms ${T.ease}, box-shadow 320ms ${T.ease}, transform 420ms ${T.ease}, opacity 320ms ${T.ease}`,
    cursor: onClick ? "pointer" : "default",
    ...style,
  }}>{children}</div>
);

export const Btn = ({ children, primary, lit, onClick, style }) => (
  <span onClick={onClick} style={{
    display: "inline-flex", alignItems: "center", gap: 7,
    padding: "9px 17px", borderRadius: 8,
    background: primary ? T.orange : T.white,
    color: primary ? T.white : T.ink,
    border: primary ? "none" : `1px solid ${T.grey200}`,
    fontFamily: T.font, fontSize: 16, fontWeight: 500,
    cursor: onClick ? "pointer" : "default",
    boxShadow: lit ? `0 0 0 4px ${T.orange}33` : "none",
    transition: `box-shadow 300ms ${T.ease}`,
    ...style,
  }}>{children}</span>
);

export const Tag = ({ children, c = T.blue }) => (
  <span style={{
    padding: "3px 10px", borderRadius: 999, background: `${c}16`, color: c,
    fontFamily: T.font, fontSize: 14, fontWeight: 500, whiteSpace: "nowrap",
  }}>{children}</span>
);

/* A pointer that glides to wherever the current state puts it — the
   thing that makes an autoplay demo read as someone using the product. */
export const Cursor = ({ at }) => at ? (
  <div style={{
    position: "absolute", left: at[0], top: at[1], zIndex: 40,
    transition: `left 760ms ${T.ease}, top 760ms ${T.ease}`, pointerEvents: "none",
  }}>
    <svg width="26" height="26" viewBox="0 0 24 24" style={{ filter: "drop-shadow(0 2px 5px rgba(0,0,0,.35))" }}>
      <path d="M5 2l14 10-6.5 1.2L15 20l-2.6 1-2.7-6.6L5 18z" fill="#fff" stroke={T.ink} strokeWidth="1.3" />
    </svg>
  </div>
) : null;
