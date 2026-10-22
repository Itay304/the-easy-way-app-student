// מודל "שלבים" למשימות — לוגיקה טהורה, בלי Firestore (נבדקת ב-stages.test.js עם שעון מזויף).
//
// מסמך התקדמות לתלמיד במשימה: institutions/{inst}/assignments/{aid}/students/{uid}
//   words: { [wordId]: { en, seen, n, wrong, correctDays: ['YYYY-MM-DD'], lastWrongDay, lapsedDay } }
//   sessions: { 'YYYY-MM-DD': מספר סבבים באותו יום }
// כל הימים לפי שעון ישראל (Asia/Jerusalem), לא לפי שעון המכשיר.
//
// "ידועה" (ברמת משימה; ה"נכבשה" הגלובלית — correct>=3 ו-70% — נשארת כמו שהיא):
//   תשובה נכונה ב-2 ימים שונים. טעות במילה ידועה מחזירה אותה לחזרה (lapsedDay);
//   תשובה נכונה אחת נוספת ביום מאוחר יותר מחזירה אותה ל"ידועה" — בלי איפוס.

export const STAGE_MIN = 10;
export const STAGE_MAX = 15;
export const SESSION_BASE = 16; // פריטים בסבב (חדשות + חזרה) — כ-5–7 דקות
export const SESSION_MAX_REPEATS = 4; // טעויות שחוזרות פעם נוספת באותו סבב → עד 20 שאלות
export const MAX_ASSIGNMENT_WORDS = 300;
export const HIGH_PACE_WORDS_PER_DAY = 20;
// כל מילה צריכה לפחות 2 הופעות ב-2 ימים, ולכן בסבב יציב חצי חדשות וחצי חזרה: כ-8 מילים חדשות לסבב.
export const NEW_PER_SESSION = Math.ceil(SESSION_BASE / 2);

const TZ = 'Asia/Jerusalem';
const DAY_MS = 24 * 60 * 60 * 1000;

export function dayKey(ms = Date.now()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(ms));
}

// הפרש בימים בין שני מפתחות 'YYYY-MM-DD' (b - a)
export function dayDiff(a, b) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS);
}

// ── תוכנית שלבים ─────────────────────────────────────────────────────────

// חלוקה מאוזנת לשלבים של 10–15 מילים. מחזיר את גדלי השלבים. מתחת ל-10 מילים — שלב אחד;
// 16–19 מילים — שלב אחד (אי אפשר לחלק לשניים בלי לרדת מתחת ל-10, ועדיף מעט מעל 15).
export function buildStageSizes(wordCount) {
  if (wordCount <= 0) return [];
  const count = Math.max(1, Math.min(Math.ceil(wordCount / STAGE_MAX), Math.floor(wordCount / STAGE_MIN)));
  const base = Math.floor(wordCount / count);
  const extra = wordCount % count;
  return Array.from({ length: count }, (_, i) => base + (i < extra ? 1 : 0));
}

// stagePlan שמור על המשימה ({ sizes }), או מחושב בזמן הקריאה למשימות ישנות
export function stagesFor(wordIds, stagePlan) {
  const sizes =
    stagePlan && Array.isArray(stagePlan.sizes) && stagePlan.sizes.reduce((s, x) => s + x, 0) === wordIds.length
      ? stagePlan.sizes
      : buildStageSizes(wordIds.length);
  const stages = [];
  let i = 0;
  for (const size of sizes) {
    stages.push(wordIds.slice(i, i + size));
    i += size;
  }
  return stages;
}

// ── מצב מילה ─────────────────────────────────────────────────────────────

const lastOf = (days) => (days && days.length ? [...days].sort().at(-1) : null);

export function isKnown(entry) {
  if (!entry || !entry.correctDays) return false;
  const distinct = new Set(entry.correctDays);
  if (distinct.size < 2) return false;
  return !entry.lapsedDay || lastOf(entry.correctDays) > entry.lapsedDay;
}

// מה כותבים אחרי תשובה אחת (אובייקט "לוגי"; progressSync הופך אותו ל-increment/arrayUnion)
export function answerPatch(entry, { correct, today }) {
  const patch = { seen: true, n: 1, wrong: correct ? 0 : 1 };
  if (correct) patch.correctDay = today;
  else {
    patch.lastWrongDay = today;
    if (isKnown(entry)) patch.lapsedDay = today;
  }
  return patch;
}

// החלת patch על עותק מקומי (אותה תוצאה כמו הכתיבה ב-Firestore) — לתצוגה מיידית ולבדיקות
export function applyPatch(entry = {}, patch) {
  const next = { ...entry, seen: true, n: (entry.n || 0) + patch.n, wrong: (entry.wrong || 0) + patch.wrong };
  if (patch.correctDay) next.correctDays = Array.from(new Set([...(entry.correctDays || []), patch.correctDay]));
  if (patch.lastWrongDay) next.lastWrongDay = patch.lastWrongDay;
  if (patch.lapsedDay) next.lapsedDay = patch.lapsedDay;
  return next;
}

// מילה שנראתה ועדיין לא ידועה — חוזרת לחזרה. "בעדיפות" = טעות / נשכחה / מחכה ליום השני שלה.
function reviewPriority(entry, today) {
  if (entry.lapsedDay) return 0;
  if (entry.lastWrongDay && entry.lastWrongDay >= (lastOf(entry.correctDays) || '')) return 1;
  const days = entry.correctDays || [];
  if (days.length && lastOf(days) < today) return 2; // מוכנה ליום השני
  return 3; // נכונה רק היום — עדיף מחר, אבל עדיין לא ידועה
}

// ── התקדמות בשלבים ───────────────────────────────────────────────────────

// השלב הנוכחי = הראשון שיש בו מילה שעוד לא נראתה. השלב הבא נפתח כשכל מילות הנוכחי נראו לפחות פעם אחת.
export function stageProgress(stages, words = {}) {
  const perStage = stages.map((ids) => ({
    total: ids.length,
    seen: ids.filter((id) => words[id]?.seen).length,
    known: ids.filter((id) => isKnown(words[id])).length,
  }));
  let current = perStage.findIndex((s) => s.seen < s.total);
  const allSeen = current === -1;
  if (allSeen) current = stages.length - 1;
  const totalWords = perStage.reduce((s, x) => s + x.total, 0);
  const knownWords = perStage.reduce((s, x) => s + x.known, 0);
  const seenWords = perStage.reduce((s, x) => s + x.seen, 0);
  return { perStage, current, allSeen, totalWords, knownWords, seenWords, complete: totalWords > 0 && knownWords === totalWords };
}

// ── בניית סבב ────────────────────────────────────────────────────────────

function shuffled(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// סבב: מילים חדשות מהשלב הנוכחי + מילים לחזרה (טעויות / לא ידועות / מחכות ליום השני), עד SESSION_BASE.
// החדשות קודם (הן נופלות על הכרטיסיות בתחילת התרגול המגוון), אחריהן החזרה לפי עדיפות.
export function buildSession({ stages, words = {}, today, rng = Math.random, base = SESSION_BASE }) {
  const { current } = stageProgress(stages, words);
  const newIds = stages.length ? stages[current].filter((id) => !words[id]?.seen) : [];
  const review = Object.entries(words)
    .filter(([id, e]) => e.seen && !isKnown(e) && stages.some((s) => s.includes(id)))
    .map(([id, e]) => ({ id, p: reviewPriority(e, today) }));

  // ערבוב ואז מיון יציב לפי עדיפות — אקראי בתוך כל רמת עדיפות
  const reviewSorted = shuffled(review, rng)
    .sort((a, b) => a.p - b.p)
    .map((r) => r.id);
  // עד חצי לחזרה כשיש (אחרת התור של "מחכות ליום השני" רק גדל); מקום שנשאר — משלימים מהשני
  let reviewTake = Math.min(reviewSorted.length, Math.max(Math.ceil(base / 2), base - newIds.length));
  const newTake = Math.min(newIds.length, base - reviewTake);
  reviewTake = Math.min(reviewSorted.length, base - newTake);
  const pickedNew = newIds.slice(0, newTake);
  const pickedReview = reviewSorted.slice(0, reviewTake);
  return [
    ...pickedNew.map((id) => ({ wordId: id, isNew: true })),
    ...shuffled(pickedReview, rng).map((id) => ({ wordId: id, isNew: false })),
  ];
}

// ── יעד יומי וקצב ────────────────────────────────────────────────────────

// בלי תאריך יעד: סבב אחד ביום. עם תאריך יעד: מילים חדשות ליום = שנותרו / ימים שנותרו,
// וסבבים ביום = כמה צריך כדי להספיק אותן (סבב יציב מכניס כ-NEW_PER_SESSION מילים חדשות).
export function dailyGoal({ totalWords, seenWords, dueDateMs, now = Date.now() }) {
  const remaining = Math.max(0, totalWords - seenWords);
  if (!dueDateMs) return { sessions: 1, wordsPerDay: null, daysLeft: null };
  const daysLeft = Math.max(1, dayDiff(dayKey(now), dayKey(dueDateMs)) + 1);
  const wordsPerDay = Math.ceil(remaining / daysLeft);
  return { sessions: Math.max(1, Math.ceil(wordsPerDay / NEW_PER_SESSION)), wordsPerDay, daysLeft };
}

// קצב למורה בזמן יצירת משימה: מילים חדשות ליום עד תאריך היעד, ואזהרה מעל HIGH_PACE_WORDS_PER_DAY
export function creationPace(wordCount, dueDateMs, now = Date.now()) {
  if (!dueDateMs || wordCount <= 0) return null;
  const days = dayDiff(dayKey(now), dayKey(dueDateMs)) + 1;
  if (days <= 0) return { days: 0, wordsPerDay: wordCount, tooFast: true, pastDue: true };
  const wordsPerDay = Math.ceil(wordCount / days);
  return { days, wordsPerDay, tooFast: wordsPerDay > HIGH_PACE_WORDS_PER_DAY, pastDue: false };
}

// ── סיכום יום ────────────────────────────────────────────────────────────

// מה נלמד היום ומה חוזר מחר — לפי מצב לפני הסבב ואחריו
export function daySummary(stages, before = {}, after = {}, today) {
  const ids = stages.flat();
  const becameKnown = ids.filter((id) => isKnown(after[id]) && !isKnown(before[id]));
  const firstSeen = ids.filter((id) => after[id]?.seen && !before[id]?.seen);
  const tomorrowReview = ids.filter((id) => after[id]?.seen && !isKnown(after[id]));
  return { today, becameKnown, firstSeen, tomorrowReview: tomorrowReview.length };
}
