// הודעות Push ברקע (FCM) — חייב לחיות באותו service-worker.js שכבר רשום
// ב-main.jsx (navigator.serviceWorker.register('/service-worker.js')),
// לא בקובץ נפרד (firebase-messaging-sw.js), כי שני service workers לא
// יכולים לשלוט על אותו scope ('/') בו-זמנית. ערכי הקונפיג כאן ציבוריים
// לגמרי (בדיוק כמו ב-src/firebase.js) — לא סוד, לא ניתן לגשת ל-
// import.meta.env בתוך service worker סטטי, לכן קבועים ישירות.
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBp4pnHXirDKj2tMUFZcUebFMTQhYpzRkI',
  authDomain: 'my-book-club-site.firebaseapp.com',
  projectId: 'my-book-club-site',
  storageBucket: 'my-book-club-site.firebasestorage.app',
  messagingSenderId: '464855561341',
  appId: '1:464855561341:web:a5b37e937e0a11b06aad14',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || 'EasyLex', {
    body: body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
  });
});

const CACHE_NAME = 'easylex-student-v1';
const APP_SHELL = ['/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // בקשות ניווט (טעינת index.html) — network-first: תמיד לנסות רשת קודם,
  // וליפול לקאש רק כשאין רשת בכלל. מונע הישארות תקועה על גרסה ישנה
  // של האפליקציה אחרי התקנה כ-PWA.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request)),
    );
    return;
  }

  // שאר הבקשות (JS/CSS/תמונות עם hash בשם הקובץ) — cache-first בטוח,
  // כי כל build מייצר שם קובץ חדש.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
