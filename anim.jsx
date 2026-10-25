import { useEffect, useState } from "react";
import { T } from "./tokens.js";

/* ══════════════════════════════════════════════════════════════════
   Motion system
   One easing, one vocabulary. Nothing moves without meaning.
   ══════════════════════════════════════════════════════════════════ */
export const E = "cubic-bezier(0.16, 1, 0.3, 1)";   // Apple's ease-out-expo
export const D = { fast: 420, base: 640, slow: 900 };

export const KEYFRAMES = `
@keyframes riseIn   { from { opacity:0; transform: translateY(26px); } to { opacity:1; transform:none; } }
@keyframes riseInSm { from { opacity:0; transform: translateY(14px); } to { opacity:1; transform:none; } }
@keyframes fadeIn   { from { opacity:0; } to { opacity:1; } }
@keyframes slideFromEdge { from { opacity:0; transform: translateX(-70px) scale(0.985); } to { opacity:1; transform:none; } }
@keyframes popIn    { 0% { opacity:0; transform: scale(0.82); } 60% { opacity:1; transform: scale(1.04); } 100% { transform: scale(1); } }
@keyframes drawRule { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes maskUp   { from { opacity:0; transform: translateY(44px); filter: blur(7px); }
                      to   { opacity:1; transform:none; filter: blur(0); } }
@keyframes pulseRing{ 0% { box-shadow: 0 0 0 0 rgba(254,117,1,0.38); }
                      100% { box-shadow: 0 0 0 26px rgba(254,117,1,0); } }
@keyframes walkGradient { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
@keyframes countUp  { from { opacity:0; transform: scale(0.7); } to { opacity:1; transform: scale(1); } }
@keyframes beamSweep{ 0%   { opacity:0; transform: translateX(-75%) skewX(-14deg); }
                      22%  { opacity:0.55; }
                      78%  { opacity:0.55; }
                      100% { opacity:0; transform: translateX(175%) skewX(-14deg); } }
@keyframes breathe  { 0%,100% { opacity:0.5; transform: scale(1); }
                      50%     { opacity:0.95; transform: scale(1.06); } }
@keyframes wipeX    { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes haloIn   { from { opacity:0; transform: scale(0.55); } to { opacity:1; transform: scale(1); } }
@keyframes ghostIn  { from { opacity:0; transform: scale(1.14); } to { opacity:0.07; transform: scale(1); } }
@keyframes strike   { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes arrowIn  { from { opacity:0; transform: translateX(22px); } to { opacity:0.45; transform:none; } }
`;

/* Entrance wrapper. `d` = delay in ms, `k` = animation name. */
export function Reveal({ children, d = 0, k = "riseIn", dur = D.base, style, ...rest }) {
  return (
    <div
      style={{
        animation: `${k} ${dur}ms ${E} ${d}ms both`,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

/* Film grain — stops gradients banding on a large projector and adds depth. */
const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'>" +
  "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='3' stitchTiles='stitch'/></filter>" +
  "<rect width='180' height='180' filter='url(%23n)' opacity='0.5'/></svg>\")";

export function DarkAtmos({ color, beam = false, visible = true, beamKey }) {
  return (
    <div style={{
      position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none",
      opacity: visible ? 1 : 0, transition: `opacity 260ms ${E}`,
    }}>
      {/* breathing floor glow */}
      <div style={{
        position: "absolute", left: "50%", top: "112%", width: 1700, height: 1700,
        marginLeft: -850, marginTop: -850, borderRadius: "50%",
        background: `radial-gradient(circle, ${color}2e 0%, ${color}10 42%, transparent 66%)`,
        animation: `breathe 9s ease-in-out infinite`,
      }} />
      {/* top light, very faint */}
      <div style={{
        position: "absolute", left: "50%", top: -520, width: 1300, height: 900,
        marginLeft: -650, borderRadius: "50%",
        background: `radial-gradient(circle, ${color}14 0%, transparent 62%)`,
      }} />
      {/* one beam sweep on entrance */}
      {beam && visible && (
        <div key={beamKey} style={{
          position: "absolute", top: 0, bottom: 0, left: 0, width: 260,
          background: `linear-gradient(90deg, transparent, ${color}2a, transparent)`,
          animation: `beamSweep 2200ms ${E} 240ms both`,
        }} />
      )}
      {/* vignette */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(120% 90% at 50% 45%, transparent 52%, rgba(0,0,0,0.42) 100%)",
      }} />
      {/* grain */}
      <div style={{
        position: "absolute", inset: 0, backgroundImage: GRAIN,
        opacity: 0.05, mixBlendMode: "overlay",
      }} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   BD UI primitives — rendered in code so they animate at native
   resolution. Matches bd-client's light surfaces.
   ══════════════════════════════════════════════════════════════════ */
export const STATUS = {
  overdue:   { t: "באיחור",  c: T.red,     bg: "#FDEEEE" },
  soon:      { t: "מתקרב",   c: T.orange,  bg: "#FFF3E8" },
  toSchedule:{ t: "לתזמון",  c: T.grey650, bg: "#F3F4F6" },
  scheduled: { t: "מתוזמן",  c: T.blue,    bg: "#EFF4FF" },
  discussed: { t: "נדון",    c: T.green,   bg: "#EAF7EE" },
};

export function Badge({ s, size = 20 }) {
  const st = STATUS[s];
  return (
    <span style={{
      display: "inline-block", padding: `${size * 0.3}px ${size * 0.75}px`,
      borderRadius: 999, background: st.bg, color: st.c,
      fontFamily: T.font, fontWeight: 500, fontSize: size, whiteSpace: "nowrap",
      transition: `background 500ms ${E}, color 500ms ${E}`,
    }}>{st.t}</span>
  );
}

export function Card({ children, style, glow }) {
  return (
    <div style={{
      background: T.white, border: `1px solid ${T.grey200}`, borderRadius: 12,
      boxShadow: glow ? "0 12px 34px rgba(254,117,1,0.18)" : T.shadowSoft,
      transition: `box-shadow 500ms ${E}, border-color 500ms ${E}, transform 700ms ${E}`,
      ...style,
    }}>{children}</div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   HERO SEQUENCE · "התוכנית מתקנת את עצמה"
   Faithful to the Work Plan spec:
     DueDate[n>K] = LastDiscussionDate[K] + (n−K) × Frequency
   Quarterly topic. Q2 is discussed 3 weeks late → Q3 and Q4 re-flow.
   ══════════════════════════════════════════════════════════════════ */
const AXIS_START = new Date(2026, 0, 1);
const AXIS_END = new Date(2027, 1, 28);
const TRACK_W = 1430;

/* RTL deck: time runs right → left, matching the month chart and Hebrew reading. */
const xOf = (d) =>
  TRACK_W - ((d - AXIS_START) / (AXIS_END - AXIS_START)) * TRACK_W;

const fmt = (d) =>
  `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(2)}`;

const OCC = [
  { q: "Q1", planned: new Date(2026, 2, 15), shifted: new Date(2026, 2, 15) },
  { q: "Q2", planned: new Date(2026, 5, 15), shifted: new Date(2026, 6, 6) },
  { q: "Q3", planned: new Date(2026, 8, 15), shifted: new Date(2026, 9, 6) },
  { q: "Q4", planned: new Date(2026, 11, 15), shifted: new Date(2027, 0, 6) },
];

/* step 0 the plan · 1 the slip · 2 the re-flow · 3 the point */
export function RecurrenceSequence({ step = 0 }) {
  const moved = step >= 2;

  const statusFor = (i) => {
    if (i === 0) return "discussed";
    if (i === 1) return step >= 1 ? "discussed" : "scheduled";
    return step >= 2 ? "scheduled" : "toSchedule";
  };

  return (
    <div style={{ position: "relative", width: TRACK_W, height: 380, margin: "0 auto", paddingTop: 46 }}>
      {/* axis */}
      <div style={{
        position: "absolute", left: 0, right: 0, top: 168, height: 2,
        background: `linear-gradient(90deg, ${T.grey200}, ${T.grey200} 88%, transparent)`,
      }} />
      {/* year ticks */}
      {["ינואר 2026", "אפריל", "יולי", "אוקטובר", "ינואר 2027"].map((m, n) => {
        const d = new Date(2026 + (n === 4 ? 1 : 0), n === 4 ? 0 : n * 3, 1);
        return (
          <div key={m} style={{ position: "absolute", left: xOf(d), top: 182, transform: "translateX(-50%)" }}>
            <div style={{ width: 1, height: 10, background: T.grey350, margin: "0 auto" }} />
            <div style={{ marginTop: 8, fontFamily: T.font, fontSize: 19, color: T.grey500, whiteSpace: "nowrap" }}>{m}</div>
          </div>
        );
      })}

      {OCC.map((o, i) => {
        const d = moved && i > 1 ? o.shifted : (step >= 1 && i === 1 ? o.shifted : o.planned);
        const didMove = moved && i > 1;
        const isSlip = step >= 1 && i === 1;
        return (
          <div key={o.q} style={{
            position: "absolute", top: 20, left: 0,
            transform: `translateX(${xOf(d) - 98}px)`,
            transition: `transform 900ms ${E}`,
            transitionDelay: didMove ? `${(i - 2) * 140}ms` : "0ms",
          }}>
            {/* ghost of the original date */}
            {didMove && (
              <div style={{
                position: "absolute", top: -38, left: 0, width: 196, textAlign: "center",
                animation: `fadeIn 500ms ${E} 340ms both`,
                fontFamily: T.font, fontSize: 22, color: T.grey500,
                textDecoration: "line-through", textDecorationColor: T.red,
                direction: "ltr", unicodeBidi: "isolate",
              }}>{fmt(o.planned)}</div>
            )}
            <Card
              glow={isSlip || didMove}
              style={{
                width: 196, padding: "22px 22px", textAlign: "center",
                borderColor: isSlip ? T.orange : T.grey200,
              }}
            >
              <div style={{ fontFamily: T.fontEn, fontSize: 18, color: T.grey500, letterSpacing: "0.12em" }}>{o.q}</div>
              <div style={{
                marginTop: 10, fontFamily: T.font, fontWeight: 700, fontSize: 34, color: T.ink,
                direction: "ltr", unicodeBidi: "isolate",
              }}>{fmt(d)}</div>
              <div style={{ marginTop: 12 }}><Badge s={statusFor(i)} /></div>
            </Card>
            {/* the stem down to the axis */}
            <div style={{
              position: "absolute", left: "50%", top: 148, width: 2, height: 22,
              background: isSlip ? T.orange : T.grey350, transform: "translateX(-50%)",
            }} />
            <div style={{
              position: "absolute", left: "50%", top: 168, width: 13, height: 13, borderRadius: "50%",
              background: isSlip ? T.orange : T.grey350, transform: "translate(-50%,-2px)",
              animation: isSlip ? `pulseRing 1600ms ${E} 2` : "none",
            }} />
          </div>
        );
      })}

      {/* the slip callout */}
      {step >= 1 && (
        <div style={{
          position: "absolute", top: 248, left: xOf(OCC[1].shifted), transform: "translateX(-50%)",
          animation: `riseInSm 520ms ${E} 260ms both`,
          fontFamily: T.font, fontWeight: 600, fontSize: 24, color: T.orange, whiteSpace: "nowrap",
        }}>
          הדיון נדחה ב-3 שבועות
        </div>
      )}

      {/* the formula, revealed with the re-flow */}
      {step >= 2 && (
        <div style={{
          position: "absolute", top: 292, left: 0, right: 0, textAlign: "center",
          animation: `fadeIn 620ms ${E} 700ms both`,
          fontFamily: T.fontEn, fontSize: 22, color: T.grey600, direction: "ltr",
        }}>
          DueDate[n] = LastDiscussion + (n − K) × Frequency
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   WORK PLAN OVERVIEW · slide s1-year
   step 0 progress · 1 chart · 2 column clicked, table filters
   ══════════════════════════════════════════════════════════════════ */
const MONTHS = ["ינו", "פבר", "מרץ", "אפר", "מאי", "יונ", "יול", "אוג", "ספט", "אוק", "נוב", "דצמ"];
const BARS = [
  [2, 1, 0], [1, 0, 1], [3, 1, 0], [2, 2, 1], [1, 1, 0], [4, 1, 1],
  [2, 0, 2], [1, 1, 0], [3, 2, 1], [2, 1, 1], [1, 0, 0], [2, 1, 0],
];
const BAR_C = [T.green, T.blue, T.red];

export function WorkPlanOverview({ step = 0 }) {
  const pct = step >= 0 ? 68 : 0;
  return (
    <div style={{ width: 880, margin: "0 auto" }}>
      <Card style={{ padding: "26px 30px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontFamily: T.font, fontWeight: 600, fontSize: 24, color: T.ink }}>התקדמות תוכנית העבודה</span>
          <span style={{ fontFamily: T.font, fontWeight: 700, fontSize: 28, color: T.blue, direction: "ltr" }}>{pct}%</span>
        </div>
        <div style={{ marginTop: 16, height: 12, borderRadius: 6, background: T.grey100, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 6, background: T.blue,
            width: `${pct}%`, transition: `width 1100ms ${E} 200ms`,
          }} />
        </div>
      </Card>

      <Card style={{ marginTop: 20, padding: "26px 30px 18px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 14, height: 230 }}>
          {BARS.map((stack, m) => {
            const active = step >= 2 && m === 5;
            const dim = step >= 2 && m !== 5;
            return (
              <div key={m} style={{
                flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end",
                height: "100%", opacity: dim ? 0.3 : 1, transition: `opacity 500ms ${E}`,
              }}>
                {/* bars grow upward from the axis */}
                <div style={{ display: "flex", flexDirection: "column-reverse", gap: 3 }}>
                  {stack.map((v, k) => (
                    <div key={k} style={{
                      height: step >= 1 ? v * 26 : 0,
                      background: BAR_C[k], borderRadius: 3,
                      transition: `height 700ms ${E} ${m * 45 + k * 60}ms`,
                      outline: active && k === 0 ? `3px solid ${T.blue}` : "none",
                      outlineOffset: 2,
                    }} />
                  ))}
                </div>
                <span style={{
                  fontFamily: T.font, fontSize: 18, color: active ? T.blue : T.grey500,
                  textAlign: "center", marginTop: 10, fontWeight: active ? 600 : 400,
                }}>{MONTHS[m]}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {step >= 2 && (
        <div style={{
          marginTop: 18, animation: `riseInSm 520ms ${E} 120ms both`,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <span style={{
            padding: "10px 20px", borderRadius: 999, background: `${T.blue}14`,
            color: T.blue, fontFamily: T.font, fontSize: 21, fontWeight: 500,
          }}>יוני 2026 · נדון</span>
          <span style={{ fontFamily: T.font, fontSize: 21, color: T.grey600 }}>הטבלה סוננה ל-4 נושאים</span>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SCHEDULE TOPIC → AGENDA · slide s1-agenda
   step 0 topic · 1 it travels · 2 it lands carrying everything
   ══════════════════════════════════════════════════════════════════ */
const CARRIES = ["אחראים", "משך 25 דק'", "קטגוריה", "2 תגיות", "3 תתי-נושאים"];

export function ScheduleToAgenda({ step = 0 }) {
  const moved = step >= 1;
  return (
    <div style={{ position: "relative", width: 900, height: 440, margin: "0 auto" }}>
      <div style={{
        position: "absolute", right: 0, top: 0, width: 400,
        fontFamily: T.font, fontSize: 20, color: T.grey500, textAlign: "right",
      }}>תוכנית עבודה</div>
      <div style={{
        position: "absolute", left: 0, top: 0, width: 400,
        fontFamily: T.font, fontSize: 20, color: T.grey500, textAlign: "right",
      }}>סדר יום · ישיבת דירקטוריון 14/07</div>

      {/* the agenda it lands in */}
      <div style={{ position: "absolute", left: 0, top: 36, width: 400, display: "grid", gap: 10 }}>
        {["פתיחה ואישור פרוטוקול", "דוח כספי רבעוני"].map((t, i) => (
          <Card key={i} style={{ padding: "16px 18px", textAlign: "right" }}>
            <span style={{ fontFamily: T.font, fontSize: 21, color: T.grey650 }}>{t}</span>
          </Card>
        ))}
        {step >= 2 && (
          <div style={{ animation: `riseInSm 500ms ${E} both` }}>
            <Card glow style={{ padding: "16px 18px", textAlign: "right", borderColor: T.blue }}>
              <span style={{ fontFamily: T.font, fontWeight: 600, fontSize: 21, color: T.ink }}>
                מדיניות אבטחת מידע — סקירה רבעונית
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 12, justifyContent: "flex-end" }}>
                {CARRIES.map((c, i) => (
                  <span key={i} style={{
                    animation: `popIn 420ms ${E} ${260 + i * 90}ms both`,
                    padding: "6px 13px", borderRadius: 999, background: `${T.blue}12`,
                    color: T.blue, fontFamily: T.font, fontSize: 16,
                  }}>{c}</span>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* the travelling topic */}
      <div style={{
        position: "absolute", top: 36, right: 0, width: 400,
        transform: moved ? "translateX(-500px) scale(0.96)" : "none",
        opacity: step >= 2 ? 0 : 1,
        transition: `transform 880ms ${E}, opacity 300ms ${E} ${step >= 2 ? "560ms" : "0ms"}`,
      }}>
        <Card glow={moved} style={{ padding: "16px 18px", textAlign: "right", borderColor: moved ? T.blue : T.grey200 }}>
          <span style={{ fontFamily: T.font, fontWeight: 600, fontSize: 21, color: T.ink }}>
            מדיניות אבטחת מידע — סקירה רבעונית
          </span>
          <div style={{ marginTop: 12 }}><Badge s={moved ? "scheduled" : "toSchedule"} size={17} /></div>
        </Card>
      </div>
    </div>
  );
}

/* Replays entrance animations whenever the slide key changes. */
export function useReplayKey(dep) {
  const [n, setN] = useState(0);
  useEffect(() => setN((v) => v + 1), [dep]);
  return n;
}
