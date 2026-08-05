export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildChoices(words, index) {
  const correct = words[index];
  const distractorPool = words.filter((_, i) => i !== index).map((w) => w.hebrewTranslation);
  const distractors = shuffle(distractorPool).slice(0, 3);
  return shuffle([correct.hebrewTranslation, ...distractors]);
}

/** כמו buildChoices, אבל המסיחות מגיעות ממאגר חיצוני (למשל כל word_lists,
 * ר' getGlobalWordPool ב-api.js) ולא מתוך רשימת המילים של המשימה עצמה —
 * כדי שאי אפשר יהיה "לנחש לפי הקשר" מתוך המילים הצרות של המשימה. */
export function buildChoicesFromPool(correctWord, pool, count = 3) {
  const distractorPool = pool
    .filter((w) => w.englishWord !== correctWord.englishWord)
    .map((w) => w.hebrewTranslation);
  const distractors = shuffle(distractorPool).slice(0, count);
  return shuffle([correctWord.hebrewTranslation, ...distractors]);
}
