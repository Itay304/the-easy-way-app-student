import { useEffect, useState } from 'react';
import { Keyboard, X } from 'lucide-react';

const SEEN_KEY = 'easylex_keyboard_hint_seen';

function readSeen() {
  try {
    return localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

// רמז חד-פעמי במחשב (1024px ומעלה): אפשר לתרגל עם המקלדת. מוצג בסשן התרגול הראשון ונשמר כ"נראה"
// מיד — בסשן הבא כבר לא מופיע. בטלפון ובטאבלט מוסתר (hidden lg:flex).
export default function KeyboardHint() {
  const [visible, setVisible] = useState(() => !readSeen());

  useEffect(() => {
    if (!visible) return;
    try {
      localStorage.setItem(SEEN_KEY, '1');
    } catch {
      // אחסון חסום — הרמז פשוט יופיע שוב בפעם הבאה
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      role="note"
      className="hidden lg:flex mx-4 mt-6 lg:mx-10 items-center justify-between gap-3 rounded-xl bg-brand-turquoise/10 px-4 py-2.5 text-body-sm text-turquoise-800"
    >
      <span className="flex items-center gap-2">
        <Keyboard size={18} aria-hidden="true" />
        אפשר להשתמש במקלדת: <span dir="ltr">1–4, Enter</span>
      </span>
      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="סגירת ההודעה"
        className="rounded-lg p-1 hover:bg-brand-turquoise/15"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
