import { writeBatch, doc, serverTimestamp, collection, increment } from 'firebase/firestore';
import { db } from '../firebase.js';

/** תואם ProgressSyncManager.java (Android): ID = englishWord עם '/' -> '-'. */
function sanitizeDocumentId(englishWord) {
  return englishWord.replace(/\//g, '-');
}

/**
 * מילות סשן נושאות את הבסיס שלהן (_baseCorrect/_baseTotal = מה שהיה ב-progress כשהסשן נטען) —
 * withBaseline() מוסיף אותם בזמן בניית הסשן. מהם מחשבים "מה השתנה" (delta) ולא כותבים מונים מלאים.
 */
export function withBaseline(word) {
  return { ...word, _baseCorrect: word.correctAttempts || 0, _baseTotal: word.totalAttempts || 0 };
}

/**
 * ההפרש בין מצב הסשן לבין מה שכבר נכתב (flushed: englishWord -> { c, t } שנכתבו מעבר לבסיס).
 * מילה יכולה להופיע בסשן פעמיים (טעות שחוזרת בסוף הסבב) — לוקחים את הרשומה עם הכי הרבה ניסיונות.
 */
export function computeDeltas(sessionWords, flushed = new Map()) {
  const latest = new Map();
  for (const w of sessionWords) {
    if (!w || !w.englishWord) continue;
    const prev = latest.get(w.englishWord);
    if (!prev || (w.totalAttempts || 0) > (prev.totalAttempts || 0)) latest.set(w.englishWord, w);
  }
  const deltas = [];
  for (const [englishWord, w] of latest) {
    const done = flushed.get(englishWord) || { c: 0, t: 0 };
    const dTotal = (w.totalAttempts || 0) - (w._baseTotal || 0) - done.t;
    const dCorrect = (w.correctAttempts || 0) - (w._baseCorrect || 0) - done.c;
    if (dTotal <= 0) continue;
    deltas.push({ englishWord, sourceListId: w.sourceListId, wordId: w.wordId, module: w.module, lastCorrect: w.correct, dCorrect, dTotal });
  }
  return deltas;
}

/**
 * כתיבת התקדמות גלובלית (users/{uid}/progress) — merge + increment בלבד, אף פעם לא set() מלא,
 * כדי ששני מכשירים שמתרגלים במקביל לא ידרסו זה את זה. extraWrites(batch) מאפשר להוסיף לאותו batch
 * (למשל מסמך ההתקדמות במשימה — progressSync נשאר נקי מלוגיקת שלבים).
 */
export async function writeProgressDeltas(uid, deltas, { assignmentId, extraWrites } = {}) {
  if (!uid || !deltas || deltas.length === 0) return;

  const batch = writeBatch(db);
  const progressCol = collection(db, 'users', uid, 'progress');
  const moduleSessionsCol = collection(db, 'users', uid, 'moduleSessions');

  for (const d of deltas) {
    const wordKey = sanitizeDocumentId(d.englishWord);
    const progressDoc = {
      englishWord: d.englishWord,
      sourceListId: d.sourceListId,
      correctAttempts: increment(d.dCorrect),
      totalAttempts: increment(d.dTotal),
      lastPracticed: serverTimestamp(),
    };
    if (d.module) progressDoc.lastModule = d.module;
    batch.set(doc(progressCol, wordKey), progressDoc, { merge: true });

    if (d.module && typeof d.lastCorrect === 'boolean') {
      const moduleSessionDoc = { module: d.module, timestamp: serverTimestamp(), correct: d.lastCorrect, wordKey };
      if (assignmentId) moduleSessionDoc.assignmentId = assignmentId;
      batch.set(doc(moduleSessionsCol), moduleSessionDoc);
    }
  }
  if (extraWrites) extraWrites(batch);
  await batch.commit();
}

/** תאימות לאחור (SprintSession): כתיבה בסוף סשן של כל מה שנענה — עכשיו כ-delta מול הבסיס. */
export async function syncSession(uid, sessionWords, assignmentId) {
  await writeProgressDeltas(uid, computeDeltas(sessionWords), { assignmentId });
}
