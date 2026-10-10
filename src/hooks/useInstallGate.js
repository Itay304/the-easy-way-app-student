import { useEffect, useState } from 'react';

const MOBILE_BREAKPOINT = 768;

function computeIsStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
  );
}

/**
 * מזהה דפדפן מובייל רגיל (לא PWA מותקנת) — לשימוש באנר ההתקנה
 * (InstallBanner.jsx), לא חוסם גישה לאפליקציה. isStandalone לא אמור
 * להשתנות תוך כדי session (רק אחרי התקנה מחדש), לכן נקבע פעם אחת;
 * isMobile כן יכול להשתנות (סיבוב מסך/שינוי חלון) ולכן מאזין ל-resize.
 */
export default function useInstallGate() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < MOBILE_BREAKPOINT);
  const [isStandalone] = useState(computeIsStandalone);

  useEffect(() => {
    function onResize() {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return { isMobile, isStandalone };
}
