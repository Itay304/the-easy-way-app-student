import { getWordsForAssignment } from './api.js';
import { isMastered } from './gamification.js';

/**
 * "% נכבש" למשימה — המקור היחיד לחישוב התקדמות במשימה בכל האפליקציה
 * (Home, Practice, Profile, Statistics, SessionSummary). "נכבש" =
 * isMastered() — correctAttempts>=3 ויחס הצלחה>=70%, לא סתם ניסיון בודד
 * שהצליח — בדיוק כמו InstitutionalStatsViewModel/Word.isMastered()
 * ב-Android.
 */
export async function computeAssignmentMastery(allProgress, assignment, institutionId) {
  const progressByWord = new Map(
    allProgress
      .filter((p) => p.sourceListId === assignment.listId)
      .map((p) => [p.englishWord, p]),
  );

  // רשימה גלובלית או מוסדית (getWordsForAssignment) — קריאה אחת של הרשימה במקום get לכל מילה
  const listWords = await getWordsForAssignment(assignment, institutionId);
  const ids = assignment.wordIds && assignment.wordIds.length > 0 ? new Set(assignment.wordIds) : null;
  const targetWords = listWords.filter((w) => !ids || ids.has(w.id)).map((w) => w.englishWord).filter(Boolean);

  const mastered = targetWords.filter((w) => {
    const p = progressByWord.get(w);
    return p && isMastered(p.correctAttempts || 0, p.totalAttempts || 0);
  }).length;

  return { mastered, total: targetWords.length };
}
