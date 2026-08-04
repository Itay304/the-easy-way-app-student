export function toDateKey(msOrDate) {
  const d = msOrDate instanceof Date ? msOrDate : new Date(msOrDate);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function daysAgo(ms) {
  if (ms === null || ms === undefined) return Infinity;
  return Math.floor((Date.now() - ms) / (24 * 60 * 60 * 1000));
}

/**
 * "מילים נכבשות לאורך זמן" — אותה טכניקה כמו InstitutionalStatsViewModel
 * (Android): אין לוג היסטורי אמיתי, רק lastPracticed נוכחי לכל מילה.
 * מחלקים כל מילה-נכבשת-כרגע ל-1 מתוך 8 דליי שבועיים לפי lastPracticed,
 * ואז סכום מצטבר. זה "מתי תורגלה לאחרונה", לא "מתי נכבשה בפועל" —
 * מגבלה מובנית של מודל הנתונים, לא באג.
 */
export function bucketIntoWeeks(masteredTimestampsMs, weeks = 8) {
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const windowStart = now - weeks * weekMs;
  const perWeek = new Array(weeks).fill(0);

  masteredTimestampsMs.forEach((ms) => {
    const idx =
      ms <= windowStart ? 0 : Math.min(weeks - 1, Math.floor((ms - windowStart) / weekMs));
    perWeek[idx]++;
  });

  let cumulative = 0;
  return perWeek.map((count, i) => {
    cumulative += count;
    return { label: `ש${i + 1}`, mastered: cumulative };
  });
}
