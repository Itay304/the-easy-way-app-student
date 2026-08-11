import { getToken } from 'firebase/messaging';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, getMessagingIfSupported } from '../firebase.js';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

// v3: מעבר משדה יחיד users/{uid}.fcmToken (נדרס בכל מכשיר חדש — התראות
// הגיעו רק ל-login האחרון) לאוסף users/{uid}/tokens/{token}, כך שלכל
// מכשיר יש מסמך משלו ואפשר לשלוח לכולם. גרסה קודמת (v2) של ה-flag
// כבר לא רלוונטית לסכימה החדשה — bump נוסף כדי שכל המכשירים שכבר
// נרשמו יעברו רישום מחדש פעם אחת ויכתבו למבנה הנכון.
function requestedKey(uid) {
  return `easylex_push_requested_v3_${uid}`;
}

/**
 * מבקשת הרשאת Push בכניסה ראשונה (לאחר login) ושומרת את ה-FCM token
 * ב-users/{uid}/tokens/{token} (doc ID = הטוקן עצמו — כתיבה חוזרת של
 * אותו טוקן פשוט מעדכנת את אותו מסמך, לא יוצרת כפילות). מוגן ב-flag
 * לכל uid ב-localStorage כדי לא לבצע getToken()+כתיבה מיותרים בכל
 * login חוזר — לא כדי למנוע פופ-אפ חוזר (Notification.requestPermission()
 * עצמו כבר no-op בשקט אם המשתמש כבר ענה). מכשיר משותף (כמה תלמידים) →
 * flag לכל uid בנפרד, לא גלובלי. הדגל נשמר רק אחרי הצלחה אמיתית (token
 * נכתב בפועל) — כל כשל (VAPID חסר, דפדפן לא נתמך, סירוב, שגיאת getToken)
 * משאיר את הדגל לא-מסומן כדי שהניסיון הבא (login הבא) ינסה שוב.
 */
export async function requestPushPermissionAndSaveToken(uid) {
  console.log('push.js version: tokens-subcollection');
  console.log('FCM: init started');

  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    console.log('FCM: error = Notification API not available in this environment');
    return;
  }

  if (localStorage.getItem(requestedKey(uid)) === '1') {
    console.log('FCM: skipped — already requested+saved successfully before for this uid');
    return;
  }

  console.log('FCM: VAPID key = ' + VAPID_KEY?.substring(0, 10));

  if (!VAPID_KEY) {
    console.log('FCM: error = VITE_FIREBASE_VAPID_KEY is missing/empty');
    return;
  }

  try {
    const messaging = await getMessagingIfSupported();
    if (!messaging) {
      console.log('FCM: error = getMessagingIfSupported() returned null (FCM unsupported in this browser/context)');
      return;
    }

    console.log('FCM: requesting permission...');

    // חייבים להמתין לתוצאה של ה-promise ולבדוק אותה — לא את
    // Notification.permission הסינכרוני, שעדיין מחזיק את הערך הישן עד
    // שהמשתמש בפועל עונה על הבקשה.
    const permission = await Notification.requestPermission();
    console.log('FCM: permission status = ' + permission);
    if (permission !== 'granted') {
      console.warn('FCM: permission not granted:', permission);
      return;
    }

    // getToken() בלי serviceWorkerRegistration מחפש /firebase-messaging-sw.js
    // כברירת מחדל. ה-handler שלנו ממוזג לתוך /service-worker.js הקיים
    // (נרשם ב-main.jsx) במקום קובץ נפרד — לכן חייבים למסור לו את אותו
    // registration במפורש, אחרת getToken() מנסה לרשום קובץ שלא קיים.
    const registration = await navigator.serviceWorker.ready;
    console.log('FCM: service worker ready, scope = ' + registration.scope);

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    console.log('FCM: token = ' + token?.substring(0, 10));

    if (token) {
      await setDoc(doc(db, 'users', uid, 'tokens', token), {
        token,
        device: navigator.userAgent,
        createdAt: serverTimestamp(),
      });
      localStorage.setItem(requestedKey(uid), '1');
      console.log('FCM: token saved to users/' + uid + '/tokens/' + token.substring(0, 10) + '...');
    } else {
      console.log('FCM: error = getToken() resolved with no token');
    }
  } catch (err) {
    console.log('FCM: error = ' + err);
    console.error('[push] בקשת הרשאה/שמירת token נכשלה:', err);
  }
}
