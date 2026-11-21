// "תוכן מותאם לבתי ספר דתיים" — מקום הסינון היחיד באפליקציית התלמיד. מוסד עם hideSensitiveWords=true:
// מילים מתויגות "sensitive" לא מופיעות לתלמידים (משימות, סבבים, ספרינט, מסיחים בשאלות), ומשימות קיימות
// מדלגות עליהן (גם בחלוקה לשלבים ובספירות). api.js מפעיל את הפונקציות האלה — לא לסנן במקום אחר.
// אותם כללים כמו functions/contentFilter.js בצד השרת (שהוא המקור המחייב; כאן — שכבה זהה בלקוח).

import { buildStageSizes } from './stages.js';

export const SENSITIVE_TAG = 'sensitive';
export const INSTITUTION_FIELD = 'hideSensitiveWords';

/** מילה מתויגת "sensitive"? tags היא מחרוזת ("General, sensitive") — ותומכים גם במערך. */
export function isSensitive(word) {
  const tags = word?.tags;
  const list = Array.isArray(tags) ? tags : typeof tags === 'string' ? tags.split(',') : [];
  return list.some((t) => String(t).trim().toLowerCase() === SENSITIVE_TAG);
}

/** ההגדרה במסמך המוסד (ברירת מחדל: כבוי). */
export function hidesSensitive(institution) {
  return institution?.[INSTITUTION_FIELD] === true;
}

/** רשימת מילים כפי שהתלמיד רואה אותה. */
export function visibleWords(words, hide) {
  return hide ? words.filter((w) => !isSensitive(w)) : words;
}

/**
 * משימה קיימת עם מילים מוסתרות: יוצאות מ-wordIds ומהשלב שלהן, בלי להזיז מילים בין שלבים.
 * שלב שהתרוקן נמחק. stagePlan לא תקין — חלוקת ברירת המחדל (buildStageSizes) לפני הסינון.
 */
export function filterStagePlan(wordIds, stagePlan, hiddenIds) {
  const ids = Array.isArray(wordIds) ? wordIds : [];
  const hidden = hiddenIds instanceof Set ? hiddenIds : new Set(hiddenIds || []);
  const planSizes = Array.isArray(stagePlan?.sizes) ? stagePlan.sizes : null;
  const sizes = planSizes && planSizes.reduce((a, b) => a + b, 0) === ids.length ? planSizes : buildStageSizes(ids.length);
  if (hidden.size === 0) return { wordIds: ids, stagePlan: { sizes } };
  const keptIds = [];
  const keptSizes = [];
  let i = 0;
  for (const size of sizes) {
    const kept = ids.slice(i, i + size).filter((id) => !hidden.has(id));
    i += size;
    if (kept.length === 0) continue;
    keptIds.push(...kept);
    keptSizes.push(kept.length);
  }
  return { wordIds: keptIds, stagePlan: { sizes: keptSizes } };
}

/** משימה כפי שהתלמיד רואה אותה. words = מילי הרשימה (לא מסוננות) כדי לדעת אילו מזהים רגישים. */
export function visibleAssignment(assignment, words, hide) {
  if (!hide || !Array.isArray(assignment.wordIds) || assignment.wordIds.length === 0) return assignment;
  const hidden = new Set(words.filter(isSensitive).map((w) => w.id));
  const { wordIds, stagePlan } = filterStagePlan(assignment.wordIds, assignment.stagePlan, hidden);
  return { ...assignment, wordIds, stagePlan };
}
