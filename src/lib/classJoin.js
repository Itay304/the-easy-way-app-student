import { friendlyError } from './errors.js';

// הצטרפות לכיתה בקוד (הרשמת תלמיד) — אותם כללים כמו functions/classJoin.js.
// השרת מחזיר details.reason: not-found / class-closed / institution-closed / rate-limited / missing.

/** "ab 12345" / "AB12345" → "AB-12345"; קוד בפורמט אחר — רק trim ואותיות גדולות */
export function normalizeJoinCode(raw) {
  const s = String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
  if (/^[A-Z]{2}[A-Z0-9]{5}$/.test(s)) return `${s.slice(0, 2)}-${s.slice(2)}`;
  return s;
}

// אין חיבור — בכניסה/ביצירת חשבון (לא קשור לקוד הכיתה)
export const NETWORK_MESSAGE = 'אין חיבור לאינטרנט. בדקו את החיבור ונסו שוב.';

export const JOIN_MESSAGES = {
  'not-found': 'קוד הכיתה לא נמצא. בדקו את הקוד עם המורה ונסו שוב.',
  'class-closed': 'הכיתה הזו סגורה ולא מקבלת תלמידים חדשים. בקשו מהמורה קוד של כיתה פעילה.',
  'institution-closed': 'בית הספר לא מקבל כרגע תלמידים חדשים באפליקציה. פנו למורה.',
  'rate-limited': 'יותר מדי ניסיונות. חכו כמה דקות ונסו שוב.',
  missing: 'יש להזין את קוד הכיתה שקיבלתם מהמורה.',
  network: 'אין חיבור לאינטרנט, ולכן לא הצלחנו לבדוק את קוד הכיתה. בדקו את החיבור ונסו שוב.',
};

const HEBREW = /[֐-׿]/;
const NETWORK_CODES = new Set([
  'functions/unavailable',
  'functions/deadline-exceeded',
  'auth/network-request-failed',
  'unavailable',
]);

/**
 * שגיאת בדיקה/הצטרפות → { field: 'classCode' | 'form', message }.
 * field = 'classCode' — ההודעה מוצגת מתחת לשדה קוד הכיתה; 'form' — מתחת לטופס.
 */
export function joinErrorMessage(err, { online = typeof navigator === 'undefined' || navigator.onLine !== false } = {}) {
  const code = String(err?.code || '');
  if (!online || NETWORK_CODES.has(code)) {
    console.error('[join] network error', code, err?.message);
    return { field: 'form', message: JOIN_MESSAGES.network };
  }
  // reason מהשרת; בשרת ישן בלי reason — not-found רק כשההודעה בעברית (כלומר "הקוד לא נמצא" מ-joinClass,
  // ולא "הפונקציה לא קיימת" של התשתית)
  const hebrew = HEBREW.test(String(err?.message || ''));
  const reason = err?.details?.reason || (code === 'functions/not-found' && hebrew ? 'not-found' : null);
  if (reason && JOIN_MESSAGES[reason]) {
    console.error('[join] rejected', reason);
    return { field: 'classCode', message: JOIN_MESSAGES[reason] };
  }
  return { field: 'form', message: friendlyError(err, { context: 'join class', online }) };
}

// שגיאה "תשתיתית" בבדיקת הקוד (למשל שרת ישן בלי checkClassCode): אין סיבה מהשרת ואין הודעה בעברית.
// במקרה כזה לא חוסמים את ההרשמה — joinClass בודק את הקוד בכל מקרה (ועם ביטול החשבון אם הקוד לא תקין).
// בלי חיבור לאינטרנט זה אף פעם לא "שרת ישן" — זו שגיאת רשת, ומציגים את הודעת הרשת.
export function isCheckUnavailable(err, { online = typeof navigator === 'undefined' || navigator.onLine !== false } = {}) {
  if (!online) return false;
  const code = String(err?.code || '');
  const hebrew = HEBREW.test(String(err?.message || ''));
  return (
    !err?.details?.reason &&
    !hebrew &&
    (code === 'functions/not-found' || code === 'functions/internal' || code === 'functions/unimplemented')
  );
}
