import { writeBatch, doc, serverTimestamp, collection } from 'firebase/firestore';
import { db } from '../firebase.js';

/** תואם ProgressSyncManager.java (Android): ID = englishWord עם '/' -> '-'. */
function sanitizeDocumentId(englishWord) {
  return englishWord.replace(/\//g, '-');
}

/**
 * כותב progress בסוף session תרגול — אותה צורה בדיוק כמו Android:
 * batch אחד, .set() מלא (לא merge) לכל מילה, doc ID = המילה עצמה מסוננת.
 * sessionWords: [{ englishWord, sourceListId, correctAttempts, totalAttempts }]
 * (correctAttempts/totalAttempts הם המונים המצטברים החדשים, לא ה-delta).
 */
export async function syncSession(uid, sessionWords) {
  if (!uid || !sessionWords || sessionWords.length === 0) return;

  const batch = writeBatch(db);
  const progressCol = collection(db, 'users', uid, 'progress');

  sessionWords.forEach((w) => {
    const ref = doc(progressCol, sanitizeDocumentId(w.englishWord));
    batch.set(ref, {
      englishWord: w.englishWord,
      sourceListId: w.sourceListId,
      correctAttempts: w.correctAttempts,
      totalAttempts: w.totalAttempts,
      lastPracticed: serverTimestamp(),
    });
  });

  await batch.commit();
}
