import { useEffect, useState } from 'react';
import { Target, CheckCircle2 } from 'lucide-react';
import { getOrCreateDailyChallenge } from '../../lib/dailyChallenge.js';
import { Skeleton } from '../Skeleton.jsx';
import Card from '../ui/Card.jsx';

// היעד הושג — גם אם הדגל completed עוד לא עודכן בשרת (ההתקדמות יכולה לעבור את היעד)
function isReached(challenge) {
  if (challenge.completed) return true;
  return challenge.metric !== 'sessionAccuracy' && challenge.progress >= challenge.target;
}

// שורה קטנה אחרי שהיעד הושג: כמה תורגל היום בפועל (בלי "X מתוך יעד" מעל היעד)
function formatDoneExtra(challenge) {
  if (challenge.metric === 'secondsPracticed') {
    const minutes = Math.floor(challenge.progress / 60);
    return minutes > 0 ? `${minutes} דקות תרגול היום` : null;
  }
  if (challenge.metric === 'sessionAccuracy') return null;
  return challenge.progress > 0 ? `${challenge.progress} מילים היום` : null;
}

function formatProgress(challenge) {
  if (isReached(challenge)) return 'הושלם ✓';
  if (challenge.metric === 'secondsPracticed') {
    const minutes = Math.floor(challenge.progress / 60);
    const targetMinutes = Math.round(challenge.target / 60);
    return `${minutes} מתוך ${targetMinutes} דקות`;
  }
  if (challenge.metric === 'sessionAccuracy') {
    return challenge.completed ? 'הושלם!' : `יעד: ${Math.round(challenge.target * 100)}% בסשן אחד`;
  }
  return `${challenge.progress} מתוך ${challenge.target} מילים`;
}

export default function DailyChallengeCard({ uid }) {
  const [challenge, setChallenge] = useState(undefined); // undefined = טוען, null = שגיאה

  useEffect(() => {
    let cancelled = false;
    getOrCreateDailyChallenge(uid)
      .then((c) => {
        if (!cancelled) setChallenge(c);
      })
      .catch((err) => {
        console.error('[DailyChallengeCard] load failed:', err);
        if (!cancelled) setChallenge(null);
      });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  if (challenge === undefined) return <Skeleton className="h-20 w-full !rounded-2xl" />;
  if (!challenge) return null;

  const done = isReached(challenge);
  const doneExtra = done ? formatDoneExtra(challenge) : null;
  const pct = done
    ? 100
    : challenge.metric === 'sessionAccuracy'
      ? 0
      : Math.min(100, Math.round((challenge.progress / challenge.target) * 100));

  return (
    <Card padding="p-4" className="space-y-2">
      <div className="flex items-center gap-2">
        <div
          className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
            done ? 'bg-brand-green/10 text-brand-green' : 'bg-amber-50 text-amber-500'
          }`}
        >
          {done ? <CheckCircle2 size={16} /> : <Target size={16} />}
        </div>
        <div className="min-w-0">
          <p className="text-caption font-semibold text-brand-grey-text">אתגר יומי ⚡</p>
          <p className="font-bold text-brand-text truncate">{challenge.label}</p>
        </div>
      </div>
      <div className="h-2 rounded-full bg-brand-grey-light overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${done ? 'bg-brand-green' : 'bg-amber-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={`text-caption ${done ? 'font-semibold text-brand-green' : 'text-brand-grey-text'}`}>
        {formatProgress(challenge)}
        {doneExtra && <span className="font-normal text-brand-grey-text"> · {doneExtra}</span>}
      </p>
    </Card>
  );
}
