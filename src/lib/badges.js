import { collection, doc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';
import { Flame, BookOpen, Brain, Trophy, Star, Rocket, Moon, Zap, Target } from 'lucide-react';
import { db } from '../firebase.js';
import { isMastered } from './gamification.js';

// icon/accent זוג לכל תג — צבע ייחודי לכל אחד (מצבעי המותג או צבעים חמים,
// לא אפור), כדי שתגים יהיו מובחנים זה מזה גם בלי לקרוא את הכותרת.
// שני תגים חולקים משמעותית "ברק" (⚡ בעבר): hundred-words מקבל BookOpen
// (זה על נפח אוצר מילים, לא מהירות); lightning (20 תשובות נכונות ברצף
// בסשן אחד) שומר על Zap כי זה ממש על קצב/מהירות — השם "ברק" מתאים אליו.
export const BADGE_DEFINITIONS = [
  { id: 'week-streak', icon: Flame, accent: 'bg-amber-50 text-amber-500', title: 'שבוע ברצף', description: '7 ימים ברצף' },
  { id: 'hundred-words', icon: BookOpen, accent: 'bg-blue-50 text-blue-600', title: 'מאה מילים', description: '100 מילים עם ניסיון תרגול' },
  { id: 'expert', icon: Brain, accent: 'bg-purple-50 text-purple-600', title: 'מומחה', description: '50 מילים נכבשות' },
  { id: 'first-place', icon: Trophy, accent: 'bg-yellow-50 text-yellow-600', title: 'מקום ראשון', description: 'הגעת למקום 1 בטבלת המובילים' },
  { id: 'diligent', icon: Star, accent: 'bg-cyan-50 text-cyan-600', title: 'שקדן', description: 'תרגלת 30 ימים סה"כ' },
  { id: 'first-daily-challenge', icon: Rocket, accent: 'bg-brand-green/10 text-brand-green', title: 'אתגר ראשון', description: 'השלמת אתגר יומי בפעם הראשונה' },
  // תגים סודיים — מוצגים עם אייקון HelpCircle ב-BadgeGrid עד שנפתחים.
  { id: 'night-owl', icon: Moon, accent: 'bg-indigo-50 text-indigo-600', title: 'ינשוף לילה', description: 'תרגלת אחרי השעה 22:00', secret: true },
  { id: 'lightning', icon: Zap, accent: 'bg-pink-50 text-pink-600', title: 'ברק', description: '20 תשובות נכונות ברצף בסשן אחד', secret: true },
  { id: 'precise', icon: Target, accent: 'bg-brand-turquoise/10 text-brand-turquoise', title: 'מדויק', description: '100% הצלחה בסשן של 20 מילים ומעלה', secret: true },
];

export async function getEarnedBadges(uid) {
  const snap = await getDocs(collection(db, 'users', uid, 'badges'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

function evaluateEligibility({
  streak,
  allProgress,
  rank,
  totalActiveDays,
  maxComboThisSession = 0,
  sessionAccuracyPct = null,
  sessionWordCount = 0,
  isNightOwlSession = false,
  completedFirstDailyChallenge = false,
}) {
  const practicedCount = allProgress.filter((p) => (p.correctAttempts || 0) > 0).length;
  const masteredCount = allProgress.filter((p) =>
    isMastered(p.correctAttempts || 0, p.totalAttempts || 0),
  ).length;

  return {
    'week-streak': streak >= 7,
    'hundred-words': practicedCount >= 100,
    expert: masteredCount >= 50,
    'first-place': rank === 1,
    diligent: totalActiveDays >= 30,
    'first-daily-challenge': completedFirstDailyChallenge,
    'night-owl': isNightOwlSession,
    lightning: maxComboThisSession >= 20,
    precise: sessionWordCount >= 20 && sessionAccuracyPct === 1,
  };
}

/**
 * בודקת קריטריונים ומעניקה תגים חדשים ל-users/{uid}/badges/{badgeId}.
 * אידמפוטנטי (doc ID = badgeId) — לא כותב תג שכבר קיים. מחזיר את הגדרות
 * התגים שהוענקו כרגע (icon/title/description כלולים, לצורך הודעת "תג חדש").
 */
export async function checkAndAwardBadges(uid, params) {
  const existing = await getEarnedBadges(uid);
  const existingIds = new Set(existing.map((b) => b.id));
  const eligibility = evaluateEligibility(params);

  const newlyEarned = [];
  for (const def of BADGE_DEFINITIONS) {
    if (existingIds.has(def.id) || !eligibility[def.id]) continue;
    // icon לא נכתב כאן בכוונה: הוא עכשיו קומפוננטת lucide (פונקציה), ו-
    // Firestore לא יכול לשמור ערך כזה. שום דבר לא קרא בחזרה את השדה הזה
    // ממילא — Profile.jsx/getEarnedBadges משתמשים רק ב-id (ר' BadgeGrid,
    // שמציג אייקון/כותרת מ-BADGE_DEFINITIONS המקומי, לא מה-doc ב-Firestore).
    await setDoc(doc(db, 'users', uid, 'badges', def.id), {
      title: def.title,
      description: def.description,
      earnedAt: serverTimestamp(),
    });
    newlyEarned.push(def);
  }
  return newlyEarned;
}
