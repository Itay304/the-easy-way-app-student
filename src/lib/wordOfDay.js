import { getWordsForList } from './api.js';
import { isMastered } from './gamification.js';
import { toDateKey } from './dateUtils.js';

function seededIndex(seedStr, length) {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash * 31 + seedStr.charCodeAt(i)) >>> 0;
  }
  return hash % length;
}

/**
 * "מילת היום" — דטרמיניסטית לפי תאריך (אותה מילה לאורך כל היום, גם
 * ברענון), מתוך מילות המשימות הפעילות שהתלמיד עוד לא שולט בהן
 * (isMastered()===false). אם הכל כבר נכבש — נבחר מכלל המילים.
 */
export async function pickWordOfDay(activeAssignments, allProgress) {
  const uniqueListIds = [...new Set(activeAssignments.map((a) => a.listId).filter(Boolean))];
  if (uniqueListIds.length === 0) return null;

  const assignmentIdByListId = new Map();
  activeAssignments.forEach((a) => {
    if (!assignmentIdByListId.has(a.listId)) assignmentIdByListId.set(a.listId, a.assignmentId);
  });

  const wordLists = await Promise.all(uniqueListIds.map((listId) => getWordsForList(listId)));
  const progressByKey = new Map(allProgress.map((p) => [`${p.sourceListId}::${p.englishWord}`, p]));

  const candidates = wordLists.flat().map((w) => {
    const baseline = progressByKey.get(`${w.sourceListId}::${w.englishWord}`);
    return {
      englishWord: w.englishWord,
      hebrewTranslation: w.hebrewTranslation,
      exampleSentence: w.exampleSentence,
      sourceListId: w.sourceListId,
      assignmentId: assignmentIdByListId.get(w.sourceListId),
      correctAttempts: baseline?.correctAttempts || 0,
      totalAttempts: baseline?.totalAttempts || 0,
    };
  });

  const unmastered = candidates.filter((w) => !isMastered(w.correctAttempts, w.totalAttempts));
  const pool = unmastered.length > 0 ? unmastered : candidates;
  if (pool.length === 0) return null;

  return pool[seededIndex(toDateKey(Date.now()), pool.length)];
}
