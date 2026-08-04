import { useEffect, useState } from 'react';

const MOBILE_BREAKPOINT = 768;

function computeIsStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
  );
}

/**
 * חוסם גישה לאפליקציה בדפדפן מובייל רגיל (לא PWA מותקנת) — רק מסך
 * "התקן את האפליקציה". isStandalone לא אמור להשתנות תוך כדי session
 * (רק אחרי התקנה מחדש), לכן נקבע פעם אחת; isMobile כן יכול להשתנות
 * (סיבוב מסך/שינוי חלון) ולכן מאזין ל-resize.
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

  return { requiresInstall: isMobile && !isStandalone };
}
