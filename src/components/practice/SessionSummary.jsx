import { PartyPopper, Star, CheckCircle2, XCircle, Award, Sparkles, RotateCcw, BookOpenCheck } from 'lucide-react';
import StageBar from './StageBar.jsx';
import Confetti from './Confetti.jsx';
import Card from '../ui/Card.jsx';
import Button from '../ui/Button.jsx';
import InstallBanner from '../InstallBanner.jsx';

export default function SessionSummary({
  correctCount,
  total,
  xpGained,
  wordsMasteredCount = 0,
  stageSummary = null, // רק בסבב של משימה (PracticeSession): מה נלמד היום, מה חוזר מחר, שלב ויעד יומי
  onDone,
}) {
  const incorrectCount = Math.max(total - correctCount, 0);
  const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  return (
    <div className="px-4 pt-10 flex flex-col items-center text-center space-y-6 lg:px-10">
      <Confetti count={70} durationMs={1500} />

      <div className="h-20 w-20 rounded-full bg-brand-turquoise/10 text-brand-turquoise flex items-center justify-center">
        <PartyPopper size={48} strokeWidth={2} />
      </div>

      <div>
        <h1 className="text-h1 font-bold text-brand-text lg:text-display">כל הכבוד! 🎉</h1>
        <p className="text-brand-grey-text mt-1">סיימת את התרגול</p>
      </div>

      {stageSummary && (
        <Card padding="p-5 lg:px-8" className="w-full space-y-3 text-right">
          <p className="font-bold text-brand-text">מה למדת היום</p>
          {stageSummary.learned.length > 0 && (
            <div className="flex items-start gap-2">
              <Sparkles size={18} className="mt-0.5 shrink-0 text-amber-500" />
              <div>
                <p className="text-brand-text">
                  {stageSummary.learned.length === 1 ? 'מילה אחת הפכה לידועה' : `${stageSummary.learned.length} מילים הפכו לידועות`}
                </p>
                <p dir="ltr" className="text-body-sm text-brand-grey-text text-right">
                  {stageSummary.learned.slice(0, 8).join(' · ')}
                  {stageSummary.learned.length > 8 ? ' …' : ''}
                </p>
              </div>
            </div>
          )}
          {stageSummary.firstSeen > 0 && (
            <p className="flex items-center gap-2 text-brand-text">
              <BookOpenCheck size={18} className="shrink-0 text-brand-turquoise" />
              {stageSummary.firstSeen} מילים חדשות
            </p>
          )}
          {stageSummary.tomorrowReview > 0 && (
            <p className="flex items-center gap-2 text-brand-text">
              <RotateCcw size={18} className="shrink-0 text-brand-turquoise" />
              מחר חוזרות {stageSummary.tomorrowReview} מילים לבדיקה
            </p>
          )}
          <div className="space-y-1.5 border-t border-black/5 pt-3">
            <p className="text-body-sm font-semibold text-brand-text">
              {stageSummary.progress.complete
                ? 'כל המילים ידועות! 🎉'
                : `שלב ${stageSummary.progress.current + 1} מתוך ${stageSummary.progress.perStage.length}`}
            </p>
            <StageBar progress={stageSummary.progress} />
            <p className="text-body-sm text-brand-grey-text">
              {stageSummary.progress.knownWords} מילים ידועות מתוך {stageSummary.progress.totalWords}
            </p>
            <p className="text-body-sm font-semibold text-brand-green">
              היום: סבב {Math.min(stageSummary.sessionsToday, stageSummary.goalSessions)} מתוך {stageSummary.goalSessions}
              {stageSummary.sessionsToday >= stageSummary.goalSessions ? ' ✓' : ''}
            </p>
          </div>
        </Card>
      )}

      <Card padding="p-6 lg:px-10" className="w-full space-y-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-brand-grey-text lg:gap-3">
            <CheckCircle2 size={16} className="text-brand-green" />
            תשובות נכונות
          </span>
          <span className="font-bold text-brand-text">
            {correctCount} מתוך {total} ({pct}%)
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-brand-grey-text lg:gap-3">
            <XCircle size={16} className="text-brand-error" />
            תשובות שגויות
          </span>
          <span className="font-bold text-brand-text">{incorrectCount}</span>
        </div>
        {wordsMasteredCount > 0 && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-brand-grey-text lg:gap-3">
              <Award size={16} className="text-amber-500" />
              מילים שנכבשו
            </span>
            <span className="font-bold text-brand-text">{wordsMasteredCount}</span>
          </div>
        )}
        {stageSummary?.extraSessionXp > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-brand-grey-text">בונוס סבב נוסף</span>
            <span className="font-bold text-brand-turquoise">+{stageSummary.extraSessionXp} XP</span>
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

      <InstallBanner />
    </div>
  );
}
