import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase.js';
import { toDateKey } from './dateUtils.js';

export const CHALLENGE_TYPES = [
  { id: 'words15', label: 'תרגל/י 15 מילים היום', target: 15, metric: 'wordsPracticed' },
  { id: 'accuracy90', label: 'השג/י 90% הצלחה בסשן אחד', target: 0.9, metric: 'sessionAccuracy' },
  { id: 'minutes5', label: 'תרגל/י 5 דקות', target: 300, metric: 'secondsPracticed' },
];

function hashDateKey(dateKey) {
  let h = 0;
  for (let i = 0; i < dateKey.length; i++) {
    h = (h * 31 + dateKey.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** בחירה "רנדומלית" אך יציבה לפי תאריך — אותו אתגר לאורך כל היום, לכל
 * המשתמשים (hash דטרמיניסטי על מפתח התאריך, לא Math.random()). */
export function pickChallengeType(dateKey) {
  return CHALLENGE_TYPES[hashDateKey(dateKey) % CHALLENGE_TYPES.length];
}

export async function getOrCreateDailyChallenge(uid) {
  const dateKey = toDateKey(Date.now());
  const ref = doc(db, 'users', uid, 'dailyChallenge', dateKey);
  const snap = await getDoc(ref);
  if (snap.exists()) return { id: snap.id, ...snap.data() };

  const type = pickChallengeType(dateKey);
  const fresh = {
    typeId: type.id,
    label: type.label,
    target: type.target,
    metric: type.metric,
    progress: 0,
    completed: false,
  };
  await setDoc(ref, fresh);
  return { id: dateKey, ...fresh };
}

/**
 * מעדכנת את אתגר היום לפי סטטיסטיקות סשן שהסתיים זה עתה. "הצלחה בסשן"
 * נבדקת per-session (מספיק סשן אחד שעומד ביעד), לא מצטברת כמו מונה מילים.
 * מחזירה { challenge, justCompleted } — justCompleted=true רק במעבר
 * הראשון ל-completed (למניעת בונוס כפול/תג "ראשון" חוזר).
 */
export async function updateDailyChallengeProgress(uid, sessionStats) {
  const existing = await getOrCreateDailyChallenge(uid);
  if (existing.completed) return { challenge: existing, justCompleted: false };

  let progressDelta = 0;
  if (existing.metric === 'wordsPracticed') progressDelta = sessionStats.wordsPracticed || 0;
  else if (existing.metric === 'secondsPracticed') progressDelta = sessionStats.secondsPracticed || 0;
  else if (existing.metric === 'sessionAccuracy') {
    progressDelta = sessionStats.sessionAccuracy >= existing.target ? existing.target : 0;
  }

  const newProgress =
    existing.metric === 'sessionAccuracy' ? Math.max(existing.progress, progressDelta) : existing.progress + progressDelta;
  const completed = newProgress >= existing.target;

  const updates = { progress: newProgress, completed };
  const ref = doc(db, 'users', uid, 'dailyChallenge', existing.id);
  await setDoc(ref, updates, { merge: true });

  return { challenge: { ...existing, ...updates }, justCompleted: completed && !existing.completed };
}
