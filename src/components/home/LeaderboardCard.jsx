import { useLayoutEffect, useRef } from 'react';
import { Trophy } from 'lucide-react';

const MEDALS = ['🥇', '🥈', '🥉'];

function Avatar({ name }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  return (
    <span className="h-8 w-8 rounded-full bg-brand-turquoise text-white text-sm font-bold flex items-center justify-center shrink-0">
      {initial}
    </span>
  );
}

export default function LeaderboardCard({ topStudents, myRank, totalStudents, myUid }) {
  const rowRefs = useRef(new Map());
  const prevRectsRef = useRef(new Map());

  // FLIP ידני (ללא framer-motion): לוכדים את המיקום הקודם של כל שורה,
  // ואחרי שריאקט מעדכן את הסדר — מחילים טרנספורם הפוך ואז מאפסים אותו
  // עם transition, כך שהשורה "נגררת" חזותית למקומה החדש.
  useLayoutEffect(() => {
    const newRects = new Map();
    rowRefs.current.forEach((el, uid) => {
      if (el) newRects.set(uid, el.getBoundingClientRect());
    });

    rowRefs.current.forEach((el, uid) => {
      if (!el) return;
      const prev = prevRectsRef.current.get(uid);
      const next = newRects.get(uid);
      if (prev && next) {
        const deltaY = prev.top - next.top;
        if (deltaY !== 0) {
          el.style.transition = 'none';
          el.style.transform = `translateY(${deltaY}px)`;
          requestAnimationFrame(() => {
            el.style.transition = 'transform 0.5s ease';
            el.style.transform = '';
          });
        }
      }
    });

    prevRectsRef.current = newRects;
  }, [topStudents]);

  return (
    <section className="rounded-2xl bg-white shadow-md p-5">
      <div className="flex items-center gap-2 mb-1">
        <Trophy size={18} className="text-amber-500" />
        <h2 className="text-lg font-bold text-brand-text">טבלת מובילים</h2>
      </div>
      {myRank !== null && totalStudents !== null && (
        <p className="text-sm text-brand-grey-text mb-4">
          אתה במקום {myRank} מתוך {totalStudents}
        </p>
      )}

      {topStudents.length === 0 ? (
        <p className="text-sm text-brand-grey-text">אין עדיין נתונים.</p>
      ) : (
        <ul className="space-y-2">
          {topStudents.map((s, i) => (
            <li
              key={s.uid}
              ref={(el) => {
                if (el) rowRefs.current.set(s.uid, el);
                else rowRefs.current.delete(s.uid);
              }}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
                s.uid === myUid ? 'bg-brand-turquoise/10' : 'bg-brand-grey-light'
              }`}
            >
              <span className="w-6 text-center text-lg shrink-0">{MEDALS[i] || i + 1}</span>
              <Avatar name={s.displayName} />
              <span className="flex-1 min-w-0 truncate font-medium text-brand-text">
                {s.displayName || 'תלמיד'}
              </span>
              <span className="text-sm font-bold text-brand-turquoise shrink-0">{s.totalXp} XP</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
