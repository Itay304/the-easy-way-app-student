import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  setDoc,
  getCountFromServer,
  increment,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '../firebase.js';
import { hidesSensitive, visibleAssignment, visibleWords } from './contentFilter.js';
import { computeLevel } from './gamification.js';
import { toDateKey } from './dateUtils.js';

// ── משתמש / מוסד / כיתה ──────────────────────────────────────────────────

export async function getUserDoc(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getInstitution(institutionId) {
  const snap = await getDoc(doc(db, 'institutions', institutionId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getClass(institutionId, classId) {
  const snap = await getDoc(doc(db, 'institutions', institutionId, 'classes', classId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// ── משימות (Cloud Function קיימת בלבד) ───────────────────────────────────

// מוסד שמסנן: מילים רגישות יוצאות מ-wordIds ומהשלבים (השרת עושה את אותו הדבר; כאן — אותה תוצאה גם
// מול שרת שלא מסנן עדיין, ובלי שינוי כשהוא כבר מסנן). אותה צורת תשובה כמו httpsCallable: { data }.

const rawGetMyAssignments = httpsCallable(functions, 'getMyAssignments');

export async function callGetMyAssignments() {
  const res = await rawGetMyAssignments();
  const hide = await hideSensitiveForMe();
  if (!hide || !Array.isArray(res.data?.assignments)) return res;
  const institutionId = (await getUserDoc(auth.currentUser.uid))?.institutionId;
  const assignments = await Promise.all(
    res.data.assignments.map(async (a) => visibleAssignment(a, await rawWordsForAssignment(a, institutionId), true)),
  );
  return { ...res, data: { ...res.data, assignments } };
}

// ── "תוכן מותאם לבתי ספר דתיים" (contentFilter.js) ──────────────────────
// ההגדרה של מוסד המשתמש המחובר, פעם אחת לכל משתמש בסשן. כל טעינת מילים בקובץ הזה עוברת דרכה.

let contentPolicy = { uid: null, promise: null };

export function hideSensitiveForMe() {
  const uid = auth.currentUser?.uid || null;
  if (contentPolicy.uid !== uid || !contentPolicy.promise) {
    contentPolicy = {
      uid,
      promise: (async () => {
        if (!uid) return false;
        const user = await getUserDoc(uid);
        if (!user?.institutionId) return false;
        return hidesSensitive(await getInstitution(user.institutionId));
      })().catch(() => false),
    };
  }
  return contentPolicy.promise;
}

export async function getWordListMeta(listId) {
  const snap = await getDoc(doc(db, 'word_lists', listId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// מילי רשימה גלובלית כפי שהם ב-Firestore (לא מסוננים) — נשמרים לסשן, כי גם getMyAssignments צריך אותם
const rawListCache = new Map();

function rawWordsForList(listId) {
  if (!rawListCache.has(listId)) {
    rawListCache.set(
      listId,
      getDocs(collection(db, 'word_lists', listId, 'words'))
        .then((snap) => snap.docs.map((d) => ({ id: d.id, sourceListId: listId, ...d.data() })))
        .catch((err) => {
          rawListCache.delete(listId);
          throw err;
        }),
    );
  }
  return rawListCache.get(listId);
}

export async function getWordsForList(listId) {
  return visibleWords(await rawWordsForList(listId), await hideSensitiveForMe());
}

/**
 * מילות משימה — מרשימה גלובלית (word_lists, רשימות ה-Band) או מרשימה מוסדית
 * (institutions/{inst}/customLists). listSource נכתב על משימות חדשות (createAssignment);
 * במשימות ישנות בלי השדה: קודם word_lists, ואם אין שם כלום — הרשימות המוסדיות.
 */
export async function getWordsForAssignment(assignment, institutionId) {
  return visibleWords(await rawWordsForAssignment(assignment, institutionId), await hideSensitiveForMe());
}

async function rawWordsForAssignment(assignment, institutionId) {
  if (assignment.listSource !== 'custom') {
    const words = await rawWordsForList(assignment.listId);
    if (words.length > 0 || assignment.listSource === 'global') return words;
  }
  if (!institutionId) return [];
  const snap = await getDocs(collection(db, 'institutions', institutionId, 'customLists', assignment.listId, 'words'));
  return snap.docs.map((d) => ({ id: d.id, sourceListId: assignment.listId, ...d.data() }));
}

// ── מאגר מילים גלובלי (כל word_lists) — למסיחות במבחן/נכון-לא-נכון, כדי
// שלא יהיה אפשר "לנחש לפי הקשר" מתוך המילים הצרות של המשימה בלבד.
// נשמר ב-cache ברמת ה-module (לא state) — סשן דפדפן אחד, לא רוצים
// לשלוף מחדש אלפי מסמכים בכל מעבר בין מודולי תרגול. ─────────────────────

let globalWordPoolCache = null; // { hide, words } — לפי הגדרת המוסד של המשתמש המחובר

export async function getGlobalWordPool() {
  const hide = await hideSensitiveForMe();
  if (globalWordPoolCache?.hide === hide) return globalWordPoolCache.words;
  const listsSnap = await getDocs(collection(db, 'word_lists'));
  const listIds = listsSnap.docs.map((d) => d.id);
  const wordArrays = await Promise.all(listIds.map((id) => rawWordsForList(id)));
  // מוסד שמסנן: מילים רגישות גם לא מופיעות כמסיחים (תשובות שגויות) בשאלות
  globalWordPoolCache = { hide, words: visibleWords(wordArrays.flat(), hide) };
  return globalWordPoolCache.words;
}

// ── progress ─────────────────────────────────────────────────────────────

export async function getAllProgress(uid) {
  const snap = await getDocs(collection(db, 'users', uid, 'progress'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ── לוח מובילים מוסדי — אותה שיטת קריאה כמו Android (client Firestore,
// אין Cloud Function ייעודית) ─────────────────────────────────────────────

export function listenTopLeaderboard(institutionId, topN, callback) {
  const q = query(
    collection(db, 'users'),
    where('institutionId', '==', institutionId),
    orderBy('totalXp', 'desc'),
    limit(topN),
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ uid: d.id, ...d.data() })));
  });
}

/** דירוג + סה"כ תלמידים באותה אוכלוסייה (institutionId==X, כל התפקידים —
 * אותה אוכלוסייה בדיוק כמו שאילתת הדירוג, כדי שהמספרים יהיו עקביים). */
export async function getRankAndTotal(institutionId, myXp) {
  const higherQ = query(
    collection(db, 'users'),
    where('institutionId', '==', institutionId),
    where('totalXp', '>', myXp),
  );
  const totalQ = query(collection(db, 'users'), where('institutionId', '==', institutionId));
  const [higherAgg, totalAgg] = await Promise.all([
    getCountFromServer(higherQ),
    getCountFromServer(totalQ),
  ]);
  return { rank: higherAgg.data().count + 1, total: totalAgg.data().count };
}

// ── הודעה מהמורה — אותו מנגנון בדיוק כמו Android (כיתה ראשונה בלבד,
// חלון 7 ימים, "נקרא" מקומי ב-localStorage כי isRead בענן לא מסונכרן
// בפועל בצד תלמיד) ─────────────────────────────────────────────────────

const ANNOUNCEMENT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const READ_PREFS_KEY = 'easylex_read_announcements';

export async function getLatestAnnouncement(institutionId, classId) {
  const q = query(
    collection(db, 'institutions', institutionId, 'classes', classId, 'announcements'),
    orderBy('createdAt', 'desc'),
    limit(1),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const docSnap = snap.docs[0];
  const data = docSnap.data();
  const createdAtMs = data.createdAt?.toMillis ? data.createdAt.toMillis() : null;
  if (createdAtMs === null || Date.now() - createdAtMs > ANNOUNCEMENT_MAX_AGE_MS) return null;
  return { id: docSnap.id, ...data, createdAtMs };
}

function getReadIds() {
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_PREFS_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

export function isAnnouncementRead(id) {
  return getReadIds().has(id);
}

export function markAnnouncementRead(id) {
  const ids = getReadIds();
  ids.add(id);
  localStorage.setItem(READ_PREFS_KEY, JSON.stringify([...ids]));
}

// ── XP / רמה / streak — אותה נוסחה כמו GamificationEngine + StreakManager (Android).
// נקרא בכל שמירת ביניים של סשן (גם סשן שלא הסתיים נספר ל-XP ולרצף), ולכן XP והמונים
// נכתבים כ-increment (בטוח לשני מכשירים במקביל); רצף/ימים פעילים נקבעים לפי היום האחרון שנקרא.
// totalActiveDays/totalCorrectAttempts/totalAttemptsCount הם שדות חדשים —
// אין להם מקבילה ב-Android — נחוצים לתג "שקדן" (30 ימי תרגול סה"כ, לא
// streak רציף) ולממוצע הכיתה במצב ספרינט (ראה getClassAverageAccuracy). ──

export async function applySessionGamification(uid, { xpGained = 0, sessionCorrect = 0, sessionTotal = 0 }) {
  if (!uid || (xpGained <= 0 && sessionTotal <= 0)) return null;

  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  const current = userSnap.exists() ? userSnap.data() : {};

  const currentXp = typeof current.totalXp === 'number' ? current.totalXp : 0;
  const newXp = currentXp + xpGained; // להחזרה ולחישוב הרמה בלבד — הכתיבה עצמה היא increment
  const newLevel = computeLevel(newXp);

  const todayKey = toDateKey(Date.now());
  const lastDateStr = current.lastActiveDate;
  const currentActiveDays = typeof current.totalActiveDays === 'number' ? current.totalActiveDays : 0;
  let newStreak;
  let newTotalActiveDays = currentActiveDays;
  if (!lastDateStr) {
    newStreak = 1;
    newTotalActiveDays = currentActiveDays + 1;
  } else {
    const diffDays = Math.round(
      (new Date(todayKey) - new Date(lastDateStr)) / (24 * 60 * 60 * 1000),
    );
    if (diffDays === 0) {
      newStreak = typeof current.streak === 'number' ? current.streak : 1;
    } else if (diffDays === 1) {
      newStreak = (typeof current.streak === 'number' ? current.streak : 0) + 1;
      newTotalActiveDays = currentActiveDays + 1;
    } else {
      newStreak = 1;
      newTotalActiveDays = currentActiveDays + 1;
    }
  }

  const updates = {
    totalXp: increment(xpGained),
    level: newLevel,
    streak: newStreak,
    lastActiveDate: todayKey,
    totalActiveDays: newTotalActiveDays,
    totalCorrectAttempts: increment(sessionCorrect),
    totalAttemptsCount: increment(sessionTotal),
  };
  await setDoc(userRef, updates, { merge: true });

  return { totalXp: newXp, level: newLevel, streak: newStreak, totalActiveDays: newTotalActiveDays };
}

// ── מצב ספרינט — ממוצע דיוק כיתתי, מחושב מהשדות המצטברים שלעיל בלבד
// (ללא Cloud Function חדשה): שתי שאילתות equality על users/, לא נדרש
// אינדקס מורכב. ────────────────────────────────────────────────────────

export async function getClassAverageAccuracy(institutionId) {
  const q = query(
    collection(db, 'users'),
    where('institutionId', '==', institutionId),
    where('role', '==', 'student'),
  );
  const snap = await getDocs(q);
  let sumCorrect = 0;
  let sumTotal = 0;
  snap.docs.forEach((d) => {
    const data = d.data();
    sumCorrect += typeof data.totalCorrectAttempts === 'number' ? data.totalCorrectAttempts : 0;
    sumTotal += typeof data.totalAttemptsCount === 'number' ? data.totalAttemptsCount : 0;
  });
  return sumTotal > 0 ? sumCorrect / sumTotal : null;
}
