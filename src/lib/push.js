import { getToken } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';
import { db, getMessagingIfSupported } from '../firebase.js';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

// v2: גרסה קודמת של ה-key סימנה "כבר ביקשנו" גם כשהבקשה בפועל נכשלה
// (VAPID_KEY חסר/getToken נכשל), ותקעה משתמשים לצמיתות גם אחרי שהתיקון
// נפרס. שינוי שם ה-key מבטל את הדגלים התקועים האלה בבת אחת.
function requestedKey(uid) {
  return `easylex_push_requested_v2_${uid}`;
}

/**
 * מבקשת הרשאת Push בכניסה ראשונה (לאחר login) ושומרת את ה-FCM token
 * ב-users/{uid}.fcmToken. מוגן ב-flag לכל uid ב-localStorage כדי לא
 * לבצע getToken()+כתיבה מיותרים בכל login חוזר — לא כדי למנוע פופ-אפ
 * חוזר (Notification.requestPermission() עצמו כבר no-op בשקט אם
 * המשתמש כבר ענה). מכשיר משותף (כמה תלמידים) → flag לכל uid בנפרד,
 * לא גלובלי. הדגל נשמר רק אחרי הצלחה אמיתית (token נכתב בפועל) —
 * כל כשל (VAPID חסר, דפדפן לא נתמך, סירוב, שגיאת getToken) משאיר
 * את הדגל לא-מסומן כדי שהניסיון הבא (login הבא) ינסה שוב.
 */
export async function requestPushPermissionAndSaveToken(uid) {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return;
  if (localStorage.getItem(requestedKey(uid)) === '1') return;

  if (!VAPID_KEY) {
    console.warn('[push] VITE_FIREBASE_VAPID_KEY לא מוגדר — מדלגים על רישום Push.');
    return;
  }

  try {
    const messaging = await getMessagingIfSupported();
    if (!messaging) return; // הדפדפן/הסביבה לא תומכים ב-FCM (למשל Safari ישן, iframe)

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    // getToken() בלי serviceWorkerRegistration מחפש /firebase-messaging-sw.js
    // כברירת מחדל. ה-handler שלנו ממוזג לתוך /service-worker.js הקיים
    // (נרשם ב-main.jsx) במקום קובץ נפרד — לכן חייבים למסור לו את אותו
    // registration במפורש, אחרת getToken() מנסה לרשום קובץ שלא קיים.
    const registration = await navigator.serviceWorker.ready;
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    if (token) {
      await updateDoc(doc(db, 'users', uid), { fcmToken: token });
      localStorage.setItem(requestedKey(uid), '1');
    }
  } catch (err) {
    console.error('[push] בקשת הרשאה/שמירת token נכשלה:', err);
  }
}
