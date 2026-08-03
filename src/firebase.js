import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: 'my-book-club-site',
  appId: '1:464855561341:web:a5b37e937e0a11b06aad14',
  storageBucket: 'my-book-club-site.firebasestorage.app',
  apiKey: 'AIzaSyBp4pnHXirDKj2tMUFZcUebFMTQhYpzRkI',
  authDomain: 'my-book-club-site.firebaseapp.com',
  messagingSenderId: '464855561341',
  measurementId: 'G-8HV1SC2RED',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

setPersistence(auth, browserLocalPersistence);
