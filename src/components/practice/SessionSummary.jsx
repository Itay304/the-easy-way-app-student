import { PartyPopper, Star } from 'lucide-react';

export default function SessionSummary({ correctCount, total, xpGained, onDone }) {
  const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  return (
    <div className="px-4 pt-10 flex flex-col items-center text-center space-y-6">
      <div className="h-20 w-20 rounded-full bg-brand-turquoise/10 text-brand-turquoise flex items-center justify-center">
        <PartyPopper size={40} strokeWidth={2} />
      </div>

      <div>
        <h1 className="text-2xl font-bold text-brand-text">כל הכבוד!</h1>
        <p className="text-brand-grey-text mt-1">סיימת את התרגול</p>
      </div>

      <div className="w-full rounded-2xl bg-white shadow-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-brand-grey-text">תשובות נכונות</span>
          <span className="font-bold text-brand-text">
            {correctCount} מתוך {total} ({pct}%)
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-brand-grey-text">נקודות שהרווחת</span>
          <span className="flex items-center gap-1 font-bold text-brand-turquoise">
            <Star size={18} className="fill-brand-turquoise" />+{xpGained} XP
          </span>
        </div>
      </div>

      <button onClick={onDone} className="w-full py-4 rounded-xl bg-brand-turquoise text-white font-bold">
        סיום
      </button>
    </div>
  );
}
