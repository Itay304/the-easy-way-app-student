import { useEffect, useState } from 'react';
import { Target, CheckCircle2 } from 'lucide-react';
import { getOrCreateDailyChallenge } from '../../lib/dailyChallenge.js';
import { Skeleton } from '../Skeleton.jsx';

function formatProgress(challenge) {
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

  if (challenge === undefined) return <Skeleton className="h-20 w-full rounded-2xl" />;
  if (!challenge) return null;

  const pct =
    challenge.metric === 'sessionAccuracy'
      ? challenge.completed
        ? 100
        : 0
      : Math.min(100, Math.round((challenge.progress / challenge.target) * 100));

  return (
    <div className="rounded-2xl bg-gradient-to-b from-white to-gray-50 shadow-lg p-4 space-y-2">
      <div className="flex items-center gap-2">
        <div
          className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
            challenge.completed ? 'bg-brand-green/10 text-brand-green' : 'bg-amber-50 text-amber-500'
          }`}
        >
          {challenge.completed ? <CheckCircle2 size={18} /> : <Target size={18} />}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-brand-grey-text">אתגר יומי ⚡</p>
          <p className="font-bold text-brand-text truncate">{challenge.label}</p>
        </div>
      </div>
      <div className="h-2 rounded-full bg-brand-grey-light overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${challenge.completed ? 'bg-brand-green' : 'bg-amber-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-brand-grey-text">{formatProgress(challenge)}</p>
    </div>
  );
}
