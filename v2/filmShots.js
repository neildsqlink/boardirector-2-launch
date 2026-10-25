import { I, agToolbar, agendaHead, agRow } from "./replica.js";
import { span, out3, mix } from "./ease.js";

/* ══════════════════════════════════════════════════════════════════
   The film's four close-ups, as LIVE app — not cropped screenshots.
   Each is a function of u, seconds into its 5-second shot, returning
   replica HTML (the same classes as the agenda demo). Rows land, a ring
   fills, a card crosses the board, a committee opens.

   Every shot is a 1080×520 piece of the app, drawn at 1.35× on stage.
   Times are in logical order (from - to); RTL lays them out as the app does.
   ══════════════════════════════════════════════════════════════════ */

export const SHOT_W = 1080, SHOT_H = 520;
const card = (body) =>
  `<div class="cardw" style="width:${SHOT_W}px;height:${SHOT_H}px;padding:20px 28px;gap:16px;overflow:hidden">${body}</div>`;
const fx = (p, dy = -14) => `opacity:${p};transform:translateY(${(1 - p) * dy}px)`;
const hhmm = (m) => `${String(9 + Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const dur = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/* ── סדר יום: rows land, the hours lay themselves out, it overflows ── */
const AGENDA = [
  ["פתיחה ודברי יו״ר", 10, 0],
  ["אישור פרוטוקול הישיבה הקודמת", 10, 2],
  ["אישור הדוחות הכספיים לרבעון השלישי", 40, 4],
  ["דוח הביקורת הפנימית — רכש", 30, 3],
  ["מדיניות אבטחת מידע — סקירה רבעונית", 25, 1],
  ["סבב משתתפים ושונות", 30, 0],
];
const MEETING = 120;

export function agendaShot(u) {
  const land = (i) => 0.3 + i * 0.36;
  let at = 0;
  const rows = AGENDA.map(([t, d, a], i) => { const from = at; at += d; return { t, d, a, from, to: at, i }; });
  const shown = rows.filter((r) => u >= land(r.i) + 0.2);
  const total = shown.reduce((s, r) => s + r.d, 0);

  const b = out3(span(u, 2.75, 3.35));
  const over = Math.round((at - MEETING) * out3(span(u, 2.9, 3.7)));
  const banner = b > 0
    ? `<div style="height:${b * 50}px;opacity:${b};overflow:hidden;flex:none">
         <div class="rw" style="gap:10px;height:50px;background:#172134;color:#fff;border-radius:10px;padding:0 18px;font-size:15px">
           <span style="color:#FF7373">${I("alarm-clock")}</span>סדר היום חורג משעת סיום הישיבה ב-<b>${over} דקות</b></div></div>`
    : "";

  const lit = u > 3.9;
  const list = rows.map((r) => {
    const p = out3(span(u, land(r.i), land(r.i) + 0.55));
    if (p <= 0) return "";
    const hot = lit && r.i === rows.length - 1;
    return agRow(r.i, [r.t, `${hhmm(r.from)} - ${hhmm(r.to)} (${r.d} דק)`, r.a], {
      st: fx(p) + (hot ? ";background:#FFF8F2;box-shadow:inset 3px 0 0 #FE7501" : ""),
    });
  }).join("");

  return card(
    agToolbar() +
    agendaHead(`${shown.length} נושאים, 0 הפסקות | ${dur(total)} שעות`) +
    banner +
    `<div class="lst" style="flex:none">${list}</div>`,
  );
}

/* ── מעקב החלטות: each decision's tasks fill its ring ─────────────── */
const DECISIONS = [
  ["ועדת ביקורת", "#2EC4B6", "23/07/26", "אישור תוכנית הביקורת הפנימית ל-2027", "דש", "#F4847B", 3, 3],
  ["ועדת כספים", "#5877E6", "14/07/26", "אישור הדוחות הכספיים לרבעון השלישי", "מל", "#2EC4B6", 2, 3],
  ["דירקטוריון", "#E6A23C", "14/07/26", "אישור תקציב ההשקעות ל-2027", "אכ", "#5877E6", 1, 4],
  ["ועדת תגמול", "#B37FEB", "01/07/26", "עדכון מדיניות התגמול לנושאי משרה", "רב", "#E6A23C", 2, 2],
  ["ועדת סיכונים", "#E85D75", "01/07/26", "מדיניות אבטחת מידע — סקירה רבעונית", "דש", "#F4847B", 0, 2],
];
const C = 2 * Math.PI * 15;

function ring(frac, done, label) {
  const col = done ? "#299E46" : "#5877E6";
  return `<span style="position:relative;width:38px;height:38px;flex:none;display:grid;place-items:center">
    <svg width="38" height="38" viewBox="0 0 38 38" style="position:absolute;inset:0;transform:rotate(-90deg)">
      <circle cx="19" cy="19" r="15" fill="none" stroke="#E7E8EC" stroke-width="3"/>
      <circle cx="19" cy="19" r="15" fill="none" stroke="${col}" stroke-width="3" stroke-linecap="round"
        stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - frac)}"/></svg>
    <b style="font-size:10px;font-weight:600;color:${done ? col : "var(--k-ink)"};direction:ltr">${label}</b></span>`;
}

export function decisionsShot(u) {
  const head = `<div class="rw" style="height:40px;padding-inline:16px;gap:16px;font-size:12px;color:var(--k-g650);background:#FAFAFB;border-bottom:1px solid var(--k-g200)">
    <span style="width:150px">ועדה</span><span style="width:92px">תאריך ישיבה</span><span class="f1">החלטה</span>
    <span style="width:56px">בעלים</span><span style="width:150px">התקדמות משימות</span></div>`;
  const rows = DECISIONS.map(([com, cc, date, text, av, avc, n, of], i) => {
    const p = out3(span(u, 0.2 + i * 0.22, 0.75 + i * 0.22));
    if (p <= 0) return "";
    const f = out3(span(u, 1.3 + i * 0.28, 2.6 + i * 0.28));
    const k = Math.round(n * f), done = k === of;
    return `<div class="rw" style="height:62px;padding-inline:16px;gap:16px;border-bottom:1px solid var(--k-g200);background:#fff;${fx(p)}">
      <span class="rw" style="width:150px;gap:8px;font-size:13px"><span style="color:${cc}">${I("user-group")}</span>${com}</span>
      <span class="rw" style="width:92px;gap:6px;font-size:13px;color:var(--k-g650)">${I("calendar")}<span style="direction:ltr">${date}</span></span>
      <span class="f1" style="font-size:14px;font-weight:500">${text}</span>
      <span style="width:56px"><span class="av sm" style="background:${avc}">${av}</span></span>
      <span class="rw" style="width:150px;gap:10px">${ring(of ? (n / of) * f : 0, done, `${k}/${of}`)}
        <span style="font-size:12px;color:${done ? "#299E46" : "var(--k-g650)"}">${done ? "הושלם" : "בביצוע"}</span></span>
    </div>`;
  }).join("");
  return card(
    `<div class="rw" style="gap:12px"><div class="ph"><h3 style="font-size:18px">מעקב החלטות</h3><small>5 החלטות</small></div>
       <div class="sinp" style="width:240px;margin-inline-start:auto">${I("magnifying-glass")}חיפוש</div></div>
     <div class="lst" style="flex:none">${head}${rows}</div>`,
  );
}

/* ── משימות: a subtask is finished and the card crosses the board ─── */
const COLS = [                      // RTL: the first column is on the right
  { name: "לביצוע", n: 60, x: 726 },
  { name: "בתהליך", n: 27, x: 376 },
  { name: "הושלם", n: 24, x: 26 },
];
const COL_W = 328, CARD_H = 124, TOP = 64, GAP = 12;
const TASKS = [
  { col: 0, slot: 0, t: "איסוף וריכוז הערות חברי הוועדה", s: "לפני הישיבה הקרובה", date: "19/10/2026", av: "אש", avc: "#2EC4B6" },
  { col: 0, slot: 1, t: "מעקב אחר התקדמות פרויקטים פעילים", s: "סיכום לרבעון", date: "23/12/2026", av: "מל", avc: "#5877E6" },
  { col: 0, slot: 2, t: "הכנת דוח ועדה לדירקטוריון", s: "כולל המלצות", date: "11/11/2026", av: "אש", avc: "#2EC4B6" },
  { col: 1, slot: 0, t: "הכנת סדר יום לישיבת הוועדה", s: "מתוך תוכנית העבודה", date: "07/10/2026", av: "דש", avc: "#F4847B", sub: [1, 2], mover: true },
  { col: 1, slot: 1, t: "ארגון פעילויות הוועדה", s: "תיאום מול ההנהלה", date: "23/10/2026", av: "רב", avc: "#E6A23C", sub: [1, 2] },
  { col: 2, slot: 0, t: "הפצת פרוטוקול לחתימה", s: "ישיבה 144", date: "02/10/2026", av: "דש", avc: "#F4847B", done: true },
  { col: 2, slot: 1, t: "עדכון נוהל חתימות", s: "לאישור הוועדה", date: "28/09/2026", av: "מל", avc: "#5877E6", done: true },
];

function taskCard(c, { x, y, lift = 0, sub, done }) {
  const prog = sub ? `<div class="rw" style="gap:8px;font-size:11px;color:var(--k-g650)">
      <span style="direction:ltr">${sub[0]}/${sub[1]}</span>
      <span class="f1" style="height:5px;border-radius:3px;background:#E7E8EC;overflow:hidden">
        <span style="display:block;height:100%;width:${(sub[0] / sub[1]) * 100}%;background:#5877E6;border-radius:3px"></span></span>
      <span>תתי-משימות</span></div>` : "";
  return `<div class="cl" style="position:absolute;left:${x}px;top:${y}px;width:${COL_W - 24}px;height:${CARD_H}px;
      background:#fff;border:1px solid var(--k-g200);border-radius:10px;padding:12px 14px;gap:7px;
      box-shadow:0 ${2 + lift * 18}px ${6 + lift * 34}px rgba(23,33,52,${0.05 + lift * 0.16});
      transform:scale(${1 + lift * 0.03})">
    <div class="rw" style="gap:8px"><span class="f1 ell" style="font-size:14px;font-weight:500">${c.t}</span>
      ${done ? `<span style="color:#299E46">${I("circle-check")}</span>` : ""}</div>
    <span class="ell" style="font-size:12px;color:var(--k-g650)">${c.s}</span>
    ${prog}
    <div class="rw" style="margin-top:auto;gap:8px;font-size:12px;color:var(--k-g650)">
      <span class="av xs" style="background:${c.avc}">${c.av}</span>
      <span style="margin-inline-start:auto;direction:ltr">${c.date}</span><span style="color:#F0A445">${I("flag")}</span></div>
  </div>`;
}

export function tasksShot(u) {
  const move = span(u, 2.75, 3.8), m = out3(move);
  const landed = u >= 3.6;
  const counts = [60, landed ? 26 : 27, landed ? 25 : 24];
  const cols = COLS.map((c, i) => `
    <div class="cl" style="position:absolute;left:${c.x}px;top:0;width:${COL_W}px;height:${SHOT_H}px;background:#F6F6F9;border-radius:12px;padding:14px 12px">
      <div class="rw" style="gap:8px;font-size:15px"><b style="font-weight:600">${c.name}</b>
        <span style="color:var(--k-g650)">|</span><span style="color:var(--k-g650)">${counts[i]}</span>
        <span style="margin-inline-start:auto;color:var(--k-g650)">${I("plus")}</span></div></div>`).join("");

  const cards = TASKS.map((c, i) => {
    const p = out3(span(u, 0.25 + i * 0.16, 0.8 + i * 0.16));
    if (p <= 0) return "";
    let x = COLS[c.col].x + 12, y = TOP + c.slot * (CARD_H + GAP);
    let lift = 0, sub = c.sub, done = c.done;
    if (c.mover) {
      if (u > 2.05) sub = [u > 2.35 ? 2 : 1, 2];
      lift = Math.sin(Math.PI * move);
      x = mix(COLS[1].x, COLS[2].x, inOut2(move)) + 12;
      done = landed;
    } else if (c.col === 2) {
      y += m * (CARD_H + GAP);                       // make room at the top of הושלם
    } else if (c.col === 1 && c.slot === 1) {
      y -= m * (CARD_H + GAP);                       // close the gap it leaves
    }
    const html = taskCard(c, { x, y: y + (1 - p) * -16, lift, sub, done });
    return html.replace('style="position:absolute', `style="opacity:${p};position:absolute`);
  });
  /* the moving card is drawn last, so it passes over the column it lands in */
  const mi = TASKS.findIndex((c) => c.mover);
  const body = cols + cards.filter((_, i) => i !== mi).join("") + cards[mi];
  return `<div style="position:relative;width:${SHOT_W}px;height:${SHOT_H}px;background:#fff">${body}</div>`;
}
const inOut2 = (p) => (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2);

/* ── תוכנית עבודה: the year counts up, a committee opens ──────────── */
const STATS = [["באיחור", 2, "#FF7373"], ["מועד קרוב", 3, "#F5C04A"], ["ממתין לשיבוץ", 114, "#5877E6"], ["משובץ", 22, "#299E46"], ["נדון", 1, "#1E7A3B"]];
const COMMITTEES = [
  ["ועדת כספים", "#5877E6", 12], ["דירקטוריון", "#E6A23C", 17], ["ועדת ביקורת", "#2EC4B6", 9],
  ["ועדת סיכונים", "#E85D75", 7], ["ועדת תגמול", "#B37FEB", 4], ["ועדת אסטרטגיה", "#3E5BD8", 6],
];
const TOPICS = [
  ["אישור הדוחות הכספיים לרבעון השלישי", "רבעון 3", "משובץ", "#E6F6EC", "#299E46"],
  ["דוח הביקורת הפנימית — רכש", "רבעון 3", "באיחור", "#FDEEEE", "#D1494E"],
  ["תקציב 2027", "רבעון 4", "ממתין לשיבוץ", "#EFF4FF", "#5877E6"],
];

export function workplanShot(u) {
  const cnt = out3(span(u, 0.2, 1.5));
  const stats = STATS.map(([l, n, c]) => `<span class="rw" style="gap:7px;font-size:13px">
      <span style="width:8px;height:8px;border-radius:50%;background:${c}"></span>
      <b style="font-size:15px">${Math.round(n * cnt)}</b><span style="color:var(--k-g650)">${l}</span></span>`)
    .join('<span style="width:1px;height:20px;background:var(--k-g200)"></span>');

  const open = out3(span(u, 2.2, 2.9));
  const rows = COMMITTEES.map(([name, c, n], i) => {
    const p = out3(span(u, 0.5 + i * 0.16, 1.05 + i * 0.16));
    if (p <= 0) return "";
    const isOpen = i === 0;
    const sub = isOpen && open > 0 ? `<div style="height:${open * TOPICS.length * 46}px;overflow:hidden;background:#FCFCFE">${
      TOPICS.map(([t, q, st, bg, fg], k) => {
        const s = out3(span(u, 2.45 + k * 0.18, 2.95 + k * 0.18));
        return `<div class="rw" style="height:46px;gap:14px;padding-inline:62px 18px;border-bottom:1px solid var(--k-g150);opacity:${s};transform:translateX(${(1 - s) * 18}px)">
          <span class="f1" style="font-size:13.5px">${t}</span>
          <span style="font-size:12px;color:var(--k-g650)">${q}</span>
          <span class="pill" style="background:${bg};color:${fg};width:104px;justify-content:center">${st}</span></div>`;
      }).join("")}</div>` : "";
    return `<div style="${fx(p)}"><div class="rw" style="gap:12px;height:50px;border-bottom:1px solid var(--k-g150);padding-inline:12px;background:#fff">
        <span class="cbx"></span>
        <span style="color:var(--k-blue);display:inline-block;transform:rotate(${isOpen ? -90 * open : 0}deg)">${I("chevron-left")}</span>
        <span style="color:${c}">${I("user-group")}</span>
        <b style="font-weight:600;font-size:14.5px">${name}</b>
        <span style="font-size:12.5px;color:var(--k-g650)">${n} נושאים</span></div>${sub}</div>`;
  }).join("");

  return card(
    `<div class="rw" style="gap:18px;border:1px solid var(--k-g200);border-radius:12px;padding:14px 18px;flex:none">
       <b style="font-size:15px">תוכנית עבודה לשנת 2026</b>${stats}</div>
     <div class="utabs"><span class="on">נושאים לפי ועדה</span><span>כל הנושאים</span></div>
     <div style="flex:none">${rows}</div>`,
  );
}

/* ── AI · תשאול מסמכים וישיבות: a glimpse only — the feature comes later ─
   From the AI roadmap demo (f23): the meeting book, a question, an answer
   written live with its source, and the source lit in the document. */
const Q = "למה ירד הרווח הגולמי?";
const ANSWER = [
  ["הרווח הגולמי ירד ל-"], ["31.2%", 1], [" לעומת 33.0%, בגלל עליית עלויות התשומות ו"],
  ["הפרשה חד-פעמית של 6.1 מיליון ₪", 1], ["."],
];
const words = ANSWER.flatMap(([s, b]) => s.split(/(\s+)/).filter(Boolean).map((w) => [w, b]));

export function askShot(u) {
  const open = out3(span(u, 0.35, 0.95));
  const typed = Q.slice(0, Math.round(Q.length * span(u, 1.0, 1.7)));
  const thinking = u >= 1.8 && u < 2.4;
  const shown = Math.round(words.length * span(u, 2.4, 3.8));
  const cite = out3(span(u, 3.8, 4.15));
  const lit = out3(span(u, 3.95, 4.5));

  const answer = words.slice(0, shown).map(([w, b]) => (b ? `<b>${w}</b>` : w)).join("") +
    (shown < words.length && shown > 0 ? '<span style="display:inline-block;width:7px;height:15px;background:var(--k-ai);vertical-align:-2px;margin-inline-start:2px"></span>' : "") +
    (cite > 0 ? ` <span class="cit" style="opacity:${cite}">עמ׳ 4</span>` : "");
  const msgs = (typed ? `<div class="m-me">${typed}</div>` : "") +
    (thinking ? `<div class="m-ai"><span class="rw" style="gap:8px;color:var(--k-ai)">
        <span style="display:inline-block;transform:rotate(${u * 640}deg)">${I("spinner")}</span>מחפש במסמך…</span></div>` : "") +
    (u >= 2.4 ? `<div class="m-ai">${answer}</div>` : "") +
    (!typed ? `<div class="m-ai">אפשר לשאול כל דבר על <b>המסמך הזה</b>. התשובות רק מתוך מסמכי הישיבה, עם מקורות.</div>` : "");

  const mark = `background:linear-gradient(#EADCFB,#EADCFB) no-repeat right/${lit * 100}% 100%;border-radius:2px;padding:0 2px`;
  const page = `<div class="pg" style="width:520px;padding:40px 46px">
      <h4>דוחות כספיים — רבעון 3, 2026</h4>
      <div class="k">הוכן על ידי אגף הכספים · לדירקטוריון · עמוד 4 מתוך 46</div>
      <p><b>2.1 הכנסות.</b> ההכנסות ברבעון הסתכמו ב-412.6 מיליון ₪, עלייה של 8.4% לעומת התקופה המקבילה.</p>
      <p><span style="${mark}">שיעור הרווח הגולמי ירד ל-31.2% (רבעון 3, 2025: 33.0%) בשל עליית עלויות התשומות והפרשה חד-פעמית של 6.1 מיליון ₪.</span></p>
      <span class="ln" style="width:96%"></span><span class="ln" style="width:88%"></span><span class="ln" style="width:92%"></span>
      <p><b>2.2 מימון.</b> הוצאות המימון נטו עלו ל-18.3 מיליון ₪, בשל חשיפה דולרית שאינה מגודרת.</p>
      <span class="ln" style="width:94%"></span><span class="ln" style="width:70%"></span><span class="ln" style="width:90%"></span>
    </div>`;
  const panel = `<div class="asst" style="width:440px;flex:none;opacity:${open};transform:translateX(${(1 - open) * -40}px)">
      <div class="asst-h"><span class="ichip ai">${I("wand-magic-sparkles")}</span>תשאול מסמכים וישיבות
        <span class="rw" style="gap:14px;margin-inline-start:auto;color:var(--k-g650);font-weight:400">${I("rotate")}${I("xmark")}</span></div>
      <div class="rw" style="gap:8px;margin:12px 20px 0;font-size:12.5px;color:var(--k-g650)">התשובה מתוך:
        <span class="seg2"><span class="on">המסמך הזה</span><span>נושא 3</span><span>כל הישיבה</span></span></div>
      <div class="msgs">${msgs}</div>
      <div class="cin">שאל על המסמך הזה…<span class="snd">${I("paper-plane")}</span></div>
    </div>`;
  const btn = open > 0.5
    ? `<span class="btn sm" style="background:var(--k-ai);color:#fff">${I("wand-magic-sparkles")}תשאול מסמכים וישיבות</span>`
    : `<span class="btn ai sm">${I("wand-magic-sparkles")}תשאול מסמכים וישיבות</span>`;

  return `<div class="bk-main" style="width:${SHOT_W}px;height:${SHOT_H}px;background:#fff">
    <div class="bk-top"><span style="color:var(--k-g650)">${I("bars")}</span><span class="fic"></span>
      <div class="cl" style="gap:0"><span style="font-size:12.5px;color:#5E6471;font-weight:400">3. אישור הדוחות הכספיים לרבעון השלישי</span>
        <span>דוחות כספיים רבעון 3 2026.pdf</span></div>
      <div class="rw" style="gap:14px;margin-inline-start:auto">${btn}<span style="color:var(--k-g550)">${I("xmark")}</span></div></div>
    <div class="bk-tools"><span>${I("bars-staggered")}</span><span>${I("hand")}</span><span>${I("magnifying-glass-minus")}</span>
      <span>${I("magnifying-glass-plus")}</span><span>100%</span><span style="margin-inline-start:40px" class="on">צפייה בלבד</span>
      <span>הערות</span><span>צורות</span><span>מילוי וחתימה</span></div>
    <div class="bk-canvas" style="padding:18px;gap:18px">${page}${open > 0 ? panel : ""}</div>
  </div>`;
}
