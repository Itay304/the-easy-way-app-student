import { collection, doc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase.js';
import { isMastered } from './gamification.js';

export const BADGE_DEFINITIONS = [
  { id: 'week-streak', icon: '🔥', title: 'שבוע ברצף', description: '7 ימים ברצף' },
  { id: 'hundred-words', icon: '⚡', title: 'מאה מילים', description: '100 מילים עם ניסיון תרגול' },
  { id: 'expert', icon: '🧠', title: 'מומחה', description: '50 מילים נכבשות' },
  { id: 'first-place', icon: '🏆', title: 'מקום ראשון', description: 'הגעת למקום 1 בטבלת המובילים' },
  { id: 'diligent', icon: '🌟', title: 'שקדן', description: 'תרגלת 30 ימים סה"כ' },
  { id: 'first-daily-challenge', icon: '🚀', title: 'אתגר ראשון', description: 'השלמת אתגר יומי בפעם הראשונה' },
  // תגים סודיים — מוצגים כ-"?" ב-BadgeGrid עד שנפתחים.
  { id: 'night-owl', icon: '🌙', title: 'ינשוף לילה', description: 'תרגלת אחרי השעה 22:00', secret: true },
  { id: 'lightning', icon: '⚡', title: 'ברק', description: '20 תשובות נכונות ברצף בסשן אחד', secret: true },
  { id: 'precise', icon: '🎯', title: 'מדויק', description: '100% הצלחה בסשן של 20 מילים ומעלה', secret: true },
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
    await setDoc(doc(db, 'users', uid, 'badges', def.id), {
      icon: def.icon,
      title: def.title,
      description: def.description,
      earnedAt: serverTimestamp(),
    });
    newlyEarned.push(def);
  }
  return newlyEarned;
}
