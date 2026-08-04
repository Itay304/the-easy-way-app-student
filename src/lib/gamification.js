// מראה מדויק של GamificationEngine.java (Android) — אותם קבועים, אותה נוסחה.

export const XP_CORRECT_ANSWER = 10;
export const XP_MODULE_COMPLETE = 50;
export const XP_WORD_MASTERED = 100; // בונוס כשמילה חוצה מ-mastery<5 ל-5

export function computeLevel(xp) {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

export function xpForLevelStart(level) {
  return (level - 1) ** 2 * 100;
}

export function xpForNextLevel(level) {
  return level ** 2 * 100;
}

/** אחוז + מונים להצגת פס התקדמות לרמה הבאה. */
export function levelProgress(xp) {
  const level = computeLevel(xp);
  const start = xpForLevelStart(level);
  const next = xpForNextLevel(level);
  return {
    level,
    xpWithinLevel: xp - start,
    xpRangeOfLevel: next - start,
  };
}

/** מילה "נכבשת" — אותה הגדרה בדיוק כמו Word.isMastered() ב-Android. */
export function isMastered(correctAttempts, totalAttempts) {
  return correctAttempts >= 3 && totalAttempts > 0 && correctAttempts / totalAttempts >= 0.7;
}

/** מסלול mastery 0-5 (משמש להחלטת בונוס +100 XP כשחוצים ל-5, ולבחירה
 * אדפטיבית 60/20/20 בתרגול) — אותה נוסחה כמו Word.getMasteryLevel(). */
export function masteryLevel(correctAttempts, totalAttempts) {
  return Math.min(5, Math.floor((correctAttempts / (totalAttempts + 1)) * 5));
}
