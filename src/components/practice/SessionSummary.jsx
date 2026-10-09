import { PartyPopper, Star, CheckCircle2, XCircle, Award } from 'lucide-react';
import Confetti from './Confetti.jsx';
import Card from '../ui/Card.jsx';
import Button from '../ui/Button.jsx';

export default function SessionSummary({
  correctCount,
  total,
  xpGained,
  wordsMasteredCount = 0,
  assignmentMastered = null,
  assignmentTotal = null,
  onDone,
}) {
  const incorrectCount = Math.max(total - correctCount, 0);
  const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const assignmentPct = assignmentTotal > 0 ? Math.round((assignmentMastered / assignmentTotal) * 100) : null;

  return (
    <div className="px-4 pt-10 flex flex-col items-center text-center space-y-6">
      <Confetti count={70} durationMs={1500} />

      <div className="h-20 w-20 rounded-full bg-brand-turquoise/10 text-brand-turquoise flex items-center justify-center">
        <PartyPopper size={48} strokeWidth={2} />
      </div>

      <div>
        <h1 className="text-2xl font-bold text-brand-text">כל הכבוד! 🎉</h1>
        <p className="text-brand-grey-text mt-1">סיימת את התרגול</p>
      </div>

      {assignmentPct !== null && (
        <Card padding="p-5" className="w-full space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-brand-text">התקדמות במשימה</span>
            <span className="text-sm font-bold text-brand-turquoise">{assignmentPct}%</span>
          </div>
          <div className="h-2 rounded-full bg-brand-grey-light overflow-hidden">
            <div className="h-full bg-brand-turquoise rounded-full transition-all" style={{ width: `${assignmentPct}%` }} />
          </div>
          <p className="text-xs text-brand-grey-text">
            {assignmentMastered} מתוך {assignmentTotal} מילים נכבשו
          </p>
        </Card>
      )}

      <Card padding="p-6" className="w-full space-y-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-brand-grey-text">
            <CheckCircle2 size={16} className="text-brand-green" />
            תשובות נכונות
          </span>
          <span className="font-bold text-brand-text">
            {correctCount} מתוך {total} ({pct}%)
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-brand-grey-text">
            <XCircle size={16} className="text-brand-error" />
            תשובות שגויות
          </span>
          <span className="font-bold text-brand-text">{incorrectCount}</span>
        </div>
        {wordsMasteredCount > 0 && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-brand-grey-text">
              <Award size={16} className="text-amber-500" />
              מילים שנכבשו
            </span>
            <span className="font-bold text-brand-text">{wordsMasteredCount}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-brand-grey-text">נקודות שהרווחת</span>
          <span className="flex items-center gap-1 font-bold text-brand-turquoise">
            <Star size={16} className="fill-brand-turquoise" />+{xpGained} XP
          </span>
        </div>
      </Card>

      <Button size="lg" onClick={onDone}>
        סיום
      </Button>
    </div>
  );
}
