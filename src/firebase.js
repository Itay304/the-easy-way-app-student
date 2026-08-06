import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getMessaging, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, 'europe-west1');

setPersistence(auth, browserLocalPersistence);

// FCM לא נתמך בכל דפדפן/הקשר (Safari ישן, iframe, וכו') — isSupported()
// היא async, לכן lazy-init עם cache במקום ליצור getMessaging() בטעינה.
let messagingInstance;
export async function getMessagingIfSupported() {
  if (messagingInstance !== undefined) return messagingInstance;
  const supported = await isSupported().catch(() => false);
  messagingInstance = supported ? getMessaging(app) : null;
  return messagingInstance;
}
