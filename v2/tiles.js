import { I } from "./replica.js";

/* ══════════════════════════════════════════════════════════════════
   Times are in logical order (from - to); RTL lays them out the way
   the live app shows them.

   App fragments for bento tiles that have no clean screenshot yet.
   Built from the replica's own classes (the same ones the agenda demo
   uses), in Hebrew, so they read as the app and not as an illustration.
   ══════════════════════════════════════════════════════════════════ */

const minRow = (i, title, time, discussed, decision) =>
  `<div class="lr" style="padding:12px 14px">
     <span class="grip">${I("grip-vertical")}</span>
     <span style="width:10px;color:var(--k-blue)">${I("chevron-left")}</span>
     <span class="no">${i}.</span>
     <div class="cl f1" style="gap:2px">
       <span class="tt">${title}</span>
       <span class="sb" style="direction:rtl">${time}${decision ? ` • ${I("gavel")} החלטה אחת` : ""}</span>
     </div>
     <div class="meta">
       <span class="mpill${discussed ? " ok" : ""}">${discussed ? "נדון" : "לא נדון"}${I("chevron-down")}</span>
     </div>
   </div>`;

export const MINUTES_HTML = `
<div class="cardw" style="padding:20px 28px;gap:16px;width:980px">
  <div class="tbar">
    <span class="ti">${I("users")}נוכחות</span>
    <span class="ti">${I("share-nodes")}הפצה</span>
    <span class="ti">${I("comment-dots")}הערות</span>
    <span class="ti">${I("file-circle-check")}אישורים</span>
    <span class="ti">${I("book-bookmark")}צפייה</span>
    <div class="end"><span class="minst">טיוטה${I("chevron-down")}</span></div>
  </div>
  <div class="rw" style="gap:12px">
    <div class="ph"><h3 style="font-size:18px">פרוטוקול</h3><small style="direction:rtl">5 נושאים | 02:00 שעות</small></div>
  </div>
  <div class="lst">
    ${minRow(1, "פתיחה ודברי יו״ר", "09:00 - 09:10 (10 דק)", true)}
    ${minRow(2, "אישור פרוטוקול הישיבה הקודמת", "09:10 - 09:20 (10 דק)", true, true)}
    ${minRow(3, "אישור הדוחות הכספיים לרבעון השלישי", "09:20 - 10:00 (40 דק)", true, true)}
    ${minRow(4, "דוח הביקורת הפנימית — רכש", "10:00 - 10:30 (30 דק)", false)}
  </div>
</div>`;

const roleRow = (t, on) =>
  `<div class="rw" style="padding:14px 8px;gap:16px;border-bottom:1px solid var(--k-g150)">
     <span class="f1" style="font-size:15px">${t}</span>
     <span class="cbx${on ? " on" : ""}">${on ? I("check") : ""}</span>
   </div>`;

export const ROLES_HTML = `
<div class="cardw" style="padding:22px 26px;gap:6px;width:560px">
  <div class="rw" style="gap:10px;flex-wrap:wrap;margin-bottom:10px">
    <span class="rolechip">מנהל מערכת</span>
    <span class="rolechip on">מזכירות</span>
    <span class="rolechip">דירקטורים</span>
  </div>
  ${roleRow("ועדות", true)}
  ${roleRow("ישיבות", true)}
  ${roleRow("תוכנית עבודה", true)}
  ${roleRow("דוחות", false)}
</div>`;
