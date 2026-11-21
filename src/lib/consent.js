import { serverTimestamp } from 'firebase/firestore';

// הסכמה לתקנון ולמדיניות הפרטיות — נשמרת על מסמך המשתמש (users/{uid}).
// גרסת התקנון: להעלות כשהנוסח באתר משתנה; משתמש עם termsVersion ישן יותר לא נחסם (רק חסר termsAcceptedAt).
// תלמידים לא רואים את ההסכמה לדיוור ולא מקבלים דיוור שיווקי — marketingConsent נשמר אצלם false.
export const TERMS_VERSION = '2026-10-21';
export const TERMS_URL = 'https://theeasywayapp.co.il/terms';
export const PRIVACY_URL = 'https://theeasywayapp.co.il/privacy';
export const TERMS_REQUIRED_ERROR = 'כדי להמשיך יש לסמן שקראת ואת/ה מסכים/ה לתקנון ולמדיניות הפרטיות.';

// השדות שנכתבים כשהתלמיד מאשר (בהרשמה או במסך ההסכמה החד-פעמי). זמן — של השרת.
export function studentConsentFields() {
  return { termsAcceptedAt: serverTimestamp(), termsVersion: TERMS_VERSION, marketingConsent: false };
}

// מסמך קיים בלי termsAcceptedAt → מסך הסכמה חד-פעמי. מסמך שעוד לא נוצר (באמצע הרשמה) — לא.
export function needsConsent(exists, data) {
  return Boolean(exists) && !data?.termsAcceptedAt;
}
