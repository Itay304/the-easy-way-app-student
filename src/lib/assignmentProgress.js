import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase.js';
import { getWordListMeta } from './api.js';

/**
 * % השלמה למשימה — אותה לוגיקה בדיוק כמו StudentAssignmentsViewModel
 * (Android): "הושלם" = יש progress doc עם correctAttempts>0 לאותה מילה
 * (לא ההגדרה המחמירה יותר של isMastered — זו סיבה שונה בכוונה).
 *
 * wordIds במשימה הם Firestore doc IDs מתוך word_lists/{listId}/words,
 * לא בהכרח englishWord עצמו — לכן צריך לפענח אותם קודם (כמו ש-
 * getAssignmentProgress ב-Cloud Functions כבר עושה בצד המורה).
 *
 * @param allProgress כל users/{uid}/progress (נטען פעם אחת מחוץ לפונקציה)
 */
export async function computeAssignmentProgress(allProgress, assignment) {
  const practicedWords = new Set(
    allProgress
      .filter((p) => (p.correctAttempts || 0) > 0 && p.sourceListId === assignment.listId)
      .map((p) => p.englishWord),
  );

  if (assignment.wordIds && assignment.wordIds.length > 0) {
    const wordDocs = await Promise.all(
      assignment.wordIds.map((wordId) =>
        getDoc(doc(db, 'word_lists', assignment.listId, 'words', wordId)),
      ),
    );
    const targetWords = wordDocs
      .filter((d) => d.exists())
      .map((d) => d.data().englishWord)
      .filter(Boolean);
    const completed = targetWords.filter((w) => practicedWords.has(w)).length;
    return { completed, total: targetWords.length };
  }

  const listMeta = await getWordListMeta(assignment.listId);
  const total = listMeta?.wordCount || 0;
  return { completed: practicedWords.size, total };
}
