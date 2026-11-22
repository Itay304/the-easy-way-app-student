// הודעת שגיאה ידידותית לקריאה לפונקציית ענן (callable) — המשתמש לעולם לא רואה קוד גולמי כמו "internal".
// השגיאה הטכנית נכתבת ל-console בלבד.
// הודעות שהשרת שלנו זורק (HttpsError) כבר בעברית וברורות (כולל שמות השדות החסרים) — מוצגות כמו שהן;
// כל השאר ממופה לפי הקוד.
export const GENERIC_ERROR = 'משהו השתבש, נסו שוב בעוד רגע';
const HEBREW = /[֐-׿]/;
const SERVER_MESSAGE_CODES = new Set([
  'invalid-argument',
  'failed-precondition',
  'permission-denied',
  'not-found',
  'already-exists',
  'resource-exhausted',
  'out-of-range',
  'unauthenticated',
]);

export function friendlyError(
  err,
  { context = '', online = typeof navigator === 'undefined' || navigator.onLine } = {},
) {
  console.error(`[callable error]${context ? ` ${context}` : ''}`, err?.code, err?.message, err?.details ?? '');
  const code = String(err?.code || '').replace(/^functions\//, '');
  const message = typeof err?.message === 'string' ? err.message.trim() : '';
  if (!online) return 'אין חיבור לאינטרנט. בדקו את החיבור ונסו שוב.';
  if (SERVER_MESSAGE_CODES.has(code) && HEBREW.test(message)) return message;
  switch (code) {
    case 'permission-denied':
      return 'אין לך הרשאה לבצע את הפעולה הזו.';
    case 'unauthenticated':
      return 'פג תוקף ההתחברות. התחברו מחדש ונסו שוב.';
    case 'not-found':
      return 'הפריט או השירות לא נמצאו. רעננו את הדף ונסו שוב.';
    case 'invalid-argument':
      return 'חלק מהפרטים חסרים או לא תקינים. בדקו את הטופס ונסו שוב.';
    case 'failed-precondition':
      return 'אי אפשר לבצע את הפעולה כרגע. בדקו את הפרטים ונסו שוב.';
    case 'resource-exhausted':
      return 'יותר מדי ניסיונות. חכו כמה דקות ונסו שוב.';
    case 'unavailable':
    case 'deadline-exceeded':
      return 'אין תקשורת עם השרת. בדקו את החיבור לאינטרנט ונסו שוב.';
    default:
      return GENERIC_ERROR; // internal, unknown, cancelled וכל דבר אחר
  }
}
