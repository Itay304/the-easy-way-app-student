import { Trophy } from 'lucide-react';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function LeaderboardCard({ topStudents, myRank, totalStudents, myUid }) {
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
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
                s.uid === myUid ? 'bg-brand-turquoise/10' : 'bg-brand-grey-light'
              }`}
            >
              <span className="w-6 text-center text-lg">{MEDALS[i] || i + 1}</span>
              <span className="flex-1 min-w-0 truncate font-medium text-brand-text">
                {s.displayName || 'תלמיד'}
              </span>
              <span className="text-sm font-bold text-brand-turquoise">{s.totalXp} XP</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
