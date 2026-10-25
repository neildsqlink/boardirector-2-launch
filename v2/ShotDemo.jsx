import { useEffect, useRef, useState } from "react";
import { T } from "../tokens.js";

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
   ══════════════════════════════════════════════════════════════════ */
export function ShotDemo({ spec, w = 1360 }) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [typed, setTyped] = useState(0);
  const [ripple, setRipple] = useState(0);
  const [go, setGo] = useState(false);            // flips one paint after a frame mounts, to start its motion
  const timers = useRef([]);
  const k = w / NAT[0];
  const f = spec.frames[i];
  const last = i === spec.frames.length - 1;

  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));

  useEffect(() => {
    setGo(false);
    let r2; const r1 = requestAnimationFrame(() => { r2 = requestAnimationFrame(() => setGo(true)); });
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
    const t = `${r.dur || 1500}ms cubic-bezier(.4,0,.6,1) 200ms`;
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
        {/* reveal: the previous screen is wiped away top to bottom, uncovering the generated content */}
        {prev && [].concat(f.reveal || []).map((r, n) => (
          <div key={`rev${i}-${n}`} style={piece(prev.src, r.rect, {
            zIndex: 2, ...(r.cover ? { backgroundImage: "none", background: r.cover } : {}), ...wipe(r, go) })} />
        ))}
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
          @property --bdxa { syntax: "<angle>"; inherits: false; initial-value: 0deg; }`}</style>
      </div>

      <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 14, padding: "8px 4px", direction: "rtl" }}>
        <span style={{ flex: 1, fontFamily: T.font, fontSize: 25, color: "rgba(255,255,255,.88)" }}>{f.hint}</span>
        <span style={{ fontFamily: T.fontEn, fontSize: 15, color: "rgba(255,255,255,.45)", direction: "ltr" }}>{i + 1} / {spec.frames.length}</span>
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
  { src: "captures/new/decisions/ai-02-drawer.png", hold: 3800, cursor: [716, 778], click: true,
    hint: "כל החלטה — עם הישיבה, הנושא והוועדה. וחדש: הצעת משימות עם AI." },
  { src: "captures/new/decisions/ai-03-think.png", hold: 2600, cursor: [716, 778], shimmer: [64, 832, 1272, 230],
    hint: "מאתר פעולות, אחראים ותאריכים בהחלטה…" },
  { src: "captures/new/decisions/ai-04-suggest.png", hold: 5200, cursor: [224, 1318], click: true, reveal: { rect: [64, 832, 1272, 550], dur: 1700 },
    hint: "לכל משימה נקבעים אחראי ותאריך יעד שניתן לשנות." },
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
  { src: "captures/new/tasks/t12-ai-menu.png", hold: 5000, cursor: [842, 1032], reveal: { rect: [656, 992, 373, 378], dur: 900 },
    hint: "שפר ניסוח, קצר, נסח באופן רשמי יותר, המר לנקודות, תרגם לעברית." },
] };

export const driveDemo = { frames: [
  { src: "captures/new/drive/01-root.png", hold: 3200, cursor: [2270, 610], click: true,
    hint: "BD Drive: כל מסמכי הארגון במקום אחד, בתיקייה לכל ועדה" },
  { src: "captures/new/drive/02-folder.png", hold: 3000, cursor: [1930, 610], click: true,
    hint: "בתיקיית הדירקטוריון יש תיקייה לכל ישיבה, ודוחות, תקציבים ופרוטוקולים" },
  { src: "captures/new/drive/03-selected.png", hold: 2800, cursor: [768, 1848], click: true,
    hint: "בוחרים קובץ ומקבלים את כל הפעולות: הורדה, העברה, תגיות, גישה ופרטים" },
  { src: "captures/new/drive/04-details.png", hold: 4400, cursor: [640, 526],
    hint: "בחלונית הפרטים רואים מי פתח, מי שינה, מי יצר ולמי יש גישה" },
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
  { src: "captures/new/minutes/m02-dialog.png", hold: 3200, cursor: [901, 813], click: true,
    hint: "לצד שלוש הדרכים המוכרות — חדש: צור עם AI." },
  { src: "captures/new/minutes/m03-upload.png", hold: 2600, cursor: [1600, 1174], click: true,
    hint: "שלב 1: מעלים את מה שיש — פרוטוקול, סיכומים או הקלטה." },
  { src: "captures/new/minutes/m04-uploading.png", hold: 1900, cursor: [1600, 1500],
    reveal: { rect: [1365, 1195, 1029, 12], dur: 1300, dir: "rtl", cover: "#EBEEF2" },
    hint: "מעלה את הקובץ…" },
  { src: "captures/new/minutes/m05-uploaded.png", hold: 3400, cursor: [835, 1480], click: true,
    hint: "הקובץ זוהה כפרוטוקול סופי — והנוסח המקורי נשמר." },
  { src: "captures/new/minutes/m06-extract.png", hold: 3800, cursor: [1300, 1300],
    reveal: [{ rect: [500, 640, 1496, 848], dur: 1700, cover: "#fff" }, { rect: [2258, 1476, 442, 12], dur: 1700, dir: "rtl", cover: "#EBEEF2" }],
    shimmer: [560, 1130, 1440, 340],
    hint: "שלב 2: ה-AI מחלץ נושאים, החלטות ומשימות. שום דבר עוד לא נשמר." },
  { src: "captures/new/minutes/m07-approve.png", hold: 5600, cursor: [621, 1654], click: true,
    reveal: { rect: [500, 538, 1504, 1036], dur: 1800, cover: "#fff" },
    hint: "שלב 3: מאשרים כל דיון, החלטה ומשימה — הכול ניתן לעריכה." },
  { src: "captures/new/minutes/m08-create.png", hold: 2400, cursor: [1000, 1300], shimmer: [94, 472, 1920, 92],
    hint: "בונה את הפרוטוקול…" },
  { src: "captures/new/minutes/06-document.png", hold: 5000, cursor: [1500, 1150],
    hint: "והפרוטוקול מוכן — כמסמך, לעריכה ולהפצה." },
] };

/* ── the work plan ──────────────────────────────────────────────
   The real /workplan page over a clean demo dataset (52 topics, 8 committees) that the counters,
   the chart and the rows all agree on. Committees open and close, the chart switches and filters. */
const WP_ROWS = [48, 704, 2644, 1248], WP_BARS = [90, 652, 2560, 292];
export const workplanDemo = { frames: [
  { src: "captures/new/workplan/01-collapsed.png", hold: 3400, cursor: [2612, 756], click: true,
    hint: "תוכנית העבודה של 2026: כל הנושאים לפי ועדה — מה באיחור, מה מתקרב ומה כבר נדון." },
  { src: "captures/new/workplan/02-fin-open.png", hold: 3600, cursor: [2612, 756], click: true, reveal: { rect: WP_ROWS, dur: 1300 },
    hint: "פותחים ועדה — וכל הנושאים שלה, עם סטטוס ותאריך נדרש לדיון." },
  { src: "captures/new/workplan/01-collapsed.png", hold: 1500, cursor: [2612, 964], click: true, reveal: { rect: WP_ROWS, dur: 900, dir: "up" },
    hint: "ועוברים לוועדה הבאה." },
  { src: "captures/new/workplan/04-audit-open.png", hold: 3600, cursor: [173, 504], click: true, reveal: { rect: WP_ROWS, dur: 1300 },
    hint: "ועדת ביקורת: מה באיחור, מה מתקרב ליעד ומה ממתין לשיבוץ." },
  { src: "captures/new/workplan/05-breakdown.png", hold: 3800, cursor: [117, 636], click: true, reveal: { rect: [42, 494, 2656, 1458], dur: 1400 },
    hint: "הצג פירוט: הדיונים לאורך השנה, לפי חודשים." },
  { src: "captures/new/workplan/06-quarters.png", hold: 3200, cursor: [286, 326], click: true, reveal: { rect: WP_BARS, dur: 1100, dir: "up" },
    hint: "ולפי רבעונים." },
  { src: "captures/new/workplan/07-filter-open.png", hold: 2200, cursor: [254, 631], click: true, reveal: { rect: [0, 372, 548, 592], dur: 500 },
    hint: "מסננים לוועדה אחת…" },
  { src: "captures/new/workplan/08-filtered.png", hold: 4400, cursor: [1300, 1500], reveal: { rect: WP_BARS, dur: 1200, dir: "up" },
    hint: "…והמספרים והגרף מתעדכנים לוועדה הזו בלבד." },
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
