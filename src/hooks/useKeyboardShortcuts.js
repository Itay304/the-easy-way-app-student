import { useEffect, useRef } from 'react';

/**
 * קיצורי מקלדת בתרגול (מחשב). handlers — כל אחד אופציונלי:
 *   choice(i)  — מקשים 1–9 (i מתחיל ב-0): בחירת תשובה לפי הסדר שעל המסך
 *   enter()    — Enter: המשך / בדיקה
 *   space()    — רווח: היפוך כרטיסייה
 *   escape()   — Esc: יציאה (אותה יציאה כמו כפתור "חזרה", כולל שמירת ההתקדמות)
 * בזמן הקלדה בשדה טקסט רק Esc פעיל (Enter בשדה מטופל על ידי השדה עצמו). מקש שכבר טופל
 * (defaultPrevented, למשל רווח על כרטיסייה ממוקדת) לא מטופל פעם שנייה.
 */
export default function useKeyboardShortcuts(handlers) {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    function onKeyDown(e) {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.repeat) return;
      const h = ref.current;
      if (e.key === 'Escape') {
        if (h.escape) {
          e.preventDefault();
          h.escape();
        }
        return;
      }
      const el = e.target;
      const typing =
        el instanceof HTMLElement && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
      if (typing) return;
      if (/^[1-9]$/.test(e.key) && h.choice) {
        e.preventDefault();
        h.choice(Number(e.key) - 1);
      } else if (e.key === 'Enter' && h.enter) {
        e.preventDefault();
        h.enter();
      } else if (e.key === ' ' && h.space) {
        e.preventDefault();
        h.space();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
