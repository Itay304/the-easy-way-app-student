import { useEffect } from 'react';

// מונע יציאה מוקדמת מדי מה-PWA (מותקן, standalone) כשלוחצים "חזור"
// מיד עם פתיחת האפליקציה. history.state==null זה הכניסה הראשונה לעמוד —
// דוחפים "ריפוד" חד-פעמי כדי שלחיצת חזור ראשונה תיבלע במקום לצאת ישר.
export default function useBackButtonGuard() {
  useEffect(() => {
    if (window.history.state === null) {
      window.history.pushState({ __pad: true }, '', window.location.href);
    }
  }, []);
}
