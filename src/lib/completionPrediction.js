import { daysAgo } from './dateUtils.js';
import { isMastered } from './gamification.js';

const PACE_WINDOW_DAYS = 7;

/**
 * חיזוי ימים-עד-סיום לבאנד, מבוסס על קצב "מילים שנכבשות ותורגלו לאחרונה"
 * ב-7 הימים האחרונים. אותה מגבלת מודל-נתונים כמו bucketIntoWeeks
 * (dateUtils.js) — lastPracticed הוא הפרוקסי היחיד הזמין, לא לוג-כיבוש
 * אמיתי, לכן זהו קירוב ולא מדד מדויק.
 */
export function predictCompletionDays({ total, mastered, progressDocs }, bandListIds) {
  const remaining = total - mastered;
  if (remaining <= 0) return { remaining: 0, dailyPace: 0, daysEstimate: 0 };

  const recentlyMasteredCount = progressDocs.filter((p) => {
    if (!bandListIds.includes(p.sourceListId)) return false;
    if (!isMastered(p.correctAttempts || 0, p.totalAttempts || 0)) return false;
    const lastMs = p.lastPracticed?.toMillis ? p.lastPracticed.toMillis() : null;
    return lastMs !== null && daysAgo(lastMs) <= PACE_WINDOW_DAYS;
  }).length;

  const dailyPace = recentlyMasteredCount / PACE_WINDOW_DAYS;
  if (dailyPace <= 0) return { remaining, dailyPace: 0, daysEstimate: null };

  return { remaining, dailyPace, daysEstimate: Math.ceil(remaining / dailyPace) };
}
