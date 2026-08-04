/**
 * מסדר מחדש רשימת מילות סשן: 30% מהמילים החלשות ביותר (הכי הרבה שגיאות —
 * totalAttempts-correctAttempts בין המילים שכבר תורגלו) עוברות לתחילת
 * הסשן. משמש לפני quiz/flashcards בלבד, לא spelling (לפי הבקשה).
 */
export function applyAdaptiveOrder(words) {
  const withErrors = words.filter(
    (w) => (w.totalAttempts || 0) > 0 && w.totalAttempts - w.correctAttempts > 0,
  );
  if (withErrors.length === 0) return { words, isAdaptive: false };

  const weakCount = Math.max(1, Math.round(words.length * 0.3));
  const sorted = [...withErrors].sort(
    (a, b) => b.totalAttempts - b.correctAttempts - (a.totalAttempts - a.correctAttempts),
  );
  const weakWords = sorted.slice(0, weakCount);
  const weakKeys = new Set(weakWords.map((w) => w.englishWord));
  const rest = words.filter((w) => !weakKeys.has(w.englishWord));

  return { words: [...weakWords, ...rest], isAdaptive: true };
}
