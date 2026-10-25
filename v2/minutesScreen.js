import { I, meeting } from "./replica.js";

/* ══════════════════════════════════════════════════════════════════
   The meeting's Minutes page, built from the replica — the live page
   embeds a document editor that will not finish loading for capture.
   Same meeting and topics as the agenda demo; topic 3 is open, showing
   its discussion and the decision recorded inside it.
   ══════════════════════════════════════════════════════════════════ */

const TOPICS = [
  ["פתיחה ודברי יו״ר", "09:00 - 09:10 (10 דק)", true],
  ["אישור פרוטוקול הישיבה הקודמת", "09:10 - 09:20 (10 דק)", true, 1],
  ["אישור הדוחות הכספיים לרבעון השלישי", "09:20 - 10:00 (40 דק)", true, 1],
  ["דוח הביקורת הפנימית — רכש", "10:00 - 10:30 (30 דק)", false],
  ["מדיניות אבטחת מידע — סקירה רבעונית", "10:30 - 10:55 (25 דק)", false],
  ["סבב משתתפים ושונות", "10:55 - 11:25 (30 דק)", false],
];
const OPEN = 2;

const editorBar = () =>
  `<div class="ck"><span>${I("comment")}</span><span>${I("rotate-left")}</span><span>${I("rotate-right")}</span>
   <span>פסקה ${I("chevron-down")}</span><b>B</b><i>I</i><u>U</u>
   <span>${I("list-ul")}</span><span>${I("list-ol")}</span><span>${I("table")}</span><span>${I("link")}</span></div>`;

const row = (i, [title, time, discussed, decisions], open) =>
  `<div class="lr" style="padding:12px 14px${open ? ";background:#FCFCFE" : ""}">
     <span class="grip">${I("grip-vertical")}</span>
     <span style="width:10px;color:var(--k-blue)">${I(open ? "chevron-down" : "chevron-left")}</span>
     <span class="no">${i + 1}.</span>
     <div class="cl f1" style="gap:2px"><span class="tt">${title}</span>
       <span class="sb">${time}${decisions ? ` • ${I("gavel")} החלטה אחת` : ""}</span></div>
     <div class="meta">
       <span style="color:var(--k-g500)">${I("comment-medical")}</span>
       <span class="mpill${discussed ? " ok" : ""}">${discussed ? "נדון" : "לא נדון"}${I("chevron-down")}</span>
       <span class="kebab">${I("ellipsis-vertical")}</span></div>
   </div>`;

const opened = () =>
  `<div class="cl" style="padding:0 60px 14px 12px;gap:12px;background:#FCFCFE;border-bottom:1px solid var(--k-g200)">
     <div class="mc"><div class="mc-h">${I("comment-dots")}דיון</div>${editorBar()}
       <div class="ckb">סמנכ״לית הכספים הציגה את תוצאות הרבעון השלישי. חברי הדירקטוריון שאלו על התחזית לרבעון הרביעי
       ועל החשיפה המטבעית, והתבקשה הצעת גידור לישיבה הבאה.</div></div>
     <div class="mc"><div class="mc-h">${I("circle-check")}החלטה 1</div>${editorBar()}
       <div class="ckb">הדירקטוריון מאשר את הדוחות הכספיים לרבעון השלישי של 2026 לפרסום.
       <span class="pill p-done" style="height:22px">${I("check-to-slot")}6 בעד · 0 נגד · 1 נמנע</span></div></div>
     <div class="rw" style="justify-content:center;gap:8px;border:1px dashed #CBD5E1;border-radius:8px;padding:8px;color:var(--k-g650);font-size:13px">
       ${I("plus")}הוספת החלטה נוספת</div>
   </div>`;

export function minutesPageHtml() {
  const toolbar = `<div class="tbar">
      <span class="ti">${I("users")}נוכחות</span><span class="ti">${I("share-nodes")}הפצה</span>
      <span class="ti">${I("comment-dots")}הערות</span><span class="ti">${I("file-circle-check")}אישורים</span>
      <span class="ti">${I("book-bookmark")}צפייה</span>
      <div class="end"><span class="minst">טיוטה${I("chevron-down")}</span><span class="sep"></span>
        <span class="ic">${I("download")}</span><span class="ic">${I("gear")}</span><span class="ic">${I("expand")}</span></div></div>`;
  const head = `<div class="rw" style="gap:12px"><div class="ph"><h3 style="font-size:18px">פרוטוקול</h3>
      <small>6 נושאים | 02:25 שעות</small></div>
      <div class="rw" style="gap:10px;margin-inline-start:auto">
        <span class="btn sm" style="background:#F6F6F9;border-color:#E7E8EC">${I("clipboard-check")}סמן הכל כנדון</span>
        <span class="btn sm" style="border:1.5px solid #E7E8EC">${I("filter")}סינון</span>
        <div class="sinp" style="width:220px;height:36px">${I("magnifying-glass")}חיפוש</div></div></div>`;
  const list = `<div class="lst">${TOPICS.map((t, i) => row(i, t, i === OPEN) + (i === OPEN ? opened() : "")).join("")}</div>`;
  return meeting({ sec: "mi", content: toolbar + head + list });
}
