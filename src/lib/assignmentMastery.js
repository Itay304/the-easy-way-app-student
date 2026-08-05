import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase.js';
import { getWordListMeta } from './api.js';
import { isMastered } from './gamification.js';

/**
 * "% נכבש" למשימה — המקור היחיד לחישוב התקדמות במשימה בכל האפליקציה
 * (Home, Practice, Profile, Statistics, SessionSummary). "נכבש" =
 * isMastered() — correctAttempts>=3 ויחס הצלחה>=70%, לא סתם ניסיון בודד
 * שהצליח — בדיוק כמו InstitutionalStatsViewModel/Word.isMastered()
 * ב-Android.
 */
export async function computeAssignmentMastery(allProgress, assignment) {
  const progressByWord = new Map(
    allProgress
      .filter((p) => p.sourceListId === assignment.listId)
      .map((p) => [p.englishWord, p]),
  );

  let targetWords;
  if (assignment.wordIds && assignment.wordIds.length > 0) {
    const wordDocs = await Promise.all(
      assignment.wordIds.map((wordId) =>
        getDoc(doc(db, 'word_lists', assignment.listId, 'words', wordId)),
      ),
    );
    targetWords = wordDocs
      .filter((d) => d.exists())
      .map((d) => d.data().englishWord)
      .filter(Boolean);
  } else {
    const listMeta = await getWordListMeta(assignment.listId);
    const total = listMeta?.wordCount || 0;
    const masteredInList = allProgress.filter(
      (p) => p.sourceListId === assignment.listId && isMastered(p.correctAttempts || 0, p.totalAttempts || 0),
    ).length;
    return { mastered: masteredInList, total };
  }

  const mastered = targetWords.filter((w) => {
    const p = progressByWord.get(w);
    return p && isMastered(p.correctAttempts || 0, p.totalAttempts || 0);
  }).length;

  return { mastered, total: targetWords.length };
}
