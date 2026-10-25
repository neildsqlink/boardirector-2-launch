import { useState, useEffect, useCallback } from "react";
import { T } from "../tokens.js";
import { KEYFRAMES, E, D } from "../anim.jsx";
import { ParticleMorph } from "../dissolve.jsx";
import { useDemo, DemoFrame } from "./demo.jsx";
import { agendaDemo } from "./demo-agenda.jsx";
import { Migration, NextSteps, Close, BreakCard } from "./Closing.jsx";
import { ShotDemo, createMeeting, meetingFromWorkplan, decisionsDemo, tasksDemo, driveDemo, bookDemo, minutesDemo, workplanDemo, votesDemo, compDemo, remindDemo, dashDemo, meetingPage, minutesSendDemo, searchDemo } from "./ShotDemo.jsx";
import { Film, FILM_BG, filmTime, filmControl } from "./Film.jsx";
import { CUE, stopScore, muteScore } from "./score.js";
import { LayoutDashboard, CalendarDays, NotebookPen, Gavel, ListChecks, CalendarRange, FolderOpen, Search, ShieldCheck } from "lucide-react";

const W = 1920, H = 1080;
const A = (p) => `${import.meta.env.BASE_URL}${p.replace(/^\//, "")}`;
const BG = FILM_BG;

/* ══════════════════════════════════════════════════════════════════
   Boardirector 2.0 — Launch, v2

   Built the way Apple builds a software segment:
     a film (no speaker) that ends on the claim and the reveal
     → what's new: every feature on one rail
     → then feature by feature: דף הבית, then each one's chapter —
       the old way, it dissolves into the new way, a demo that plays itself.
   The rail is the table of contents. It stays on screen through every
   chapter, shrunk to a bar at the top with the current feature lit.
   ══════════════════════════════════════════════════════════════════ */

const FEATURES = [
  { k: "home", name: "דף הבית", Icon: LayoutDashboard },
  { k: "agenda", name: "ישיבות וסדר יום", Icon: CalendarDays },
  { k: "minutes", name: "פרוטוקול", Icon: NotebookPen },
  { k: "decisions", name: "מעקב החלטות", Icon: Gavel },
  { k: "tasks", name: "משימות", Icon: ListChecks },
  { k: "workplan", name: "תוכנית עבודה", Icon: CalendarRange },
  { k: "drive", name: "BD Drive", Icon: FolderOpen, en: true },
  { k: "search", name: "חיפוש", Icon: Search },
  { k: "roles", name: "הרשאות", Icon: ShieldCheck },
];

const SLIDES = [
  { id: "film", steps: 2,
    note: "Lights down. PRESS once: the film plays by itself (~56s) with its own score, and ends on the claim and the reveal. Move the mouse for the control bar (start over · pause/play · skip). Keys: Space pause/play, R start over, S skip, M mute." },
  { id: "overview", rail: "big",
    note: "What's new. The nine features arrive one by one — name them as they land. PRESS: the rail moves up to the top and we start with דף הבית." },
  { id: "look", steps: 6, rail: "home",
    note: "דף הבית — the dashboard, component by component: metrics, tasks, meetings, committees, recent documents. Each PRESS flies the camera to the next one." },
  { id: "demo-dashboard", rail: "home", shots: "dash",
    note: "And it's yours: ערוך פריסה → drag the committees row up under the numbers → remove the numbers row to the widget library (it isn't deleted) → סיום: committees on top, tasks and meetings below. Real product, nothing saved." },
  { id: "ch-meetings", steps: 1, rail: "agenda", chapter: "meetings",
    note: "Meetings and the agenda, part 1: creating a meeting." },
  { id: "demo-create", rail: "agenda", shots: "create",
    note: "The meetings list → a new meeting in three steps: details, attendees, publish + invitation → back to the list → the draft meeting's ⋮ menu (mention שכפול in a sentence) → הצג ישיבה." },
  { id: "ch-meeting-page", steps: 3, rail: "agenda", chapter: "meetingPage",
    note: "Part 2: the meeting page. PRESS: the old meeting page — one long page. PRESS: it dissolves into the 2.0 meeting page, with tabs." },
  { id: "demo-meeting", rail: "agenda", shots: "meeting",
    note: "Inside the draft meeting (the page from the comparison): משתתפים → סדר יום, empty → הוסף סדר יום → the dialog (point at the AI options) → צור ידנית → the work-plan panel: two topics by click, two by drag, then reorder — the times recalculate. A draft, because a published meeting's agenda can't change." },
  { id: "ch-book", steps: 1, rail: "agenda", chapter: "book",
    note: "The meeting book — and, new, asking it questions." },
  { id: "demo-book", rail: "agenda", shots: "book",
    note: "The real book page → NEW: שאל את ספר הישיבה → a question in plain Hebrew → the answer streams in, every claim with its page → click עמ׳ 4 and the passage is highlighted. The report is demo content; the AI panel is the roadmap's design on the real page." },
  { id: "ch-minutes", steps: 3, rail: "minutes", chapter: "minutes",
    note: "Minutes. PRESS: the old way — the protocol editor, a text box per topic, all typed by hand. PRESS: 2.0." },
  { id: "demo-minutes", rail: "minutes", shots: "minutes",
    note: "The empty minutes tab → צור פרוטוקול → first the familiar way: העלה קובץ → the uploaded file in the viewer → ערוך → the full editor (Word-like), with tracked changes and a change balloon (who / what / when, accept or reject). Then NEW: צור עם AI → upload the minutes file (detected as final minutes, original wording kept) → approve each discussion, decision and task → builds the minutes → regular minutes, topic by topic (unapproved topics marked as AI drafts) → topic 1 open: discussion, decisions, the task with owner and due date. Real screens; the AI dialogs are the roadmap's design on the real page." },
  { id: "demo-minutes-send", rail: "minutes", shots: "minutesSend",
    note: "Short: the minutes go out. Status → שלח להערות (due date, everyone or by topic) → comments tracking (who reviewed) → סמן כממתין לאישור → שלח לאישור → approvals tracking (who approved, who's pending). Real dialogs; sends were blocked, tracking statuses are demo data." },
  { id: "ch-decisions", steps: 3, rail: "decisions", chapter: "decisions",
    note: "Decision tracking. PRESS: the old table. PRESS: it dissolves into 2.0." },
  { id: "demo-decisions", rail: "decisions", shots: "decisions",
    note: "The tracker → a decision's drawer → NEW: הצע משימות (AI) → three suggested tasks with owners and dates → created and linked to the decision. The AI part is the roadmap's design, shown on the real drawer." },
  { id: "ch-tasks", steps: 3, rail: "tasks", chapter: "tasks",
    note: "Tasks. PRESS: the old list. PRESS: the 2.0 board." },
  { id: "demo-tasks", rail: "tasks", shots: "tasks",
    note: "The board (all three columns) → a task: owner, date, description → the decision it came from → status to הושלם → the board updates → filter: open tasks from decisions → NEW: create a task, type a rough description → שכתוב עם AI → the menu: improve, shorten, more formal, bullets, translate. The AI button is the roadmap's design in the real editor." },
  { id: "ch-workplan", steps: 2, rail: "workplan", chapter: "workplan",
    note: "The work plan. PRESS: the screen." },
  { id: "demo-workplan", rail: "workplan", shots: "workplan",
    note: "The 2026 work plan by committee → a committee opens, its topics with status and due date → the next one → הצג פירוט: discussions across the year, by month → by quarter → filter to one committee: the counters and the chart follow. Demo data." },
  { id: "ch-drive", steps: 2, rail: "drive", chapter: "drive",
    note: "BD Drive. PRESS: the screen." },
  { id: "demo-drive", rail: "drive", shots: "drive",
    note: "The drive → a committee folder → select a file → its details (who opened, changed, created, access). Demo data — BD Drive isn't live on product yet, don't open it live." },
  { id: "ch-search", steps: 1, rail: "search", chapter: "search",
    note: "Global search — one box for the whole system, from anywhere." },
  { id: "demo-search", rail: "search", shots: "search",
    note: "The sidebar's חיפוש, over the meeting's minutes → the empty search (categories, quick actions) → 'גידור' → results grouped by type: the tasks (with owners and links), the files with the sentence where the word appears → other matches inside the same file → scroll: the meeting and the topics. Real search UI; the results are demo data from our own story." },
  { id: "ch-roles", steps: 2, rail: "roles", chapter: "roles",
    note: "Permissions — a few words only. PRESS: the screen. Say: access comes in three layers — system permissions, the role in a committee and the role in a meeting — and the broadest one wins. A committee role applies to all its meetings, and you can invite someone to one topic only, with access to just that topic and its materials. The system admin defines the system roles and exactly what each can do." },
  { id: "ch-next", steps: 1, chapter: "next",
    note: "What's next — the upcoming features. Two big ones, then AI." },
  { id: "ch-votes", steps: 1, chapter: "votes",
    note: "Voting — coming. On the roadmap as Polls & voting: polls in the meeting, launched live, results recorded; anonymous and weighted voting." },
  { id: "demo-votes", shots: "votes",
    note: "The meeting's votes tab → topic 3 is open live, with a timer → 6 of 7 have voted → close the vote → the result is recorded (5 for · 1 abstain, majority for) → the breakdown: who voted what. Drawn to the design on the real meeting page — not in a reachable build yet." },
  { id: "ch-comp", steps: 1, chapter: "comp",
    note: "Compensation — coming: meeting fees per committee and role, expense claims with receipts, an approval chain, payment status." },
  { id: "demo-comp", shots: "comp",
    note: "Fees per director → expense claims → a claim's approval chain → approved, to payment. The amounts on screen are samples, not a tariff." },
  { id: "ch-remind", steps: 1, chapter: "remind",
    note: "Smart AI notifications and reminders — coming." },
  { id: "demo-remind", shots: "remind",
    note: "The notifications → smart reminders: what might be missed, with a suggested action → the AI drafts a reminder → sent only on approval. The 'book not opened' item is a concept." },
  { id: "migration", steps: 2, closing: "Migration",
    note: "Everything comes with you. PRESS: the four things — data and history, documents, users and permissions, committee structure — arrive one by one, each ticked." },
  { id: "close", closing: "Close",
    note: "The mark from the film, and תודה. Hold while the applause lands, then press once for the break card." },
  { id: "break", closing: "BreakCard",
    note: "Leave this up during the break. It tells the room when to come back and who is next." },
];

/* the features that already have slides — the only ones the rail links to */
const READY = new Set(SLIDES.map((s) => s.rail).filter((r) => r && r !== "big"));

/* ── the rail ────────────────────────────────────────────────────
   One row of features, drawn once at full size. On the overview it sits
   in the middle; everywhere else it is the same row scaled down to a bar
   at the top, so going from one to the other is a single move. */
const RAIL = { y: 560, top: 64, small: 0.46 };

function Rail({ mode, current, onPick, ready }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (mode === "hidden") return setShown(0);
    if (mode === "small") return setShown(FEATURES.length);
    if (shown >= FEATURES.length) return;
    const t = setTimeout(() => setShown((n) => n + 1), shown === 0 ? 700 : 200);
    return () => clearTimeout(t);
  }, [mode, shown]);

  const small = mode === "small";
  return (
    <div data-nonav style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 20 }}>
      {/* keeps the bar readable over a zoomed screen */}
      <div style={{
        position: "absolute", left: 0, right: 0, top: 0, height: 150,
        background: `linear-gradient(${BG} 55%, ${BG}00)`,
        opacity: small ? 1 : 0, transition: `opacity 600ms ${E}`,
      }} />
      <div style={{
        position: "absolute", left: 0, right: 0, top: RAIL.y, display: "flex", justifyContent: "center",
        direction: "rtl", opacity: mode === "hidden" ? 0 : 1,
        transform: small
          ? `translateY(${RAIL.top - RAIL.y}px) translateY(-50%) scale(${RAIL.small})`
          : "translateY(-50%)",
        transition: `transform 950ms ${E}, opacity 500ms ${E}`,
      }}>
        {FEATURES.map((f, i) => {
          const on = i < shown, lit = small && i === current, can = on && ready.has(f.k);
          return (
            /* a feature that has slides is a link to its first one */
            <div key={f.k} onClick={can ? (e) => { e.stopPropagation(); onPick(f.k); } : undefined} style={{
              pointerEvents: can ? "auto" : "none", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 26, padding: "0 36px",
              borderInlineStart: i ? "1px solid rgba(255,255,255,.1)" : "none",
              opacity: !on ? 0 : small && !lit ? 0.38 : 1,
              transform: on ? "none" : "translateY(22px)",
              transition: `opacity 600ms ${E}, transform 700ms ${E}`,
            }}>
              <f.Icon size={48} strokeWidth={1.25} color={T.orange} />
              <span style={{
                position: "relative", fontFamily: f.en ? T.fontEn : T.font, fontWeight: f.en ? 600 : 500,
                fontSize: 30, color: "#fff", whiteSpace: "nowrap",
              }}>
                {f.name}
                <span style={{
                  position: "absolute", left: 0, right: 0, bottom: -16, height: 5, borderRadius: 3, background: T.orange,
                  transform: `scaleX(${lit ? 1 : 0})`, transition: `transform 600ms ${E} 250ms`,
                }} />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const Overview = () => (
  <div style={{ position: "absolute", inset: 0, background: BG }}>
    <div style={{
      position: "absolute", top: 150, left: 0, right: 0, textAlign: "center", direction: "rtl",
      fontFamily: T.font, fontWeight: 700, fontSize: 72, color: "#fff", letterSpacing: "-0.02em",
      animation: `maskUp ${D.slow}ms ${E} both`,
    }}>מה חדש.</div>
  </div>
);

/* ── דף הבית: the dashboard, component by component ──────────── */
const LOOK = { w: 1440, h: 900, x: 240, y: 150, k: 0.45 };
/* the dashboard in reading order, one component per press ([x, y, w, h] in the 3200×2000 capture) */
const FOCUS = [
  { label: "דף הבית החדש." },
  { r: [75, 379, 2599, 231], label: "המספרים שחשובים, בשורה אחת." },
  { r: [762, 661, 1912, 885], label: "מה בביצוע ומה באיחור — ברגע שנכנסים." },
  { r: [75, 661, 635, 885], label: "יומן הישיבות — מה מתוכנן ומתי." },
  { r: [1402, 1597, 1272, 403], label: "כל ועדה, והישיבה הבאה שלה." },
  { r: [64, 1596, 1282, 404], label: "המסמכים שפתחת לאחרונה, במרחק לחיצה." },
];

function zoomTo(r) {
  if (!r) return "translate(0px,0px) scale(1)";
  const [x, y, w, h] = r.map((v) => v * LOOK.k);
  const z = Math.min(1800 / w, 800 / h, 2.4);       // fill the stage: a wide strip like the metrics row still gets close
  const tx = W / 2 - LOOK.x - z * (x + w / 2), ty = 600 - LOOK.y - z * (y + h / 2);   // centred below the bar
  return `translate(${tx}px,${ty}px) scale(${z})`;
}

function Look({ step }) {
  const f = FOCUS[step];
  return (
    <div style={{ position: "absolute", inset: 0, background: BG, overflow: "hidden", perspective: 2400, perspectiveOrigin: "50% 26%" }}>
      <style>{`@keyframes lookIn {
        from { transform: translateY(270px) scale(.8) rotateX(27deg); }
        to   { transform: none; } }`}</style>
      <div style={{
        position: "absolute", left: LOOK.x, top: LOOK.y, width: LOOK.w, height: LOOK.h,
        transformOrigin: "0 0", transform: zoomTo(f.r), transition: `transform 1200ms ${E}`,
      }}>
        <img src={A("captures/new/home-v2.png")} alt="" style={{
          width: "100%", height: "100%", display: "block", borderRadius: 14,
          boxShadow: "0 60px 160px rgba(0,0,0,.55)",
          animation: `lookIn 1500ms ${E} both`,
        }} />
      </div>
      <div key={step} style={{
        position: "absolute", left: 0, right: 0, bottom: 44, display: "flex", justifyContent: "center",
        animation: `riseInSm ${D.base}ms ${E} ${step ? 650 : 900}ms both`,
      }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 16, padding: "16px 32px", borderRadius: 999,
          background: "rgba(10,14,24,.78)", backdropFilter: "blur(14px)",
          border: "1px solid rgba(255,255,255,.1)", direction: "rtl",
          fontFamily: T.font, fontSize: 32, fontWeight: 500, color: "#fff",
        }}>
          <span style={{ width: 11, height: 11, borderRadius: "50%", background: T.orange }} />
          {f.label}
        </span>
      </div>
    </div>
  );
}

/* ── chapter: the title, the old way, it dissolves into 2.0 ──── */
const CHAPTERS = {
  meetings: {
    name: "ישיבות וסדר יום", title: "הישיבה הבאה\nכבר מוכנה.",
    old: "captures/old/meeting.png", now: "captures/new/meetings/meetings-list.png",
    oldLine: "כל ישיבה — עמוד אחד ארוך של קישורים, סדר יום ופרוטוקול.",
    newLine: "כל הישיבות במסך אחד — ולכל ישיבה עמוד משלה.",
  },
  meetingPage: {
    name: "ישיבות וסדר יום", title: "לכל ישיבה\nעמוד משלה.",
    old: "captures/old/meeting.png", now: "captures/new/meetings/draft-overview.png",
    oldLine: "כל ישיבה — עמוד אחד ארוך של קישורים, סדר יום ופרוטוקול.",
    newLine: "לכל ישיבה עמוד משלה — והכול בלשוניות.",
  },
  agenda: {
    name: "ישיבות וסדר יום", title: "סדר היום\nבונה את עצמו.",
    old: "captures/old/meeting-agenda.png", now: "captures/new/meetings/draft-agenda.png",   // a draft: the agenda can only change before publishing
    oldLine: "בונים את סדר היום נושא אחרי נושא.",
    newLine: "הנושאים כבר מחכים בתוכנית העבודה.",
  },
  book: {
    name: "ספר הישיבה", title: "עכשיו כל המסמכים\nחכמים יותר.",
    old: "captures/new/book/01-plain.png", now: "captures/new/book/01-plain.png",   // a title on its own (steps: 1)
    oldLine: "", newLine: "",
  },
  minutes: {
    name: "פרוטוקול", title: "פרוטוקול.\nמסודר מההתחלה עד הסוף.",
    old: "captures/old/protocol-editor.png", now: "captures/new/minutes/m10-clean.png",
    oldLine: "הפרוטוקול — תיבת טקסט לכל נושא, וכל מילה מוקלדת ידנית.",
    newLine: "כל נושא במקומו — הדיון, ההחלטות והמשימות.",
  },
  workplan: {                                    // no clean capture of the old system's work plan: one 2.0 screen
    name: "תוכנית עבודה", title: "השנה כולה,\nבמבט אחד.",
    old: "captures/new/workplan/05-breakdown.png", now: "captures/new/workplan/05-breakdown.png",
    oldLine: "כל הנושאים לפי ועדה — מה באיחור, מה מתקרב ומה כבר נדון.",
    newLine: "כל הנושאים לפי ועדה — מה באיחור, מה מתקרב ומה כבר נדון.",
  },
  decisions: {
    name: "מעקב החלטות", title: "כל החלטה,\nעד הביצוע.",
    old: "captures/old/decisions.png", now: "captures/new/decisions.png",
    oldLine: "טבלה ארוכה של החלטות, עמודות ומסננים.",
    newLine: "כל ההחלטות לפי ישיבה — ולכל אחת, המשימות שלה וההתקדמות.",
  },
  tasks: {
    name: "משימות", title: "אף משימה\nלא הולכת לאיבוד.",
    old: "captures/old/tasks.png", now: "captures/new/tasks/board-wide.png",
    oldLine: "רשימת משימות בטבלה.",
    newLine: "לוח משימות: לביצוע, בתהליך, הושלם — ומה באיחור.",
  },
  drive: {                                       // the old documents screen looked too much like 2.0: one 2.0 screen
    name: "BD Drive", title: "ניהול כל מסמכי הארגון\nבמקום אחד.",
    old: "captures/new/drive/01-root.png", now: "captures/new/drive/01-root.png",      // the drive capture's first frame
    oldLine: "תיקייה לכל ועדה ותיקייה אישית — ולכל קובץ: מי פתח, מי שינה ולמי יש גישה.",
    newLine: "תיקייה לכל ועדה ותיקייה אישית — ולכל קובץ: מי פתח, מי שינה ולמי יש גישה.",
  },
  next: {                                        // titles on their own (steps: 1)
    name: "מה הלאה", title: "הצצה\nלגרסאות הבאות.",
    old: "captures/new/next/v01-votes.png", now: "captures/new/next/v01-votes.png", oldLine: "", newLine: "",
  },
  votes: {
    name: "בקרוב · הצבעות", title: "מצביעים,\nבתוך הישיבה.",
    old: "captures/new/next/v02-live.png", now: "captures/new/next/v02-live.png", oldLine: "", newLine: "",
  },
  comp: {
    name: "בקרוב · תגמול", title: "גמול והחזרים,\nבמקום אחד.",
    old: "captures/new/next/05-comp-fees.png", now: "captures/new/next/05-comp-fees.png", oldLine: "", newLine: "",
  },
  remind: {
    name: "בקרוב · AI", title: "ה-AI שם לב,\nלפני שמשהו מתפספס.",
    old: "captures/new/next/10-ntf-smart.png", now: "captures/new/next/10-ntf-smart.png", oldLine: "", newLine: "",
  },
  search: {                                      // a title on its own (steps: 1), then the demo
    name: "חיפוש", title: "חיפוש אחד.\nבכל המערכת.",
    old: "captures/new/search/03-results.png", now: "captures/new/search/03-results.png",
    oldLine: "", newLine: "",
  },
  roles: {                                       // one slide, a few words: the title, then the screen (steps: 2)
    name: "הרשאות", title: "כל אחד רואה\nבדיוק מה שצריך.",
    old: "captures/new/roles/01-system-roles.png", now: "captures/new/roles/01-system-roles.png",
    oldLine: "שלוש שכבות: הרשאות מערכת, תפקיד בוועדה ותפקיד בישיבה.",
    newLine: "שלוש שכבות: הרשאות מערכת, תפקיד בוועדה ותפקיד בישיבה.",
  },
};
const FR = { w: 1168, h: 730, x: (W - 1168) / 2, y: 306 };

function Chapter({ s, step }) {
  const ch = CHAPTERS[s.chapter];
  const frames = useState(() => [A(ch.old), A(ch.now)])[0];
  const [settled, setSettled] = useState(0);
  const onSettled = useCallback((i) => setSettled(i), []);
  const stage = step >= 2 ? 1 : 0;
  const isNew = stage === 1 || ch.old === ch.now;      // a chapter with a single screen shows only 2.0
  useEffect(() => { setSettled((v) => (v === stage ? v : -1)); }, [stage]);

  const head = step >= 1;
  return (
    <div style={{ position: "absolute", inset: 0, background: BG, overflow: "hidden" }}>

      {/* the big title, alone */}
      <div style={{
        position: "absolute", right: 170, top: 120, bottom: 0, display: "flex", flexDirection: "column",
        justifyContent: "center", direction: "rtl", textAlign: "right",
        opacity: head ? 0 : 1, transform: head ? "translateY(-40px)" : "none",
        transition: `opacity 500ms ${E}, transform 700ms ${E}`, pointerEvents: "none",
      }}>
        <div style={{
          fontFamily: T.fontEn, fontWeight: 600, fontSize: 30, color: T.orange, marginBottom: 22,
          animation: `riseInSm ${D.base}ms ${E} 500ms both`,
        }}><span style={{ fontFamily: T.font }}>{ch.name}</span></div>
        <div style={{
          fontFamily: T.font, fontWeight: 700, fontSize: 132, lineHeight: 1.1, color: "#fff",
          whiteSpace: "pre-line", letterSpacing: "-0.02em",
          animation: `maskUp ${D.slow}ms ${E} 620ms both`,
        }}>{ch.title}</div>
      </div>

      {/* the header it becomes */}
      <div style={{
        position: "absolute", right: FR.x, top: 142, direction: "rtl", textAlign: "right",
        opacity: head ? 1 : 0, transform: head ? "none" : "translateY(16px)",
        transition: `opacity 600ms ${E} 200ms, transform 700ms ${E} 200ms`,
      }}>
        <div style={{ fontFamily: T.font, fontWeight: 600, fontSize: 24, color: T.orange }}>{ch.name}</div>
        <div style={{ fontFamily: T.font, fontWeight: 700, fontSize: 56, color: "#fff", marginTop: 4, letterSpacing: "-0.01em" }}>
          {ch.title.replace("\n", " ")}
        </div>
      </div>
      <div style={{
        position: "absolute", right: FR.x, top: 238, direction: "rtl",     // its own line, under the title
        display: "flex", alignItems: "center", gap: 16,
        opacity: head ? 1 : 0, transition: `opacity 600ms ${E} 350ms`,
      }}>
        <span key={stage} style={{
          padding: "8px 18px", borderRadius: 999, fontFamily: isNew ? T.fontEn : T.font,
          fontWeight: 600, fontSize: 22, whiteSpace: "nowrap",
          background: isNew ? `${T.orange}26` : "rgba(255,255,255,.1)", color: isNew ? T.orange : "rgba(255,255,255,.75)",
          animation: `fadeIn ${D.base}ms ${E} both`,
        }}>{isNew ? "Boardirector 2.0" : "היום"}</span>
        <span key={`l${stage}`} style={{
          fontFamily: T.font, fontSize: 28, color: "rgba(255,255,255,.82)",
          animation: `riseInSm ${D.base}ms ${E} ${stage ? 900 : 0}ms both`,
        }}>{stage ? ch.newLine : ch.oldLine}</span>
      </div>

      {/* the screen: old → particles → new */}
      <div style={{
        position: "absolute", left: FR.x, top: FR.y, width: FR.w, height: FR.h,
        borderRadius: 16, overflow: "hidden", background: "#0B0F18",
        boxShadow: "0 60px 140px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.06)",
        opacity: head ? 1 : 0, transform: head ? "none" : "translateY(70px) scale(.97)",
        transition: `opacity 700ms ${E} 250ms, transform 1000ms ${E} 250ms`,
      }}>
        <ParticleMorph frames={frames} stage={stage} nat={[3200, 2000]} W={FR.w} H={FR.h}
          dur={1900} stagger={650} onSettled={onSettled} />
        <img src={frames[0]} alt="" style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          opacity: stage === 0 && settled === 0 ? 1 : 0, transition: "opacity 140ms linear",
        }} />
        <img src={frames[1]} alt="" style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          opacity: stage === 1 && settled === 1 ? 1 : 0, transition: "opacity 140ms linear",
        }} />
      </div>
    </div>
  );
}

/* ── demos ───────────────────────────────────────────────────── */
const SHOTS = { create: createMeeting, workplan: meetingFromWorkplan, decisions: decisionsDemo, tasks: tasksDemo, drive: driveDemo, book: bookDemo, minutes: minutesDemo, workplan: workplanDemo, votes: votesDemo, comp: compDemo, remind: remindDemo, dash: dashDemo, meeting: meetingPage, minutesSend: minutesSendDemo, search: searchDemo };

const ShotSlide = ({ s }) => (
  <div style={{
    position: "absolute", inset: 0, background: BG,
    display: "flex", justifyContent: "center", paddingTop: 124,      // below the bar
  }}>
    <ShotDemo spec={SHOTS[s.shots]} w={1360} />
  </div>
);

function DemoSlide() {
  const demo = useDemo(agendaDemo, { autostart: true });
  return (
    <div style={{
      position: "absolute", inset: 0, background: BG,
      display: "flex", justifyContent: "center", paddingTop: 124,      // below the bar
    }}>
      <DemoFrame demo={demo} w={1360} dark />
    </div>
  );
}

const Note = ({ text }) => text ? (
  <div style={{
    position: "absolute", bottom: 18, left: 120, right: 120, zIndex: 50,
    padding: "12px 18px", border: `1px dashed ${T.orange}66`, borderRadius: 9,
    background: "rgba(5,8,15,.86)", color: "rgba(255,255,255,0.7)",
    fontFamily: T.fontEn, fontSize: 15, direction: "ltr", textAlign: "left",
  }}><b style={{ color: T.orange }}>NOTE · </b>{text}</div>
) : null;

/* ── shell ───────────────────────────────────────────────────── */
export default function Presentation() {
  const [i, setI] = useState(0);
  const [step, setStep] = useState(0);
  const [show, setShow] = useState(false);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / W, window.innerHeight / H));
    fit(); window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  const s = SLIDES[i];
  const railMode = s.rail === "big" ? "big" : s.rail ? "small" : "hidden";
  const railAt = FEATURES.findIndex((f) => f.k === s.rail);

  const next = useCallback(() => {
    if (SLIDES[i].id === "film" && step === 1 && filmTime() < CUE.end) return;   // the film is not interrupted
    const cur = SLIDES[i];
    if (cur.steps && step < cur.steps - 1) return setStep(step + 1);
    if (i < SLIDES.length - 1) { setI(i + 1); setStep(0); }
  }, [i, step]);
  const prev = useCallback(() => {
    if (SLIDES[i].id === "film" && step === 1) stopScore(0.4);
    if (step > 0) return setStep(step - 1);
    if (i > 0) { setI(i - 1); setStep(0); }
  }, [i, step]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === "BUTTON") return;
      const k = e.key.toLowerCase();
      const inFilm = SLIDES[i].id === "film" && step === 1;
      if (inFilm && (e.key === " " || k === "p")) { e.preventDefault(); filmControl.toggle(); }    // pause / play
      else if (inFilm && k === "r") filmControl.restart();
      else if (inFilm && k === "s") filmControl.skip();
      else if (["ArrowLeft", "ArrowDown", "PageDown", " ", "Enter"].includes(e.key)) { e.preventDefault(); next(); }
      else if (["ArrowRight", "ArrowUp", "PageUp"].includes(e.key)) { e.preventDefault(); prev(); }
      else if (e.key === "Home") { stopScore(0.4); setI(0); setStep(0); }
      else if (k === "b") setShow((v) => !v);
      else if (k === "m") muteScore();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, i, step]);

  /* mouse: left click forward, right click back — except inside a demo,
     where a click belongs to the demo */
  const onClick = (e) => {
    if (e.target.closest?.("[data-nonav], button")) return;
    next();
  };
  const onContext = (e) => {
    e.preventDefault();
    if (e.target.closest?.("[data-nonav]")) return;
    prev();
  };

  return (
    <div onClick={onClick} onContextMenu={onContext} style={{
      position: "fixed", inset: 0, background: "#000",
      display: "flex", alignItems: "center", justifyContent: "center",
      userSelect: "none",                      // the film hides and shows the cursor itself
    }}>
      <div style={{
        width: W, height: H, flex: "0 0 auto",
        transform: `scale(${scale})`, transformOrigin: "center",
        position: "relative", overflow: "hidden", background: BG,
      }}>
        <style>{KEYFRAMES}</style>
        <div key={s.id} style={{ position: "absolute", inset: 0 }}>
          {s.id === "film"        && <Film playing={step === 1} />}
          {s.id === "overview"    && <Overview />}
          {s.id === "look"        && <Look step={step} />}
          {s.id.startsWith("ch-") && <Chapter s={s} step={step} />}
          {s.id === "demo-agenda" && <DemoSlide />}
          {s.shots && <ShotSlide s={s} />}
          {s.closing && (() => { const C = { Migration, NextSteps, Close, BreakCard }[s.closing]; return <C step={step} />; })()}
        </div>
        <Rail mode={railMode} current={railAt} ready={READY} onPick={(k) => {
          const to = SLIDES.findIndex((x) => x.rail === k);
          if (to >= 0) { setI(to); setStep(0); }
        }} />
        {show && <Note text={s.note} />}
        {show && (
          <div style={{
            position: "absolute", top: 22, left: 36, fontFamily: T.fontEn, fontSize: 16, zIndex: 50,
            color: "rgba(255,255,255,.35)", direction: "ltr",
          }}>{i + 1} / {SLIDES.length} · {s.id}{s.steps ? ` · beat ${step + 1}/${s.steps}` : ""}</div>
        )}
      </div>
    </div>
  );
}
