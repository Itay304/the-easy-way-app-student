// מחזור התרגול המגוון: כל 5 מילים עוברים למודול הבא במחזור, וחוזר חלילה.
// ביטויים (partOfSpeech = "phrase") לא נכנסים לשלב האיות — בדיוק כמו ב-SpellingModule —
// ובמקומו הם מקבלים מבחן בחירה.

export const CYCLE = ['flashcards', 'quiz', 'truefalse', 'spelling'];
export const BLOCK_SIZE = 5;
export const PHRASE_SPELLING_FALLBACK = 'quiz';

export function isPhrase(word) {
  return (word?.partOfSpeech || '').trim().toLowerCase() === 'phrase';
}

export function moduleForIndex(i) {
  return CYCLE[Math.floor(i / BLOCK_SIZE) % CYCLE.length];
}

/** סוג התרגיל למילה במקום i בסבב — כמו moduleForIndex, חוץ מביטוי שנופל על איות. */
export function exerciseFor(word, i) {
  const type = moduleForIndex(i);
  return type === 'spelling' && isPhrase(word) ? PHRASE_SPELLING_FALLBACK : type;
}
