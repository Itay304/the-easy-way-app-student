import { arrayUnion, doc, getDoc, increment, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase.js';
import { answerPatch, applyPatch, dayKey, isKnown } from './stages.js';

// מסמך ההתקדמות של תלמיד במשימה: institutions/{inst}/assignments/{aid}/students/{uid}
// (כללים: firestore.rules, סעיף 5א — התלמיד כותב רק לעצמו, המורה של הכיתה קורא).
// מפתח המילים: wordId (מזהה המסמך ברשימה) — לא englishWord, כך שאותה מילה בשתי רשימות לא מתנגשת.
export function studentProgressRef(institutionId, assignmentId, uid) {
  return doc(db, 'institutions', institutionId, 'assignments', assignmentId, 'students', uid);
}

export async function loadStudentProgress(institutionId, assignmentId, uid) {
  const snap = await getDoc(studentProgressRef(institutionId, assignmentId, uid));
  const data = snap.exists() ? snap.data() : {};
  return { words: data.words || {}, sessions: data.sessions || {} };
}

/**
 * עוקב אחרי ההתקדמות במשימה במהלך סבב: שומר עותק מקומי של המילים (לתצוגה מיידית ולסיכום),
 * ומייצר כתיבות ל-batch של sessionRecorder — merge + increment/arrayUnion בלבד (בטוח לשני מכשירים).
 * now מוזרק כדי שבדיקות יוכלו להריץ "ימים" בשעון מזויף.
 */
export function createAssignmentTracker({ institutionId, assignment, uid, initialWords = {}, now = () => Date.now() }) {
  const words = structuredClone(initialWords);
  const ref = studentProgressRef(institutionId, assignment.assignmentId, uid);
  const base = () => ({ uid, classId: assignment.classId, listId: assignment.listId, updatedAt: serverTimestamp() });

  return {
    words: () => words,

    // deltas מ-computeDeltas (מצטבר לכל מילה מאז השמירה הקודמת) → כתיבה אחת למסמך המשימה
    extraWritesFor(deltas) {
      const today = dayKey(now());
      const patch = {};
      for (const d of deltas) {
        if (!d.wordId) continue;
        const before = words[d.wordId];
        const dWrong = d.dTotal - d.dCorrect;
        const entry = { en: d.englishWord, seen: true, n: increment(d.dTotal), wrong: increment(dWrong) };
        if (d.dCorrect > 0) entry.correctDays = arrayUnion(today);
        if (dWrong > 0) {
          entry.lastWrongDay = today;
          if (isKnown(before)) entry.lapsedDay = today; // טעות במילה ידועה → חוזרת לחזרה
        }
        patch[d.wordId] = entry;

        // אותו דבר על העותק המקומי (בדיוק כמו stages.applyPatch בבדיקות)
        let next = before;
        if (dWrong > 0) next = applyPatch(next, answerPatch(next, { correct: false, today }));
        if (d.dCorrect > 0) next = applyPatch(next, answerPatch(next, { correct: true, today }));
        words[d.wordId] = { ...next, en: d.englishWord, n: (before?.n || 0) + d.dTotal, wrong: (before?.wrong || 0) + dWrong };
      }
      if (Object.keys(patch).length === 0) return null;
      return (batch) => batch.set(ref, { ...base(), lastDay: today, words: patch }, { merge: true });
    },

    // סבב שהסתיים נספר ליעד היומי ("היום: סבב 1 מתוך 1"). סבב שנקטע לא נספר — אבל ההתקדמות שלו נשמרה.
    async markSessionComplete() {
      const today = dayKey(now());
      await setDoc(ref, { ...base(), lastDay: today, sessions: { [today]: increment(1) } }, { merge: true });
      return today;
    },
  };
}
