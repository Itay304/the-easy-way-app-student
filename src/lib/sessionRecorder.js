import { computeDeltas, writeProgressDeltas } from './progressSync.js';
import { applySessionGamification } from './api.js';
import { XP_CORRECT_ANSWER } from './gamification.js';

// כמה תשובות לצבור לפני שמירת ביניים. גם: מעבר לרקע (visibilitychange), "חזרה" וסוף הסבב.
export const FLUSH_EVERY = 3;

/**
 * שומר סשן תרגול תוך כדי, לא רק בסופו — כדי שיציאה באמצע (חזרה, סגירת האפליקציה, מעבר
 * לאפליקציה אחרת) לא תמחק את מה שהתלמיד כבר ענה. כל שמירה כותבת רק את מה שהשתנה מאז הקודמת:
 * התקדמות גלובלית (merge + increment), XP ורצף (applySessionGamification), ו-extraWritesFor —
 * כתיבות נוספות לאותו batch (מסמך ההתקדמות במשימה, ר' assignmentProgress.js).
 * השמירות רצות בתור אחת אחרי השנייה; אם כתיבה נכשלת — הסימון "נכתב" מבוטל והשמירה הבאה תנסה שוב.
 */
export function createSessionRecorder({ uid, assignmentId, extraWritesFor }) {
  let latest = [];
  const flushed = new Map(); // englishWord -> { c, t } שכבר נכתבו מעבר לבסיס
  let queue = Promise.resolve();
  const totals = { correct: 0, total: 0, xp: 0 };
  let gamification = null;

  const pending = () => computeDeltas(latest, flushed).reduce((sum, d) => sum + d.dTotal, 0);

  function flush() {
    queue = queue.then(async () => {
      const deltas = computeDeltas(latest, flushed);
      if (deltas.length === 0) return;
      for (const d of deltas) {
        const f = flushed.get(d.englishWord) || { c: 0, t: 0 };
        flushed.set(d.englishWord, { c: f.c + d.dCorrect, t: f.t + d.dTotal });
      }
      const dCorrect = deltas.reduce((s, d) => s + d.dCorrect, 0);
      const dTotal = deltas.reduce((s, d) => s + d.dTotal, 0);
      try {
        await writeProgressDeltas(uid, deltas, { assignmentId, extraWrites: extraWritesFor?.(deltas) });
      } catch (err) {
        for (const d of deltas) {
          const f = flushed.get(d.englishWord);
          flushed.set(d.englishWord, { c: f.c - d.dCorrect, t: f.t - d.dTotal });
        }
        console.error('[sessionRecorder] progress write failed, will retry:', err);
        return;
      }
      totals.correct += dCorrect;
      totals.total += dTotal;
      totals.xp += dCorrect * XP_CORRECT_ANSWER;
      try {
        gamification = await applySessionGamification(uid, {
          xpGained: dCorrect * XP_CORRECT_ANSWER,
          sessionCorrect: dCorrect,
          sessionTotal: dTotal,
        });
      } catch (err) {
        console.error('[sessionRecorder] XP/streak update failed:', err);
      }
    });
    return queue;
  }

  return {
    // מקבל את מצב הסשן המצטבר מהמודול (onProgress) — שומר כל FLUSH_EVERY תשובות
    update(session) {
      latest = session;
      if (pending() >= FLUSH_EVERY) flush();
    },
    flush,
    totals: () => ({ ...totals }),
    gamification: () => gamification,
  };
}
