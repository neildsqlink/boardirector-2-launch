import { T } from "../tokens.js";
import { E, D } from "../anim.jsx";
import { FILM_BG, Mark } from "./Film.jsx";
import { CUE } from "./score.js";

/* ══════════════════════════════════════════════════════════════════
   The close — what happens to you, what happens next, the mark, the break.

   The words are the ones approved in the first deck (presentation-bd2.jsx:
   migration, next-steps, close, break): no dates, no numbers. Each slide is
   a ({ step }) => stage-filling component on the deck's own dark ground,
   in the same type as the chapter titles.
   ══════════════════════════════════════════════════════════════════ */

const BG = FILM_BG;

/* motion that belongs to these slides only — the deck's own keyframes
   (maskUp, riseInSm, fadeIn) are global already */
const CSS = `
@keyframes clCheckPop { 0% { opacity: 0; transform: scale(.4); } 60% { opacity: 1; transform: scale(1.12); } 100% { transform: scale(1); } }
@keyframes clCheckDraw { from { stroke-dashoffset: 30; } to { stroke-dashoffset: 0; } }
@keyframes clRowIn { from { opacity: 0; transform: translateX(-34px); } to { opacity: 1; transform: none; } }
@keyframes clRule { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes clLockIn { from { opacity: 0; transform: translateY(26px) scale(.985); filter: blur(10px); } to { opacity: 1; transform: none; filter: blur(0); } }
@keyframes clGlow { 0%, 100% { opacity: .55; } 50% { opacity: .9; } }
`;

/* the same two quiet lights the film ends on */
const Lights = ({ strong = false }) => (
  <>
    <div style={{
      position: "absolute", width: 1400, height: 1400, borderRadius: "50%", left: -300, top: 300,
      background: `radial-gradient(closest-side, ${T.orange}22, ${T.orange}00)`, opacity: strong ? 1 : 0.7,
    }} />
    <div style={{
      position: "absolute", width: 1600, height: 1600, borderRadius: "50%", right: -500, top: -800,
      background: "radial-gradient(closest-side, #5877E622, #5877E600)", opacity: strong ? 1 : 0.7,
    }} />
  </>
);

const Stage = ({ children, strong }) => (
  <div style={{ position: "absolute", inset: 0, background: BG, overflow: "hidden", direction: "rtl" }}>
    <style>{CSS}</style>
    <Lights strong={strong} />
    {children}
  </div>
);

/* ── 1 · הכול עובר איתכם ─────────────────────────────────────────
   step 0: the title and its line, alone.
   step 1: the four things that come with you arrive, one after another, each ticked. */
const CARRY = ["כל הנתונים וההיסטוריה", "כל המסמכים", "המשתמשים וההרשאות", "מבנה הוועדות"];

export function Migration({ step = 0 }) {
  const list = step >= 1;
  return (
    <Stage>
      {/* the title, where every chapter title stands */}
      <div style={{
        position: "absolute", top: 0, bottom: 0, right: 170, width: 900,
        display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "right",
      }}>
        <div style={{
          fontFamily: T.font, fontWeight: 600, fontSize: 30, color: T.orange, marginBottom: 22,
          animation: `riseInSm ${D.base}ms ${E} 300ms both`,
        }}>המעבר</div>
        <div style={{
          fontFamily: T.font, fontWeight: 700, fontSize: 132, lineHeight: 1.1, color: "#fff",
          whiteSpace: "pre-line", letterSpacing: "-0.02em",
          animation: `maskUp ${D.slow}ms ${E} 420ms both`,
        }}>{"הכול עובר\nאיתכם."}</div>
        <div style={{
          marginTop: 40, fontFamily: T.font, fontWeight: 300, fontSize: 38, lineHeight: 1.4,
          color: "rgba(255,255,255,.72)", maxWidth: 820,
          animation: `riseInSm ${D.slow}ms ${E} 1000ms both`,
        }}>הנתונים, המסמכים וההרשאות שלכם עוברים כמו שהם.</div>
      </div>

      {/* what comes with you */}
      {list && (
        <div style={{
          position: "absolute", top: 0, bottom: 0, left: 170, width: 680,
          display: "flex", flexDirection: "column", justifyContent: "center",
        }}>
          {CARRY.map((t, i) => {
            const d = 250 + i * 330;
            return (
              <div key={t} style={{
                display: "flex", alignItems: "center", gap: 30, padding: "30px 6px",
                borderTop: i ? "1px solid rgba(255,255,255,.09)" : "none",
                animation: `clRowIn 760ms ${E} ${d}ms both`,
              }}>
                <span style={{
                  width: 58, height: 58, borderRadius: "50%", flex: "none", display: "grid", placeItems: "center",
                  background: T.orange, boxShadow: `0 0 28px ${T.orange}66`,
                  animation: `clCheckPop 620ms ${E} ${d + 260}ms both`,
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12.5l4.6 4.5L19 7.5" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"
                      strokeDasharray="30" style={{ animation: `clCheckDraw 520ms ${E} ${d + 460}ms both` }} />
                  </svg>
                </span>
                <span style={{ fontFamily: T.font, fontWeight: 500, fontSize: 46, color: "#fff", letterSpacing: "-0.01em" }}>{t}</span>
              </div>
            );
          })}
        </div>
      )}
    </Stage>
  );
}

/* ── 2 · בשבועות הקרובים ניצור קשר עם כל לקוח ──────────────────
   one step: quiet and plain, no dates. */
export function NextSteps() {
  return (
    <Stage>
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", textAlign: "center",
      }}>
        <div style={{
          fontFamily: T.font, fontWeight: 700, fontSize: 116, lineHeight: 1.15, color: "#fff",
          whiteSpace: "pre-line", letterSpacing: "-0.02em",
          animation: `maskUp ${D.slow}ms ${E} 250ms both`,
        }}>{"בשבועות הקרובים\nניצור קשר עם כל לקוח"}</div>
        <div style={{
          marginTop: 44, width: 96, height: 3, borderRadius: 2, background: T.orange,
          boxShadow: `0 0 22px ${T.orange}`, transformOrigin: "center",
          animation: `clRule ${D.slow}ms ${E} 900ms both`,
        }} />
        <div style={{
          marginTop: 40, fontFamily: T.font, fontWeight: 300, fontSize: 44, color: "rgba(255,255,255,.72)",
          animation: `riseInSm ${D.slow}ms ${E} 1150ms both`,
        }}>לגבי המעבר למערכת החדשה.</div>
      </div>
    </Stage>
  );
}

/* ── 3 · the mark, and thank you ─────────────────────────────────
   the film's own lockup ("2.0" on the wordmark's baseline), at rest. */
const LOCK_H = 283;                    // the lockup's drawn height (164 logo units at 560/325)
export function Close() {
  return (
    <Stage strong>
      {/* Mark places itself 84px below the top of its box, centred */}
      <div style={{
        position: "absolute", left: 0, right: 0, top: 360 - LOCK_H / 2 - 84, height: LOCK_H + 84,
        animation: `clLockIn 1400ms ${E} 150ms both`,
      }}>
        <Mark t={CUE.title + 10} />
      </div>
      <div style={{
        position: "absolute", left: 0, right: 0, top: 660, textAlign: "center",
        fontFamily: T.font, fontWeight: 300, fontSize: 64, color: "rgba(255,255,255,.82)", letterSpacing: "0.01em",
        animation: `riseInSm ${D.slow}ms ${E} 1500ms both`,
      }}>תודה.</div>
    </Stage>
  );
}

/* ── 4 · the break ──────────────────────────────────────────────── */
export function BreakCard() {
  return (
    <Stage>
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", textAlign: "center",
      }}>
        <div style={{
          fontFamily: T.font, fontWeight: 700, fontSize: 150, lineHeight: 1.05, color: "#fff", letterSpacing: "-0.02em",
          animation: `maskUp ${D.slow}ms ${E} 150ms both`,
        }}>הפסקה</div>
        <div style={{
          marginTop: 30, fontFamily: T.font, fontWeight: 300, fontSize: 52, color: T.orange,
          animation: `riseInSm ${D.slow}ms ${E} 600ms both`,
        }}>נחזור בשעה 11:10</div>
        <div style={{
          marginTop: 78, width: 120, height: 3, borderRadius: 2, background: "rgba(255,255,255,.16)",
          animation: `clRule ${D.slow}ms ${E} 900ms both`,
        }} />
        <div style={{
          marginTop: 44, fontFamily: T.font, fontSize: 24, color: "rgba(255,255,255,.5)", letterSpacing: "0.1em",
          animation: `fadeIn ${D.slow}ms ${E} 1100ms both`,
        }}>הבא בתור</div>
        <div style={{
          marginTop: 14, fontFamily: T.font, fontWeight: 500, fontSize: 38, color: "#fff",
          animation: `riseInSm ${D.slow}ms ${E} 1200ms both`,
        }}>צבי גבאי · מאחורי הקלעים של עולם האכיפה והציות</div>
      </div>
    </Stage>
  );
}
