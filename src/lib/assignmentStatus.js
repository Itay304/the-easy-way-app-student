import { getWordsForAssignment } from './api.js';
import { loadStudentProgress } from './assignmentProgress.js';
import { dailyGoal, dayKey, stageProgress, stagesFor } from './stages.js';

// מצב משימה לתלמיד — שלבים, מילים ידועות, יעד יומי. משמש את כרטיס המשימה, עמוד המשימה,
// הסטטיסטיקה והפרופיל. אין כאן אחוז: מה שמוצג לתלמיד הוא שלב, מילים ידועות וסבבים.
export function statusFrom({ assignment, stages, words = {}, sessions = {}, now = Date.now() }) {
  const progress = stageProgress(stages, words);
  const today = dayKey(now);
  const goal = dailyGoal({ totalWords: progress.totalWords, seenWords: progress.seenWords, dueDateMs: assignment.dueDateMs, now });
  return { stages, words, sessions, progress, goal, today, sessionsToday: sessions[today] || 0 };
}

export async function loadAssignmentStatus(assignment, institutionId, uid, now = Date.now()) {
  // משימות ישנות בלי wordIds — מזהי כל מילות הרשימה (משימות חדשות תמיד עם wordIds)
  const wordIds =
    assignment.wordIds && assignment.wordIds.length > 0
      ? assignment.wordIds
      : (await getWordsForAssignment(assignment, institutionId)).map((w) => w.id);
  const stages = stagesFor(wordIds, assignment.stagePlan);
  const { words, sessions } = institutionId
    ? await loadStudentProgress(institutionId, assignment.assignmentId, uid)
    : { words: {}, sessions: {} };
  return statusFrom({ assignment, stages, words, sessions, now });
}
