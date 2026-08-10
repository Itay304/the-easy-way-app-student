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
  alert('FCM function called for uid: ' + uid); // TODO: זמני לאבחון — להסיר
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

    console.log('FCM: permission status = ' + Notification.permission);
    console.log('FCM: requesting permission...');

    // בדיקת השערה: אולי הפונקציה רצה לפני שה-DOM/הדף "מוכן" בעיני הדפדפן.
    // TODO: זמני לאבחון — להסיר
    await new Promise((resolve) => setTimeout(resolve, 2000));

    alert('before requestPermission'); // TODO: זמני לאבחון — להסיר
    const permission = await Notification.requestPermission();
    alert('after requestPermission: ' + permission); // TODO: זמני לאבחון — להסיר
    console.log('FCM: permission status = ' + permission);
    if (permission !== 'granted') {
      console.log('FCM: error = permission not granted (' + permission + ')');
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
      await updateDoc(doc(db, 'users', uid), { fcmToken: token });
      localStorage.setItem(requestedKey(uid), '1');
      console.log('FCM: token saved to users/' + uid + '.fcmToken');
    } else {
      console.log('FCM: error = getToken() resolved with no token');
    }
  } catch (err) {
    alert('FCM catch: ' + err); // TODO: זמני לאבחון — להסיר
    console.log('FCM: error = ' + err);
    console.error('[push] בקשת הרשאה/שמירת token נכשלה:', err);
  }
}
