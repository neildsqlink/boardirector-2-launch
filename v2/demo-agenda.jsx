import { I, shell, mhdr, mmenu, agToolbar, agendaHead, agRow } from "./replica.js";

/* ══════════════════════════════════════════════════════════════════
   FEATURE DEMO · building the agenda
   On the draft meeting from the previous demo (only a draft's agenda
   can change): the empty agenda → "בניית סדר יום" with its two new AI
   options → suggested from the work plan, each topic with its reason →
   the AI draft on the agenda page → a normal agenda with times →
   reorder, and everything recalculates → it runs over, and says by how much.

   The screens and their Hebrew are the AI roadmap artifact's own
   (agEmpty7, buildAgenda7, ag7Wp, ag7Draft, ag7Done), on our meeting.
   ══════════════════════════════════════════════════════════════════ */

const MEETING = "ישיבת ועדה לבחינת הדוחות הכספיים - רבעון 4";
const SUB = "ועדה לבחינת הדוחות הכספיים · ישיבה #27 · 10/11/2026 · 15:00 - 17:30";
const START = 15 * 60, LEN = 150;                       // 15:00–17:30

const SUGGEST = [
  { t: "אישור הדוחות הכספיים לרבעון השלישי", dur: 40, k: "req", st: "מועד קרוב", due: "30/11/2026",
    why: "חייב להידון עד 30/11 — והישיבה הבאה של הוועדה רק בינואר." },
  { t: "דוח ניהול סיכונים שנתי", dur: 30, k: "req", st: "באיחור", due: "30/09/2026",
    why: "באיחור מאז 30/09/2026, ועדיין לא שובץ לאף ישיבה." },
  { t: "תוכנית הביקורת הפנימית ל-2027", dur: 30, k: "req", st: "ממתין לשיבוץ", due: "31/12/2026",
    why: "נדרש עד 31/12/2026 — וזו הישיבה האחרונה לפני המועד." },
  { t: "עדכון מדיניות התגמול לנושאי משרה", dur: 30, k: "nd",
    why: "היה על סדר היום של ישיבה #26 וסומן ״לא נדון״ בפרוטוקול." },
  { t: "אישור עסקה עם בעל עניין", dur: 20, k: "cd",
    why: "סומן ״המשך דיון״ בפרוטוקול של #26, עד לאישור ועדת הביקורת." },
];
const EXTRA = { t: "סבב משתתפים ושונות", dur: 30 };

const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const hours = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
const sum = (rows) => rows.reduce((a, r) => a + r.dur, 0);

function tag(x) {
  const m = { req: [x.st, "clipboard-list"], nd: ["לא נדון ב-#26", "rotate-left"], cd: ["המשך דיון · #26", "arrows-rotate"] }[x.k];
  const cls = x.k === "req" ? (x.st === "באיחור" ? "p-red" : "p-blue") : "p-prog";
  return `<span class="pill ${cls}" style="height:22px;gap:6px">${I(m[1])}${m[0]}</span>`;
}

/* the meeting page around whatever the agenda card shows */
const page = (content, over = "") => shell({
  nav: "meet", hdr: mhdr(MEETING, "", true),
  body: mmenu("ag") + `<div class="cardw pgc f1">${content}</div>`, over,
});

/* ── 1 · the empty agenda ── */
const empty = () => agToolbar() + agendaHead("0 נושאים, 0 הפסקות | 00:00 שעות") +
  `<div class="cl f1" style="align-items:center;justify-content:center;gap:10px;text-align:center">
     ${I("file-lines", '" style="font-size:44px;color:var(--k-g500)')}
     <span style="font-size:18px;font-weight:500">סדר היום של הישיבה ריק</span>
     <span style="color:var(--k-g650);font-size:14px">עדיין לא נוספו נושאים. הוסף נושאים כדי לבנות את סדר היום של הישיבה.</span>
     <div class="rw" style="gap:10px;margin-top:6px">
       <span class="btn" style="background:var(--k-blue);color:#fff">${I("plus")}הוסף נושא</span>
       <span class="btn ag-add" style="border:1px solid var(--k-blue);color:var(--k-blue)">${I("file-import")}הוסף סדר יום</span>
     </div></div>`;

/* ── 2 · בניית סדר יום ── */
const aiCard = (cls, icon, t, s) =>
  `<div class="rw f1 ${cls}" style="gap:14px;border:1.5px solid var(--k-ai-b);border-radius:12px;padding:16px 18px;background:linear-gradient(90deg,#FBF8FF,#fff);align-items:center">
     <div style="width:48px;height:48px;border-radius:10px;display:grid;place-items:center;background:var(--k-ai-s);color:var(--k-ai);flex:none">${I(icon, '" style="font-size:20px')}</div>
     <div class="cl f1" style="gap:3px"><span class="rw" style="gap:8px"><span class="ai-t" style="font-size:15.5px;font-weight:500">${t}</span>
       <span style="background:var(--k-ai);color:#fff;font-size:11px;font-weight:600;padding:0 7px;border-radius:5px;line-height:18px">חדש</span></span>
       <span style="font-size:12.5px;color:var(--k-g700);line-height:1.4">${s}</span></div>
     <span style="color:var(--k-ai)">${I("arrow-right", "flip")}</span></div>`;
const card = ([bg, col, icon, t, s, b]) =>
  `<div class="cl" style="width:236px;height:200px;border:1px solid var(--k-g200);border-radius:10px;align-items:center;padding:36px 14px 22px;gap:6px;text-align:center;flex:none;background:#fff">
     <div style="width:69px;height:54px;border-radius:8px;display:grid;place-items:center;margin-bottom:6px;background:${bg};color:${col}">${I(icon, '" style="font-size:26px')}</div>
     <span style="font-size:16px;font-weight:500">${t}</span><span style="font-size:12px;line-height:1.5">${s}</span>
     <span class="rw" style="margin-top:auto;gap:10px;color:${col};font-size:14px">${b}${I("arrow-right", "flip")}</span></div>`;
const build = () =>
  `<div class="ov" style="align-items:center;justify-content:center"><div class="dlg" style="width:840px;gap:18px">
     <div class="rw"><div class="cl" style="gap:2px"><span style="font-size:24px;font-weight:600">בניית סדר יום</span>
       <span style="font-size:14px;color:var(--k-g550)">בחר כיצד תרצה להתחיל</span></div><span class="xb">${I("xmark")}</span></div>
     <div class="rw" style="gap:18px">
       ${aiCard("ai-wp", "clipboard-list", "הצעה מתוכנית העבודה", "נושאים שהגיע מועדם, שלא נדונו או שדורשים המשך דיון")}
       ${aiCard("ai-doc", "file-lines", "יצירה מתיאור או מקובץ", "תארו את הישיבה או העלו מסמך")}
     </div>
     <div class="rw" style="gap:18px;justify-content:space-between">
       ${card(["rgba(231,238,255,.7)", "#5877E6", "clone", "שכפל מישיבה", "העתק סדר יום מישיבה קודמת והתאם אותו לישיבה זו", "בחר סדר יום"])}
       ${card(["#ECFDF5", "#059669", "circle-plus", "צור ידנית", "יצירת סדר יום חדש המותאם לישיבה שלך", "התחל לבנות"])}
       ${card(["#FFEDDD", "#FF963D", "bookmark", "סדרי יום שמורים", "התחל מסדר יום שנשמר בעבר", "בחר תבנית"])}
     </div></div></div>`;

/* ── 3 · הצעה מתוכנית העבודה ── */
const dialog = (title, body, foot) =>
  `<div class="ov" style="align-items:center;justify-content:center"><div class="dlg" style="width:760px;gap:16px;padding:26px 30px">
     <div class="rw" style="gap:12px"><span class="ichip ai">${I("wand-magic-sparkles")}</span>
       <div class="cl" style="gap:2px"><span style="font-size:20px;font-weight:600">${title}</span>
         <span style="font-size:13px;color:var(--k-g650)">${SUB}</span></div>
       <span class="xb" style="margin-inline-start:auto">${I("xmark")}</span></div>
     ${body}<div class="acts" style="margin-top:0">${foot}</div></div></div>`;
function suggest(d, generating) {
  const picked = SUGGEST.filter((_, i) => !d.off?.includes(i));
  const rows = SUGGEST.map((x, i) => {
    const off = d.off?.includes(i);
    return `<div class="rw wp-row" style="gap:12px;padding:12px 14px;${i ? "border-top:1px solid var(--k-g150);" : ""}${off ? "opacity:.5" : ""}">
      <span class="cbx${off ? "" : " on"}">${off ? "" : I("check")}</span>
      <div class="cl f1" style="gap:3px"><span style="font-size:14px">${x.t}</span>
        <span style="font-size:12.5px;color:var(--k-g650)">${x.due ? "נדרש עד " + x.due : "מהפרוטוקול של #26"}</span></div>
      ${tag(x)}</div>`;
  }).join("");
  const body = `<span style="font-size:13.5px;color:var(--k-g700)">נושאים שהישיבה צריכה לכסות, לפי תוכנית העבודה ופרוטוקולים קודמים. בטלו את הסימון למה שלא רוצים.</span>
    <div class="cl" style="border:1px solid var(--k-g200);border-radius:12px;overflow:hidden">${rows}</div>`;
  const foot = `<span style="font-size:13px;color:var(--k-g650);margin-inline-end:auto">${picked.length} נושאים · ${hours(sum(picked))} מתוך ${hours(LEN)} שעות</span>
    <span class="btn sec">חזור</span>
    <span class="btn pri wp-go">${generating ? `<span style="display:inline-block;animation:spin 1s linear infinite">${I("spinner")}</span>יוצר טיוטה…` : "יצירת טיוטת סדר יום"}</span>`;
  return dialog("הצעה מתוכנית העבודה", body, foot);
}

/* ── 4 · the AI draft on the agenda page ── */
function draft(d) {
  const picked = SUGGEST.filter((_, i) => !d.off?.includes(i)), mins = sum(picked);
  const rows = picked.map((x, j) => agRow(j, [x.t, "", 0], {
    st: "background:#FCFAFF", sub: `${x.dur} דק`, tag: `<span class="why-tag">${tag(x)}</span>`,
    meta: `<span style="color:var(--k-g650);padding:2px 4px">${I("xmark")}</span>`,
  }) + (d.why === j
    ? `<div class="rw" style="gap:8px;padding:8px 14px 10px;padding-inline-start:64px;font-size:13px;color:var(--k-ai);background:var(--k-ai-s);border-radius:8px">${I("wand-magic-sparkles")}${x.why}</div>`
    : "")).join("");
  const bar = `<div class="rw" style="gap:16px;border:1.5px solid var(--k-ai-b);background:linear-gradient(90deg,#FBF8FF,#fff);border-radius:12px;padding:12px 16px">
    <span class="ichip ai">${I("wand-magic-sparkles")}</span>
    <div class="cl" style="gap:4px;width:280px;flex:none"><span style="font-size:13.5px"><b style="font-weight:600">טיוטת AI</b> · ${picked.length} נושאים · ${hours(mins)} מתוך ${hours(LEN)} שעות</span>
      <span style="height:6px;border-radius:3px;background:var(--k-g150);display:block;overflow:hidden"><i style="display:block;height:100%;width:${Math.round(mins / LEN * 100)}%;background:var(--k-blue)"></i></span></div>
    <span style="font-size:13px;color:var(--k-g650);white-space:nowrap">לחצו על תגית — ותראו למה הנושא כאן</span>
    <span class="rw" style="gap:8px;margin-inline-start:auto"><span class="btn sec sm">בטל</span><span class="btn pri sm keep">שמירת סדר היום</span></span></div>`;
  return agToolbar() + agendaHead(`${picked.length} נושאים, 0 הפסקות | ${hhmm(mins)} שעות`) + bar + `<div class="lst">${rows}</div>`;
}

/* ── 5 · a normal agenda: times, reorder, overflow ── */
function agenda(d, { lit, drag, push, fresh } = {}) {
  let rows = SUGGEST.filter((_, i) => !d.off?.includes(i));
  if (d.order) rows = d.order.map((i) => rows[i]);
  if (d.extra) rows = [...rows, EXTRA];
  let at = START;
  const list = rows.map((r, i) => {
    const from = at; at += r.dur;
    const cls = [i === lit && "lit", i === drag && "drag", i === push && "push", i === fresh && "in"].filter(Boolean).join(" ");
    return agRow(i, [r.t, `${hhmm(from)} - ${hhmm(at)} (${r.dur} דק)`, 0], { cls });
  }).join("");
  const over = sum(rows) - LEN;
  const banner = over > 0
    ? `<div class="rw over" style="gap:10px;background:#172134;color:#fff;border-radius:10px;padding:13px 18px;font-size:15px">
         <span style="color:#FF7373">${I("clock")}</span>סדר היום חורג משעת סיום הישיבה ב-<b>${over} דקות</b></div>`
    : "";
  return agToolbar() + agendaHead(`${rows.length} נושאים, 0 הפסקות | ${hhmm(sum(rows))} שעות`) + banner +
    `<div class="lst" style="overflow:visible">${list}</div>`;
}
const toast = `<div class="toast" style="width:640px"><i>${I("check")}</i>סדר היום נשמר. נושאי תוכנית העבודה מופיעים עכשיו כמשובצים.</div>`;

/* ── the demo ── */
export const agendaDemo = {
  start: "s0",
  init: () => ({ off: [], why: null, order: null, extra: false }),
  states: {
    s0: { hint: "הישיבה עדיין טיוטה, וסדר היום ריק. בונים אותו.",
      view: (d) => ({ html: page(empty()), cursor: ".ag-add" }) },
    ba: { hint: "שלוש דרכים מוכרות להתחיל — ושתיים חדשות, עם AI.",
      view: (d) => ({ html: page(empty(), build()), cursor: ".ai-wp .ai-t" }) },
    wp: { hint: "ה-AI מציע את הנושאים שהישיבה צריכה לכסות — ולכל אחד, הסיבה.",
      view: (d) => ({ html: page(empty(), suggest(d)), cursor: d.off.length ? ".wp-go" : ".wp-row:nth-child(5) .cbx" }) },
    wpgen: { hint: "מסדר את הנושאים וקובע לכל אחד משך…",
      view: (d) => ({ html: page(empty(), suggest(d, true)), cursor: ".wp-go" }) },
    draft: { hint: "הטיוטה כבר על עמוד סדר היום, וכל נושא מסומן — מאיפה הוא הגיע.",
      view: (d) => ({ html: page(draft(d)), cursor: d.why === null ? ".lr:nth-child(2) .why-tag" : ".keep" }) },
    saved: { hint: "סדר יום רגיל, עם שעות. ונושאי תוכנית העבודה מסומנים עכשיו כמשובצים.",
      view: (d) => ({ html: page(agenda(d), toast), cursor: [760, 520] }) },
    grab: { hint: "היו״ר מבקש להקדים את תוכנית הביקורת —",
      view: (d) => ({ html: page(agenda(d, { drag: 2, push: 1 })), cursor: ".lr:nth-child(3) .grip" }) },
    dropped: { hint: "גוררים — וכל השעות שמתחת מתחשבות מחדש.",
      view: (d) => ({ html: page(agenda(d, { lit: 1 })), cursor: ".lr:nth-child(2) .grip" }) },
    over: { hint: "וכשסדר היום חורג משעת הסיום — המערכת אומרת בדיוק בכמה.",
      view: (d) => ({ html: page(agenda(d, { fresh: 4 })), cursor: ".over span" }) },
  },
  script: [
    ["s0", {}, 2600],
    ["ba", {}, 3400],
    ["wp", {}, 2800],
    ["wp", { off: [4] }, 2400],
    ["wpgen", {}, 1600],
    ["draft", {}, 2600],
    ["draft", { why: 1 }, 3200],
    ["saved", {}, 3200],
    ["grab", {}, 1900],
    ["dropped", { order: [0, 2, 1, 3] }, 2800],
    ["over", { extra: true }, 4200],
  ],
};
