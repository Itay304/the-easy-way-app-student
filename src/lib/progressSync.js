import { writeBatch, doc, serverTimestamp, collection } from 'firebase/firestore';
import { db } from '../firebase.js';

/** תואם ProgressSyncManager.java (Android): ID = englishWord עם '/' -> '-'. */
function sanitizeDocumentId(englishWord) {
  return englishWord.replace(/\//g, '-');
}

/**
 * כותב progress בסוף session תרגול — אותה צורה בדיוק כמו Android:
 * batch אחד, .set() מלא (לא merge) לכל מילה, doc ID = המילה עצמה מסוננת.
 * sessionWords: [{ englishWord, sourceListId, correctAttempts, totalAttempts,
 * module?, correct? }] (correctAttempts/totalAttempts הם המונים המצטברים
 * החדשים, לא ה-delta). module/correct מגיעים מהמודול עצמו (ר' FlashcardsModule
 * וכו') רק על מילים שבאמת נענו בסשן הזה — מילים שנשארו לא-נגועות (יציאה
 * מוקדמת מהסשן) לא יקבלו אותם, ולכן גם לא ייכתבו ל-moduleSessions.
 * ב-VariedModule כל מילה יכולה לקבל module שונה (המודול שהיה פעיל
 * כשהיא נענתה), לכן module נקבע per-word ולא כפרמטר אחד לכל הסשן.
 * assignmentId: נשלף פעם אחת ברמת הסשן (PracticeSession.jsx, מגיע מ-
 * useParams) ומצורף לכל מסמכי moduleSessions של הסשן הזה — לא רלוונטי
 * ל-SprintSession (לא קשור למשימה בודדת, ר' שם), ולכן undefined שם.
 */
export async function syncSession(uid, sessionWords, assignmentId) {
  if (!uid || !sessionWords || sessionWords.length === 0) return;

  const batch = writeBatch(db);
  const progressCol = collection(db, 'users', uid, 'progress');
  const moduleSessionsCol = collection(db, 'users', uid, 'moduleSessions');

  sessionWords.forEach((w) => {
    const wordKey = sanitizeDocumentId(w.englishWord);
    const ref = doc(progressCol, wordKey);
    const progressDoc = {
      englishWord: w.englishWord,
      sourceListId: w.sourceListId,
      correctAttempts: w.correctAttempts,
      totalAttempts: w.totalAttempts,
      lastPracticed: serverTimestamp(),
    };
    if (w.module) progressDoc.lastModule = w.module;
    batch.set(ref, progressDoc);

    if (w.module && typeof w.correct === 'boolean') {
      const moduleSessionDoc = {
        module: w.module,
        timestamp: serverTimestamp(),
        correct: w.correct,
        wordKey,
      };
      if (assignmentId) moduleSessionDoc.assignmentId = assignmentId;
      batch.set(doc(moduleSessionsCol), moduleSessionDoc);
    }
  });

  await batch.commit();
}
