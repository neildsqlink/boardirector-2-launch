import { useEffect, useRef, useState } from "react";
import { T } from "../tokens.js";
import { Play, Pause } from "lucide-react";

const A = (p) => `${import.meta.env.BASE_URL}${p.replace(/^\//, "")}`;
const NAT = [3200, 2000];

/* ══════════════════════════════════════════════════════════════════
   A demo made of the real app's own screenshots (2x captures from the
   live product), played like a recording: the cursor travels to the
   next control, clicks, and the next real screen cross-fades in. Text
   that is typed is drawn into the field as it is typed.

   spec.frames: [{ src, hint, hold, cursor: [x, y], click, type: { rect, text },
                   drag, shimmer, reveal }]
   — coordinates are in the capture's 3200×2000 pixels.
   Motion between screenshots:
     drag:    { from, rect: [x, y, w, h], to: [x, y], tilt } — that piece of `from` lifts and
              travels to `to` with the cursor; on the next frame it settles and fades.
     shimmer: [x, y, w, h] — a light sweeps across an AI "working" block.
     reveal:  { rect: [x, y, w, h], dur, dir } — the new content arrives over the previous
              screen: dir 'down' (default — generated text streaming in, rows opening),
              'up' (bars rising), 'rtl' / 'ltr' (filling sideways), 'radial' (rings, progress);
              cover: a colour to wipe away instead of the previous screen (when the layouts differ).
     reveal also takes delay (ms before the wipe, default 200) and fade (the cover fades in first, so whatever
              was there — old bars, a closing menu — fades to it before the new content arrives).
     push:     { y, h, x, w, dur, delay, dir } — a row opened (dir 'down', default): everything below y slides down
              by h, uncovering what opened; or closed (dir 'up'): the rows below slide back up over it.
     scroll:   { rect, d, dur, delay } — the content inside rect scrolls up by d: the previous screen slides out
              the top while this one rises into place (both show the same content where they overlap).
     progress: { rect, dur, color, track } — a progress bar drawn over the screenshot's own, filling right to left.
     spin:     [x, y, w, h] — that piece of the screen turns (a loading spinner).
   ══════════════════════════════════════════════════════════════════ */
export function ShotDemo({ spec, w = 1360 }) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [typed, setTyped] = useState(0);
  const [ripple, setRipple] = useState(0);
  const [goAt, setGoAt] = useState(-1);           // the frame whose motion has started: set one paint after it mounts
  const go = goAt === i;                          // false on a frame's first render, so its motion always starts from the beginning
  const timers = useRef([]);
  const k = w / NAT[0];
  const f = spec.frames[i];
  const last = i === spec.frames.length - 1;

  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));

  useEffect(() => {
    let r2; const r1 = requestAnimationFrame(() => { r2 = requestAnimationFrame(() => setGoAt(i)); });
    return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2); };
  }, [i]);

  useEffect(() => {
    clear();
    setTyped(0);
    if (f.type) {
      const start = 700;
      for (let n = 1; n <= f.type.text.length; n++) later(() => setTyped(n), start + n * (f.type.speed || 75));
    }
    if (!playing) return clear;
    if (f.click) later(() => setRipple((r) => r + 1), f.hold - 380);
    if (last) later(() => setPlaying(false), f.hold);
    else later(() => setI((v) => v + 1), f.hold);
    return clear;
  }, [i, playing]);

  const restart = () => { setI(0); setPlaying(true); };
  const back = () => { setPlaying(false); setI((v) => Math.max(0, v - 1)); };
  const toggle = () => (last && !playing ? restart() : setPlaying((p) => !p));   // at the end, play starts over
  const forward = () => { setPlaying(false); setI((v) => Math.min(spec.frames.length - 1, v + 1)); };
  const cur = f.cursor;
  const prev = spec.frames[i - 1];
  /* a piece of a screenshot, cut out so it can move on its own */
  const piece = (src, [x, y, w, h], style) => ({
    position: "absolute", left: x * k, top: y * k, width: w * k, height: h * k, pointerEvents: "none",
    backgroundImage: `url(${A(src)})`, backgroundSize: `${NAT[0] * k}px ${NAT[1] * k}px`,
    backgroundPosition: `${-x * k}px ${-y * k}px`, ...style,
  });
  /* how the previous screen is wiped away, per direction */
  const wipe = (r, on) => {
    const t = `${r.dur || 1500}ms cubic-bezier(.4,0,.6,1) ${r.delay ?? 200}ms`;
    if (r.dir === "radial") return {
      "--bdxa": on ? "360deg" : "0deg", transition: `--bdxa ${t}`,
      WebkitMaskImage: "conic-gradient(transparent var(--bdxa), #000 0)", maskImage: "conic-gradient(transparent var(--bdxa), #000 0)",
    };
    const gone = { down: "inset(100% 0 0 0)", up: "inset(0 0 100% 0)", rtl: "inset(0 100% 0 0)", ltr: "inset(0 0 0 100%)" }[r.dir || "down"];
    return { clipPath: on ? gone : "inset(0 0 0 0)", transition: `clip-path ${t}` };
  };
  const lifted = (d, on) => `translate(${(d.to[0] - d.rect[0]) * k}px, ${(d.to[1] - d.rect[1]) * k}px) rotate(${d.tilt ?? 0}deg) scale(${on ? 1.02 : 1})`;

  return (
    <div data-nonav style={{ width: w }}>
      <div onClick={forward} style={{
        position: "relative", width: w, height: NAT[1] * k, borderRadius: 14, overflow: "hidden",
        boxShadow: "0 50px 130px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.06)", background: "#fff", cursor: "pointer",
      }}>
        {/* every screen is mounted from the start, so each cross-fade is instant */}
        {spec.frames.map((fr, n) => (
          <img key={n} src={A(fr.src)} alt="" style={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            opacity: n === i ? 1 : 0,
            transition: "opacity 380ms ease",
          }} />
        ))}
        {/* drag: the piece lifts out of the screen and travels with the cursor */}
        {f.drag && (
          <div key={`drag${i}`} style={piece(f.drag.from, f.drag.rect, {
            zIndex: 2, borderRadius: 10 * k,
            transform: go ? lifted(f.drag, true) : "none",
            boxShadow: go ? "0 22px 48px rgba(23,33,52,.24), 0 4px 12px rgba(23,33,52,.12)" : "0 0 0 rgba(0,0,0,0)",
            transition: "transform 820ms cubic-bezier(.16,1,.3,1), box-shadow 300ms ease",
          })} />
        )}
        {/* …and on the next frame it is dropped: it settles and fades into the list */}
        {prev?.drag && !f.drag && (
          <div key={`drop${i}`} style={piece(prev.drag.from, prev.drag.rect, {
            zIndex: 2, borderRadius: 10 * k, transform: lifted(prev.drag, false),
            opacity: go ? 0 : 1, transition: "opacity 420ms ease 80ms",
          })} />
        )}
        {/* shimmer: a light sweeping across an AI block that is still working */}
        {f.shimmer && (
          <div style={{ position: "absolute", left: f.shimmer[0] * k, top: f.shimmer[1] * k, width: f.shimmer[2] * k, height: f.shimmer[3] * k,
            overflow: "hidden", borderRadius: 12 * k, zIndex: 2, pointerEvents: "none" }}>
            <div style={{ position: "absolute", top: 0, bottom: 0, width: "40%",
              background: "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,.8), rgba(255,255,255,0))",
              animation: "shotShimmer 1.25s ease-in-out infinite" }} />
          </div>
        )}
        {/* progress: an upload bar filling from empty to full */}
        {f.progress && (      /* on a white band a little larger than the bar, so none of the screenshot's own bar shows at the edges */
          <div style={{ position: "absolute", left: (f.progress.rect[0] - 4) * k, top: (f.progress.rect[1] - 4) * k, width: (f.progress.rect[2] + 8) * k,
            height: (f.progress.rect[3] + 8) * k, padding: 4 * k, background: "#fff", zIndex: 2, pointerEvents: "none", boxSizing: "border-box" }}>
            <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: 99, overflow: "hidden", background: f.progress.track }}>
              <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, borderRadius: 99, background: f.progress.color,
                width: go ? "100%" : "0%", transition: `width ${f.progress.dur || 1600}ms cubic-bezier(.45,0,.3,1) 250ms` }} />
            </div>
          </div>
        )}
        {f.spin && <div style={piece(f.src, f.spin, { zIndex: 2, animation: "shotSpin 1s linear infinite" })} />}
        {/* reveal: the previous screen is wiped away top to bottom, uncovering the generated content */}
        {prev && [].concat(f.reveal || []).map((r, n) => (
          <div key={`rev${i}-${n}`} style={piece(prev.src, r.rect, {
            zIndex: 2, ...(r.cover ? { backgroundImage: "none", background: r.cover } : {}), ...wipe(r, go),
            ...(r.fade ? { animation: "shotFadeIn 380ms ease both" } : {}) })} />
        ))}
        {/* scroll: a list scrolled within its box — the old view leaves upward as the new one arrives from below */}
        {prev && f.scroll && (() => {
          const [sx, sy, sw, sh] = f.scroll.rect, d = f.scroll.d * k;
          const t = `transform ${f.scroll.dur || 900}ms cubic-bezier(.33,0,.15,1) ${f.scroll.delay ?? 380}ms`;
          const at = (src, style) => ({ ...piece(src, [sx, sy, sw, sh], style), left: 0, top: 0 });
          return (
            <div key={`scroll${i}`} style={{ position: "absolute", left: sx * k, top: sy * k, width: sw * k, height: sh * k,
              overflow: "hidden", zIndex: 2, pointerEvents: "none" }}>
              <div style={at(prev.src, { transform: `translateY(${go ? -d : 0}px)`, transition: t })} />
              <div style={at(f.src, { transform: `translateY(${go ? 0 : d}px)`, transition: t })} />
            </div>
          );
        })()}
        {/* push: the content under a row slides down to make room for what opened (or back up to close it) */}
        {prev && f.push && (() => {
          const p = f.push, x = p.x ?? 44, w = p.w ?? 2652, hgt = NAT[1] - p.y;
          const t = `transform ${p.dur || 950}ms cubic-bezier(.33,0,.15,1) ${p.delay ?? 380}ms`;   // after the screens' cross-fade
          const at = (src, style) => ({ ...piece(src, [x, p.y, w, hgt], style), left: 0, top: 0 });
          return (
            <div key={`push${i}`} style={{ position: "absolute", left: x * k, top: p.y * k, width: w * k, height: hgt * k,
              overflow: "hidden", zIndex: 2, pointerEvents: "none" }}>
              {p.dir === "up" ? <>
                <div style={at(prev.src)} />
                <div style={at(f.src, { transform: `translateY(${go ? 0 : p.h * k}px)`, transition: t })} />
              </> : <div style={at(prev.src, { transform: `translateY(${go ? p.h * k : 0}px)`, transition: t })} />}
            </div>
          );
        })()}
        {f.type && (
          <div style={{
            position: "absolute", left: f.type.rect[0] * k, top: f.type.rect[1] * k,
            width: (f.type.rect[2] - f.type.rect[0]) * k, height: (f.type.rect[3] - f.type.rect[1]) * k,
            background: "#fff", direction: "rtl", display: "flex", alignItems: "center",
            fontFamily: T.font, fontSize: 28 * k, color: "#172134", paddingInline: 4 * k,
          }}>
            {f.type.text.slice(0, typed)}
            <span style={{ width: 2 * k + 1, height: 34 * k, background: "#172134", marginInlineStart: 2, opacity: typed < f.type.text.length ? 1 : 0 }} />
          </div>
        )}
        {cur && (
          <div style={{
            position: "absolute", left: cur[0] * k, top: cur[1] * k, zIndex: 3, pointerEvents: "none",
            transition: "left 820ms cubic-bezier(.16,1,.3,1), top 820ms cubic-bezier(.16,1,.3,1)",
          }}>
            <span key={ripple} style={{
              position: "absolute", left: -18, top: -18, width: 36, height: 36, borderRadius: "50%",
              border: `2px solid ${T.orange}`, animation: ripple ? "shotRipple 520ms ease-out both" : "none", opacity: 0,
            }} />
            <svg width="28" height="28" viewBox="0 0 24 24" style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,.35))" }}>
              <path d="M5 2l14 10-6.5 1.2L15 20l-2.6 1-2.7-6.6L5 18z" fill="#fff" stroke="#172134" strokeWidth="1.3" />
            </svg>
          </div>
        )}
        <style>{`@keyframes shotRipple { 0% { opacity: .9; transform: scale(.4) } 100% { opacity: 0; transform: scale(1.6) } }
          @keyframes shotShimmer { from { left: -45% } to { left: 105% } }
          @keyframes shotSpin { to { transform: rotate(360deg) } }
          @keyframes shotFadeIn { from { opacity: 0 } }
          @property --bdxa { syntax: "<angle>"; inherits: false; initial-value: 0deg; }`}</style>
      </div>

      <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 14, padding: "8px 4px", direction: "rtl" }}>
        <span style={{ flex: 1, fontFamily: T.font, fontSize: 25, color: "rgba(255,255,255,.88)" }}>{f.hint}</span>
        <span style={{ fontFamily: T.fontEn, fontSize: 15, color: "rgba(255,255,255,.45)", direction: "ltr" }}>{i + 1} / {spec.frames.length}</span>
        <button title={playing ? "Pause" : "Play"} onClick={(e) => { e.stopPropagation(); e.currentTarget.blur(); toggle(); }} style={{
          width: 42, height: 42, borderRadius: "50%", padding: 0, display: "grid", placeItems: "center", cursor: "pointer",
          border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.04)", color: "rgba(255,255,255,.8)",
        }}>{playing ? <Pause size={16} strokeWidth={1.75} fill="currentColor" /> : <Play size={16} strokeWidth={1.75} fill="currentColor" style={{ marginLeft: 2 }} />}</button>
        {[["חזור", back], ["התחל מחדש", restart]].map(([label, on]) => (
          <button key={label} onClick={(e) => { e.stopPropagation(); e.currentTarget.blur(); on(); }} style={{
            border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.04)", color: "rgba(255,255,255,.75)",
            borderRadius: 9, padding: "9px 18px", cursor: "pointer", fontFamily: T.font, fontSize: 18,
          }}>{label}</button>
        ))}
      </div>
    </div>
  );
}

/* ── the meeting demos ─────────────────────────────────────────── */
const M = "captures/new/meetings/";

export const createMeeting = { frames: [
  { src: M + "meetings-list.png", hold: 2600, cursor: [196, 280], click: true,
    hint: "כל הישיבות במקום אחד. ישיבה חדשה — בכפתור אחד." },
  { src: M + "create-0-empty.png", hold: 3600, cursor: [2236, 724],     // parked under the field, off the text
    type: { rect: [940, 614, 2266, 674], text: "דירקטוריון — רבעון 4" },
    hint: "שלב 1: שם, ועדה, מארגן, תאריך ומיקום." },
  { src: M + "create-1.png", hold: 2600, cursor: [1010, 1559], click: true,
    hint: "שלב 1: שם, ועדה, מארגן, תאריך ומיקום." },
  { src: M + "create-2.png", hold: 3200, cursor: [1010, 1559], click: true,
    hint: "שלב 2: חברי הוועדה נכנסים כמשתתפים — ואפשר להוסיף גם חיצוניים." },
  { src: M + "create-3.png", hold: 2600, cursor: [2160, 1058], click: true,
    hint: "שלב 3: פרסום הישיבה ושליחת זימונים בדוא״ל." },
  { src: M + "create-3-invite.png", hold: 3400, cursor: [1039, 1636], click: true,
    hint: "הזימון כבר כתוב — עם שם הישיבה והתאריך." },
  /* back to the list, and into a meeting that already exists — a draft, since only a draft's agenda can change */
  { src: M + "meetings-list.png", hold: 2600, cursor: [942, 976], click: true,
    hint: "בחזרה לרשימת הישיבות — ולישיבה שעוד בטיוטה." },
  { src: M + "list-menu-draft.png", hold: 3400, cursor: [1080, 1082], click: true,
    hint: "מהתפריט: פתיחת הישיבה, העתקת קישור — וגם שכפול, עם המשתתפים וסדר היום." },
  { src: M + "draft-overview.png", hold: 3600, cursor: [2518, 450], click: true,
    hint: "עמוד הישיבה: פרטים, משתתפים, מסמכים ופעולות מהירות. הישיבה עדיין טיוטה." },
  { src: M + "draft-participants.png", hold: 3400, cursor: [2536, 576], click: true,
    hint: "משתתפים: מי הוזמן, באיזה תפקיד — ומי אישר הגעה." },
  /* the agenda: empty → בניית סדר יום → צור ידנית → topics from the work plan, one click each.
     Real screens; the AI cards and the manual card were added into the real dialog for the capture,
     and nothing was saved — every write was answered before it reached the server. */
  { src: M + "agenda-0-empty.png", hold: 3200, cursor: [934, 1434], click: true,
    hint: "סדר היום עדיין ריק — וכל עוד הישיבה בטיוטה, בונים אותו בחופשיות." },
  { src: M + "agenda-1-dialog.png", hold: 3400, cursor: [2027, 807],
    hint: "בניית סדר יום: משכפלים מישיבה, מתחילים מתבנית או ידנית — ושתי דרכים חדשות, עם AI." },
  /* a look at שכפל מישיבה — the real list, summary and topics — then back out without confirming */
  { src: M + "agenda-1-dialog.png", hold: 2400, cursor: [2190, 1318], click: true,
    hint: "אפשר לשכפל סדר יום מישיבה קודמת." },
  { src: M + "clone-1-list.png", hold: 3000, cursor: [1700, 700], click: true,
    hint: "כל הישיבות הקודמות — עם חיפוש וסינון לפי תאריך." },
  { src: M + "clone-2-confirm.png", hold: 3000, cursor: [2307, 1159], click: true,
    hint: "סיכום לפני השכפול — ואפשר להעתיק גם את האחראים והמשתתפים." },
  { src: M + "clone-3-topics.png", hold: 2600, cursor: [826, 1232],
    hint: "ולהוריד נושאים שלא צריך." },
  { src: M + "clone-3-topics.png", hold: 1800, cursor: [2418, 557], click: true,
    hint: "אבל הפעם — לא משכפלים." },
  { src: M + "clone-1-list.png", hold: 1300, cursor: [2418, 452], click: true,
    hint: "אבל הפעם — לא משכפלים." },
  { src: M + "agenda-1-dialog.png", hold: 2200, cursor: [1596, 1187], click: true,
    hint: "הפעם — צור ידנית." },
  { src: M + "agenda-p-0.png", hold: 3800, cursor: [332, 424], click: true,
    hint: "לצד סדר היום — מתוכנית העבודה: הנושאים שממתינים לשיבוץ, מה באיחור ומה מתקרב ליעד." },
  { src: M + "agenda-p-1.png", hold: 3000, cursor: [332, 602], click: true,
    hint: "לחיצה — והנושא בסדר היום, עם המשך והשעה שלו. בתוכנית העבודה הוא מאפיר." },
  { src: M + "agenda-p-2.png", hold: 2400, cursor: [332, 779], click: true,
    hint: "ועוד אחד — והפעם בגרירה." },
  { src: M + "agenda-d-1.png", hold: 1700, cursor: [1480, 587],
    drag: { from: M + "agenda-p-2.png", rect: [68, 733, 528, 154], to: [1216, 541], tilt: -2.5 },
    hint: "או גוררים — ישר למקום הנכון בסדר היום." },
  { src: M + "agenda-p-3.png", hold: 3000, cursor: [332, 957], click: true,
    hint: "הנושא נכנס בדיוק לשם, והשעות של כל השאר זזות בהתאם." },
  { src: M + "agenda-d-2.png", hold: 1700, cursor: [1480, 878],
    drag: { from: M + "agenda-p-3.png", rect: [68, 910, 528, 154], to: [1216, 831], tilt: -2.5 },
    hint: "וגם לסוף הרשימה." },
  { src: M + "agenda-p-4.png", hold: 3200, cursor: [1981, 854], click: true,
    hint: "ארבעה נושאים, 2:10 שעות — בתוך זמן הישיבה." },
  { src: M + "agenda-d-3.png", hold: 1900, cursor: [1981, 517],
    drag: { from: M + "agenda-p-4.png", rect: [728, 784, 1284, 142], to: [728, 447], tilt: 0 },
    hint: "היו״ר מבקש להקדים את אישור הדוחות — גוררים בתוך סדר היום." },
  { src: M + "agenda-p-5.png", hold: 3200, cursor: [1300, 1500],
    hint: "וכל השעות מתחשבות מחדש." },
  { src: M + "agenda-p-6.png", hold: 4200, cursor: [1300, 1500],
    hint: "סדר היום מוכן — מתוכנית העבודה, בכמה לחיצות וגרירות." },
] };

/* the meetings chapter in two: creating a meeting from the list (ending on the draft's ⋮ menu),
   then — after the old/new meeting-page comparison — inside that meeting */
export const meetingPage = { frames: createMeeting.frames.slice(8) };
createMeeting.frames = createMeeting.frames.slice(0, 8);

export const meetingFromWorkplan = { frames: [
  { src: M + "wp-open.png", hold: 2600, cursor: [2652, 938], click: true,
    hint: "בתוכנית העבודה: בוחרים את הנושאים שצריך לדון בהם." },
  { src: M + "wp-selected.png", hold: 2600, cursor: [2196, 1840], click: true,
    hint: "שבץ בישיבה —" },
  { src: M + "wp-schedule.png", hold: 2800, cursor: [1906, 1118], click: true,
    hint: "לישיבה קיימת, או לישיבה חדשה." },
  { src: M + "wp-create.png", hold: 4600, cursor: [1011, 1357],
    hint: "לאחר יצירת הישיבה, הנושאים שנבחרו יתווספו לסדר היום שלה." },
] };

/* ── decisions, tasks, BD Drive ─────────────────────────────────
   Real product screens. Decisions: the AI "הצע משימות" in the real decision drawer is the AI
   roadmap's Tasks-From-Decision, drawn into the page for the capture. Tasks: the move to "הושלם"
   is shown in the page (the save was blocked). BD Drive: not live on product yet — real page code,
   demo data. Nothing was saved anywhere. */
export const decisionsDemo = { frames: [
  { src: "captures/new/decisions/ai-01-list.png", hold: 3000, cursor: [1805, 675], click: true,
    hint: "מעקב החלטות: כל ההחלטות מכל הוועדות, עם התקדמות המשימות של כל אחת." },
  { src: "captures/new/decisions/ai-02-drawer.png", hold: 4400, cursor: [716, 862], click: true,
    hint: "כל החלטה — עם הישיבה, הנושא והוועדה. וחדש: הצעת משימות עם AI." },
  { src: "captures/new/decisions/ai-03-think.png", hold: 2600, cursor: [716, 862], shimmer: [64, 916, 1272, 230],
    hint: "מאתר פעולות, אחראים ותאריכים בהחלטה…" },
  { src: "captures/new/decisions/ai-04-suggest.png", hold: 5800, cursor: [225, 1523], click: true, reveal: { rect: [64, 916, 1272, 595], dur: 1900 },
    hint: "מכל סעיף בהחלטה — משימה, עם אחראי ותאריך היעד שנקבע בה." },
  { src: "captures/new/decisions/ai-05-done.png", hold: 4400, cursor: [1000, 1500],
    hint: "המשימות נוצרות ומקושרות להחלטה, לנושא ולישיבה." },
] };

export const tasksDemo = { frames: [
  { src: "captures/new/tasks/t01-board.png", hold: 3200, cursor: [1412, 703], click: true,
    hint: "כל המשימות בלוח אחד: לביצוע, בתהליך, הושלם — ומה באיחור." },
  { src: "captures/new/tasks/t02-task.png", hold: 3600, cursor: [1085, 760],
    hint: "פותחים משימה: אחראי, תאריך יעד, תגיות ותיאור." },
  { src: "captures/new/tasks/t03-decision-link.png", hold: 4000, cursor: [237, 79], click: true,
    hint: "כל משימה מקושרת להחלטה שממנה היא נולדה: הוועדה, הישיבה והנושא." },
  { src: "captures/new/tasks/t04-status-menu.png", hold: 2400, cursor: [150, 308], click: true, reveal: { rect: [40, 190, 420, 380], dur: 400 },
    hint: "מעדכנים סטטוס בלחיצה אחת." },
  { src: "captures/new/tasks/t05-done.png", hold: 2600, cursor: [2000, 1240], click: true,
    hint: "המשימה הושלמה." },
  { src: "captures/new/tasks/t06-board-moved.png", hold: 3800, cursor: [367, 245], click: true,
    hint: "המשימה עברה ל״הושלם״, והמונים מתעדכנים." },
  { src: "captures/new/tasks/t07-from-decision.png", hold: 3400, cursor: [176, 431], click: true,
    hint: "בלחיצה אחת: רק משימות פתוחות שנולדו מהחלטות." },
  { src: "captures/new/tasks/t08-create.png", hold: 2200, cursor: [581, 258], click: true,
    hint: "משימה חדשה —" },
  { src: "captures/new/tasks/t09-create-title.png", hold: 2800, cursor: [580, 1010],
    type: { rect: [80, 240, 1085, 278], text: "מעקב מדיניות גידור", speed: 70 },
    hint: "שם, אחראי ותאריך יעד…" },
  { src: "captures/new/tasks/t10-create-filled.png", hold: 3200, cursor: [764, 951], reveal: { rect: [73, 928, 1033, 160], dur: 1400, dir: "rtl", cover: "#fff" },
    hint: "…ותיאור, כמו שהוא נכתב בפועל." },
  { src: "captures/new/tasks/t11-create-ai.png", hold: 2600, cursor: [764, 951], click: true,
    hint: "וחדש: שכתוב עם AI, ישר מתוך העורך." },
  { src: "captures/new/tasks/t12-ai-menu.png", hold: 4600, cursor: [842, 1032], reveal: { rect: [656, 992, 373, 307], dur: 900 },
    hint: "שפר ניסוח, קצר, נסח באופן רשמי יותר, המר לנקודות." },
  /* the rest of the real drawer: priority, tags, a viewer; sub-tasks, each with its own owner; and the
     real connections dialog — committee → meeting → topic → the decision the task came from */
  { src: "captures/new/tasks/t14-details.png", hold: 2800, cursor: [917, 780],
    hint: "משלימים את הפרטים: עדיפות וצופים — מי שצריך להתעדכן בכל שינוי." },
  { src: "captures/new/tasks/t15-sub-typing.png", hold: 3000, cursor: [360, 1660],
    type: { rect: [146, 1585, 1054, 1621], text: "הכנת המלצה לוועדה לקראת הישיבה הבאה", speed: 55 },
    hint: "תתי-משימות: מפרקים את העבודה לשלבים…" },
  { src: "captures/new/tasks/t16-sub-assignee.png", hold: 2600, cursor: [252, 1455], click: true, reveal: { rect: [82, 1173, 381, 400], dur: 400 },
    hint: "…ולכל שלב — אחראי משלו." },
  { src: "captures/new/tasks/t17-subtasks.png", hold: 3600, cursor: [583, 1880], click: true,
    reveal: { rect: [60, 1440, 1060, 245], dur: 1100, cover: "#fff" },
    hint: "שלוש תתי-משימות, שלושה אחראים." },
  { src: "captures/new/tasks/t18-conn-pick.png", hold: 3000, cursor: [624, 1358], click: true,
    hint: "קישורים: לוועדה, לישיבה, לנושא — ולהחלטה." },
  { src: "captures/new/tasks/t19-conn-filled.png", hold: 5600, cursor: [243, 1361], click: true,
    hint: "המשימה יודעת מאיזו החלטה היא נולדה — וכל מי שפותח אותה רואה את ההקשר." },
  { src: "captures/new/tasks/t20-conn-done.png", hold: 4400, cursor: [260, 1700],
    hint: "והקישור נשמר על המשימה." },
] };

/* The drive's own sidebar opens (the real toggle), its folder tree unfolds, the board folder, a file's
   actions and details, then "התיקייה האישית שלי" from the sidebar. The drive's data is the demo mock
   (drive-mock2): every /api/Resources call was answered before it reached the server. */
export const driveDemo = { frames: [
  { src: "captures/new/drive/s01-root.png", hold: 3000, cursor: [2550, 1080], click: true,
    hint: "BD Drive: כל מסמכי הארגון במקום אחד, בתיקייה לכל ועדה." },
  { src: "captures/new/drive/s02-open.png", hold: 2800, cursor: [2124, 312], click: true,
    reveal: { rect: [2050, 190, 660, 1780], dur: 700, dir: "rtl", cover: "#fff" },
    hint: "בצד — הניווט: כל המסמכים, התיקייה האישית והארכיון." },
  { src: "captures/new/drive/s03-tree.png", hold: 2800, cursor: [2400, 429], click: true,
    reveal: { rect: [2060, 360, 640, 1160], dur: 900, cover: "#fff" },
    hint: "וכל המבנה בעץ אחד — תיקייה לכל ועדה." },
  { src: "captures/new/drive/s04-folder.png", hold: 3000, cursor: [1576, 530], click: true,
    reveal: { rect: [30, 440, 2000, 1500], dur: 800, cover: "#fff" },
    hint: "בתיקיית הדירקטוריון: תיקייה לכל ישיבה, ודוחות, תקציבים ופרוטוקולים." },
  { src: "captures/new/drive/s05-selected.png", hold: 2800, cursor: [284, 1843], click: true,
    reveal: { rect: [40, 1770, 1960, 150], dur: 500, dir: "up" },
    hint: "בוחרים קובץ ומקבלים את כל הפעולות: הורדה, העברה, תגיות, גישה ופרטים." },
  { src: "captures/new/drive/s06-details.png", hold: 3600, cursor: [600, 1860],
    reveal: { rect: [40, 450, 830, 1510], dur: 600, dir: "ltr", cover: "#fff" },
    hint: "בחלונית הפרטים רואים מי פתח, מי שינה, מי יצר ולמי יש גישה." },
  { src: "captures/new/drive/s06-details.png", hold: 1700, cursor: [2400, 1092], click: true,
    hint: "ובצד — התיקייה האישית שלי." },
  { src: "captures/new/drive/s07-personal.png", hold: 4800, cursor: [1100, 640],
    reveal: { rect: [30, 440, 2000, 1500], dur: 800, cover: "#fff" },
    hint: "הערות, טיוטות וספר ישיבה עם הסימונים שלי — רק אני רואה אותם." },
] };

/* ── the meeting book, and asking it ───────────────────────────
   The real book page (agenda sidebar, viewer). The document shown is a demo Q3 report laid over
   the viewer, and the "תשאול מסמכים וישיבות" panel is the AI roadmap's design drawn into the page. */
export const bookDemo = { frames: [
  { src: "captures/new/book/01-plain.png", hold: 3200, cursor: [2932, 1016],
    hint: "ספר הישיבה: כל החומרים לפי סדר היום, במקום אחד." },
  { src: "captures/new/book/02-btn.png", hold: 2600, cursor: [637, 178], click: true,
    hint: "וחדש — שואלים את ספר הישיבה." },
  { src: "captures/new/book/03-open.png", hold: 2600, cursor: [409, 1824], click: true,
    hint: "שאלות מוצעות, או כל שאלה על חומרי הישיבה." },
  { src: "captures/new/book/04-typed.png", hold: 4000, cursor: [90, 1824], click: true,
    type: { rect: [140, 1796, 768, 1852], text: "למה ירד הרווח הגולמי ברבעון השלישי?", speed: 60 },
    hint: "שואלים בשפה פשוטה." },
  { src: "captures/new/book/05-think.png", hold: 2400, cursor: [500, 1300], shimmer: [36, 611, 746, 172],
    hint: "מחפש בספר הישיבה…" },
  { src: "captures/new/book/06-answer.png", hold: 5400, cursor: [382, 741], click: true, reveal: { rect: [36, 611, 746, 261], dur: 2000 },
    hint: "תשובה ברורה — וכל טענה עם המקור שלה בספר." },
  { src: "captures/new/book/07-cite.png", hold: 4800, cursor: [2300, 1150],
    hint: "לחיצה על המקור — והקטע מודגש במסמך." },
] };

/* ── the minutes: from a file, with AI ──────────────────────────
   The real פרוטוקול tab and its real "צור פרוטוקול" dialog, with the AI card and the roadmap's
   Source → Review → Create drawn in; the result in the real OnlyOffice viewer, showing a page of
   our demo minutes laid over its document area. Nothing was saved. */
export const minutesDemo = { frames: [
  { src: "captures/new/minutes/m01-empty.png", hold: 2800, cursor: [1054, 1432], click: true,
    hint: "לשונית הפרוטוקול — עדיין ריקה." },
  /* first the familiar way: upload a file → the viewer → the full editor, with tracked changes.
     Real screens and the real OnlyOffice editor; the document on them is ours, laid over the
     frame (the file it opened is someone else's), and nothing was typed into the editor. */
  { src: "captures/new/minutes/m02-dialog.png", hold: 3000, cursor: [2187, 1345], click: true,
    hint: "נתחיל מהמוכר: מעלים קובץ קיים." },
  { src: "captures/new/minutes/u01-viewer.png", hold: 3000, cursor: [171, 408], click: true,
    hint: "הקובץ עלה — והפרוטוקול פתוח לצפייה, בתוך הישיבה." },
  { src: "captures/new/minutes/u02-editor.png", hold: 3000, cursor: [1232, 1260], click: true,
    hint: "עורך מלא, כמו Word — בתוך Boardirector." },
  { src: "captures/new/minutes/u03-insert.png", hold: 3000, cursor: [1232, 1260],
    reveal: { rect: [840, 1236, 392, 40], dur: 1600, dir: "rtl" },
    hint: "כל שינוי נרשם — במעקב שינויים." },
  { src: "captures/new/minutes/u04-strike.png", hold: 2200, cursor: [1338, 1512],
    reveal: { rect: [1028, 1490, 310, 38], dur: 900, dir: "rtl" },
    hint: "מחיקות ותוספות — הכול מסומן." },
  { src: "captures/new/minutes/u05-replace.png", hold: 2800, cursor: [1046, 1514],
    reveal: { rect: [1520, 1536, 450, 40], dur: 1700, dir: "rtl" },
    hint: "מחיקות ותוספות — הכול מסומן." },
  { src: "captures/new/minutes/u06-balloon.png", hold: 4200, cursor: [1030, 1258],
    reveal: { rect: [632, 1285, 606, 175], dur: 450 },
    hint: "רואים מי שינה, מה ומתי — ומאשרים או דוחים." },
  { src: "captures/new/minutes/m02-dialog.png", hold: 3200, cursor: [901, 813], click: true,
    hint: "ועכשיו — הדרך החדשה: צור עם AI." },
  { src: "captures/new/minutes/m03-upload.png", hold: 2600, cursor: [1600, 1174], click: true,
    hint: "שלב 1: מעלים את מה שיש — פרוטוקול, סיכומים או הקלטה." },
  { src: "captures/new/minutes/m04-uploading.png", hold: 2500, cursor: [1600, 1500],
    progress: { rect: [734, 1196, 1660, 12], dur: 1900, color: "rgb(114,43,203)", track: "rgb(235,238,242)" }, spin: [817, 1144, 30, 30],
    hint: "מעלה את הקובץ…" },
  { src: "captures/new/minutes/m05-uploaded.png", hold: 3400, cursor: [835, 1480], click: true,
    hint: "הקובץ זוהה כפרוטוקול סופי — והנוסח המקורי נשמר." },
  { src: "captures/new/minutes/m07-approve.png", hold: 5600, cursor: [621, 1654], click: true,
    reveal: { rect: [500, 538, 1504, 1036], dur: 1800, cover: "#fff" },
    hint: "ה-AI חילץ נושאים, החלטות ומשימות — ומאשרים כל אחד. הכול ניתן לעריכה." },
  { src: "captures/new/minutes/m08-create.png", hold: 2400, cursor: [1000, 1300], shimmer: [94, 472, 1920, 92],
    hint: "בונה את הפרוטוקול…" },
  /* the result: regular manual minutes (the real list, its rows from the AI's topics) — topics nobody
     approved are marked as AI drafts; then topic 1 opens on its discussion, decisions and task */
  { src: "captures/new/minutes/m09-done.png", hold: 5200, cursor: [1942, 753], click: true,
    reveal: { rect: [60, 470, 1990, 1060], dur: 1400, cover: "#fff" },
    hint: "והפרוטוקול מוכן — נושא אחרי נושא. מה שלא אישרתם מסומן כטיוטת AI." },
  { src: "captures/new/minutes/m10-topic.png", hold: 4200, cursor: [1500, 1240],
    hint: "בכל נושא: הדיון וההחלטות — פרוטוקול רגיל, שאפשר לערוך ידנית." },
  { src: "captures/new/minutes/m11-task.png", hold: 4600, cursor: [1379, 1654],
    hint: "והמשימות כבר משויכות — עם אחראי ותאריך יעד." },
] };

/* ── the minutes, out for comments and approval ──────────────────
   The real stages popover, send-for-comments dialog, comments tracking, final-approval dialog and
   approvals tracking, on the same meeting after it took place. The sends were answered before they
   reached the server; the two tracking lists are the meeting's attendees with demo statuses. */
export const minutesSendDemo = { frames: [
  { src: "captures/new/minutes/n01-list.png", hold: 2600, cursor: [460, 260], click: true,
    hint: "הפרוטוקול מוכן? מכאן הוא יוצא לדירקטורים." },
  { src: "captures/new/minutes/n02-stages.png", hold: 2800, cursor: [874, 739], click: true,
    hint: "טיוטה, אישור סופי, סגור — ובשלב הראשון: להערות." },
  { src: "captures/new/minutes/n03-send-comments.png", hold: 3000, cursor: [1150, 1420], click: true,
    hint: "תאריך יעד, ולמי לשלוח — לכל המשתתפים או לפי נושא." },
  { src: "captures/new/minutes/n04-comments-tracking.png", hold: 3800, cursor: [1650, 1120],
    hint: "ורואים מי כבר עבר על הפרוטוקול — ומי עוד לא." },
  { src: "captures/new/minutes/n05-stages2.png", hold: 2600, cursor: [570, 771], click: true,
    hint: "ההערות טופלו? מסמנים לאישור סופי." },
  { src: "captures/new/minutes/n06-final.png", hold: 3000, cursor: [1144, 1415], click: true,
    hint: "שולחים לאישור — לכל המשתתפים בלחיצה אחת." },
  { src: "captures/new/minutes/n07-approvals.png", hold: 4800, cursor: [1700, 1150],
    hint: "ומעקב אישורים: מי אישר, מי עוד ממתין." },
] };

/* ── global search ───────────────────────────────────────────────
   The real app-wide search (the sidebar's חיפוש), opened over the meeting's minutes. The query was answered
   locally with demo results from the deck's own story — the hedging decision, its tasks, the minutes file. */
const SR = "captures/new/search/";
export const searchDemo = { frames: [
  { src: SR + "01-page.png", hold: 2600, cursor: [2986, 234], click: true,
    hint: "מכל מקום במערכת — חיפוש אחד." },
  { src: SR + "02-open.png", hold: 2200, cursor: [2620, 420],
    hint: "משימות, קבצים, ישיבות, נושאים וועדות — בתיבה אחת." },
  { src: SR + "03-results.png", hold: 4400, cursor: [2039, 1555], click: true,
    reveal: [{ rect: [2560, 395, 180, 50], dir: "rtl", dur: 600 }, { rect: [330, 600, 1990, 1105], dur: 1100, delay: 900, cover: "#fff" }],
    hint: "מקלידים ״גידור״ — ומקבלים הכול, מקובץ לפי סוג." },
  { src: SR + "04-matches.png", hold: 3400, cursor: [1700, 1640],
    reveal: { rect: [368, 1575, 1904, 130], dur: 500 },
    hint: "וגם בתוך המסמכים — כל מקום בקובץ שבו המילה מופיעה." },
  { src: SR + "05-scrolled.png", hold: 4000, cursor: [1880, 1395],
    scroll: { rect: [368, 661, 1904, 1044], d: 680, dur: 1000 },
    hint: "והישיבה והנושאים שבהם זה נדון — במקום אחד." },
] };

/* ── the work plan ──────────────────────────────────────────────
   The real /workplan page over a clean demo dataset (52 topics, 8 committees) that the counters,
   the chart and the rows all agree on. Committees open and close, the chart switches and filters. */
/* motion matches the page: opening a committee pushes the rows under it down (closing pulls them back up),
   הצג פירוט pushes the list down by the chart's height, and the bars rise from the axis whenever the data changes */
const WP = "captures/new/workplan/", WP_BARS = [90, 760, 2560, 186];
export const workplanDemo = { frames: [
  { src: WP + "01-collapsed.png", hold: 3400, cursor: [2612, 756], click: true,
    hint: "תוכנית העבודה של 2026: כל הנושאים לפי ועדה — מה באיחור, מה מתקרב ומה כבר נדון." },
  { src: WP + "02-fin-open.png", hold: 3800, cursor: [2612, 756], click: true, push: { y: 808, h: 1240, dur: 1100 },
    hint: "פותחים ועדה — וכל הנושאים שלה, עם סטטוס ותאריך נדרש לדיון." },
  { src: WP + "03-collapsed.png", hold: 1700, cursor: [2612, 964], click: true, push: { y: 808, h: 1240, dur: 800, dir: "up" },
    hint: "ועוברים לוועדה הבאה." },
  { src: WP + "04-audit-open.png", hold: 3800, cursor: [173, 504], click: true, push: { y: 1016, h: 1100, dur: 1050 },
    hint: "ועדת ביקורת: מה באיחור, מה מתקרב ליעד ומה ממתין לשיבוץ." },
  { src: WP + "05-breakdown.png", hold: 4200, cursor: [117, 636], click: true, push: { y: 558, h: 426, dur: 900 },
    reveal: { rect: WP_BARS, dur: 1000, delay: 1250, dir: "up", cover: "#fff" },
    hint: "הצג פירוט: הדיונים לאורך השנה, לפי חודשים." },
  { src: WP + "06-quarters.png", hold: 3400, cursor: [286, 326], click: true,
    reveal: { rect: WP_BARS, dur: 1000, delay: 380, dir: "up", cover: "#fff", fade: true },
    hint: "ולפי רבעונים." },
  { src: WP + "07-filter-open.png", hold: 2300, cursor: [254, 631], click: true, reveal: { rect: [0, 372, 548, 592], dur: 450 },
    hint: "מסננים לוועדה אחת…" },
  { src: WP + "08-filtered.png", hold: 4600, cursor: [1400, 640], push: { y: 1234, h: 720, dur: 900 },
    reveal: { rect: WP_BARS, dur: 1000, delay: 420, dir: "up", cover: "#fff", fade: true },
    hint: "…והמספרים, הגרף והרשימה — לוועדה הזו בלבד." },
] };

/* ── what's next: voting, compensation, smart AI reminders ──────
   Not in the product yet: the real meeting page, reports shell and notifications panel, with the
   upcoming screens drawn in (voting per the Jira roadmap's Polls & voting; compensation per the
   bd-ms back-end domain — the amounts are samples; reminders per the AI roadmap). */
export const votesDemo = { frames: [
  { src: "captures/new/next/v01-votes.png", hold: 3000, cursor: [233, 1029], click: true,
    hint: "הצבעות בתוך הישיבה: לכל נושא — שאלה, אופן סגירה ותוצאה." },
  { src: "captures/new/next/v02-live.png", hold: 3200, cursor: [504, 1054], reveal: { rect: [88, 961, 1932, 720], dur: 700 },
    hint: "ההצבעה פתוחה, עם טיימר — ורואים בזמן אמת כמה כבר הצביעו." },
  { src: "captures/new/next/v03-live-6.png", hold: 2800, cursor: [215, 1042], click: true, reveal: { rect: [369, 1010, 380, 65], dur: 1400, dir: "rtl" },
    hint: "6 מתוך 7 הצביעו. מסיימים את ההצבעה." },
  { src: "captures/new/next/v04-result.png", hold: 3600, cursor: [197, 1029], click: true, reveal: { rect: [358, 991, 387, 76], dur: 1000, dir: "rtl" },
    hint: "התוצאה נרשמת מיד: 5 בעד · 1 נמנע — רוב בעד." },
  { src: "captures/new/next/v05-results.png", hold: 5000, cursor: [1600, 1700], reveal: { rect: [944, 868, 1312, 766], dur: 1400 },
    hint: "ובפירוט — מי הצביע ומה." },
] };

export const compDemo = { frames: [
  { src: "captures/new/next/05-comp-fees.png", hold: 4000, cursor: [2339, 465], click: true,
    hint: "תגמול דירקטורים: גמול לכל ישיבה לפי תעריף הוועדה והתפקיד, החזרי הוצאות וסטטוס תשלום." },
  { src: "captures/new/next/06-comp-expenses.png", hold: 2800, cursor: [1370, 702], click: true,
    hint: "החזרי הוצאות — כל בקשה עם הקבלה שלה." },
  { src: "captures/new/next/07-comp-approve.png", hold: 3600, cursor: [152, 1902], click: true, reveal: { rect: [0, 0, 1120, 2000], dur: 700, dir: "ltr" },
    hint: "כל בקשה עוברת מסלול אישור מוגדר." },
  { src: "captures/new/next/08-comp-approved.png", hold: 3600, cursor: [1600, 1400], reveal: { rect: [64, 581, 572, 273], dur: 800 },
    hint: "מאושר — ועובר לתשלום." },
] };

export const remindDemo = { frames: [
  { src: "captures/new/next/09-ntf-plain.png", hold: 2600, cursor: [422, 80],
    hint: "ההתראות של היום —" },
  { src: "captures/new/next/10-ntf-smart.png", hold: 4200, cursor: [203, 620], click: true, reveal: { rect: [30, 393, 930, 1580], dur: 1400 },
    hint: "ועכשיו גם תזכורות חכמות: ה-AI מזהה מה עלול להתפספס, ומציע מה לעשות." },
  { src: "captures/new/next/11-ntf-think.png", hold: 2200, cursor: [203, 620], reveal: { rect: [30, 680, 930, 1296], dur: 500 }, shimmer: [79, 680, 740, 250],
    hint: "מנסח תזכורת…" },
  { src: "captures/new/next/12-ntf-draft.png", hold: 4600, cursor: [190, 1101], click: true, reveal: { rect: [30, 680, 930, 1296], dur: 1600 },
    hint: "תזכורת מוכנה, מנוסחת לפי הישיבה — ונשלחת רק באישור." },
  { src: "captures/new/next/13-ntf-sent.png", hold: 3600, cursor: [1600, 1300],
    hint: "נשלח." },
] };

/* ── the dashboard, customised ─────────────────────────────────
   The real product's own layout editor ("ערוך פריסה"): the drag, the swap preview, the split, removing
   a widget to the library and "סיום" are all the app's; the save was blocked, nothing changed. */
export const dashDemo = { frames: [
  { src: "captures/new/dashboard/d01-view.png", hold: 2600, cursor: [70, 196], click: true,
    hint: "כל אחד רואה את מה שחשוב לו. לוחצים על ערוך פריסה." },
  { src: "captures/new/dashboard/d02-edit.png", hold: 2400, cursor: [2793, 1329], click: true,
    hint: "מצב עריכה. כל שורה אפשר לגרור, וכל רכיב אפשר להסתיר." },
  { src: "captures/new/dashboard/d03-drag.png", hold: 1900, cursor: [2793, 577],
    drag: { from: "captures/new/dashboard/d02-edit.png", rect: [48, 1297, 2777, 660], to: [48, 545], tilt: 0 },
    hint: "הוועדות חשובות לי יותר — גוררים אותן למעלה." },
  { src: "captures/new/dashboard/d04-dropped.png", hold: 2400, cursor: [2239, 302],
    hint: "הוועדות מתחת למספרים, והמשימות והישיבות ירדו שורה." },
  { src: "captures/new/dashboard/d05-hide.png", hold: 2000, cursor: [2239, 302], click: true,
    hint: "את המספרים אני לא צריך כל יום — מסירים אותם מהפריסה." },
  { src: "captures/new/dashboard/d06-reflow.png", hold: 3200, cursor: [99, 196], click: true, reveal: { rect: [40, 1815, 2790, 150], dur: 600, dir: "up" },
    hint: "לא נמחק — מחכה בספריית הרכיבים, וגוררים אותו חזרה מתי שרוצים." },
  { src: "captures/new/dashboard/d07-done.png", hold: 4200, cursor: [1600, 1700],
    hint: "סיום. הדשבורד שלי." },
] };
