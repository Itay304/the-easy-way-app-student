import { getToken } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';
import { db, getMessagingIfSupported } from '../firebase.js';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

function requestedKey(uid) {
  return `easylex_push_requested_${uid}`;
}

/**
 * מבקשת הרשאת Push בכניסה ראשונה (לאחר login) ושומרת את ה-FCM token
 * ב-users/{uid}.fcmToken. מוגן ב-flag לכל uid ב-localStorage כדי לא
 * לבקש שוב בכל טעינה — Notification.requestPermission() עצמו כבר
 * no-op אם המשתמש כבר ענה בעבר, אבל ה-flag גם חוסך getToken()+כתיבה
 * מיותרים בכל login חוזר. מכשיר משותף (כמה תלמידים) → flag לכל uid
 * בנפרד, לא גלובלי.
 */
export async function requestPushPermissionAndSaveToken(uid) {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return;
  if (localStorage.getItem(requestedKey(uid)) === '1') return;
  localStorage.setItem(requestedKey(uid), '1');

  if (!VAPID_KEY) {
    console.warn('[push] VITE_FIREBASE_VAPID_KEY לא מוגדר — מדלגים על רישום Push.');
    return;
  }

  try {
    const messaging = await getMessagingIfSupported();
    if (!messaging) return; // הדפדפן/הסביבה לא תומכים ב-FCM (למשל Safari ישן, iframe)

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (token) {
      await updateDoc(doc(db, 'users', uid), { fcmToken: token });
    }
  } catch (err) {
    console.error('[push] בקשת הרשאה/שמירת token נכשלה:', err);
  }
}
