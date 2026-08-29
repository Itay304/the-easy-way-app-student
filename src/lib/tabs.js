import { Home, BookOpen, BarChart3, User } from 'lucide-react';

// end: true — התאמה מדויקת בלבד (NavLink "end" prop). חובה עבור "/" —
// בלי זה, "/" הוא prefix של כל נתיב באפליקציה וטאב הבית היה נשאר "פעיל"
// תמיד. שאר הטאבים בכוונה בלי end, כדי שתת-נתיבים (/practice/:id,
// /practice/:id/:module) ימשיכו להדגיש את "תרגול" — לפני התיקון, ה-end
// הגלובלי גרם לתווית הטאב להיעלם ברגע שיוצאים מ-/practice המדויק.
export const TABS = [
  { path: '/', icon: Home, label: 'בית', end: true },
  { path: '/practice', icon: BookOpen, label: 'תרגול' },
  { path: '/stats', icon: BarChart3, label: 'סטטיסטיקות' },
  { path: '/profile', icon: User, label: 'פרופיל' },
];
