import { useEffect, useState } from 'react';
import { signOut } from 'firebase/auth';
import { LogOut, Flame, CheckCircle2 } from 'lucide-react';
import { auth } from '../firebase.js';
import { useAuth } from '../context/AuthContext.jsx';
import { callGetMyAssignments, getAllProgress, getClass, getInstitution } from '../lib/api.js';
import { computeAssignmentProgress } from '../lib/assignmentProgress.js';
import { levelProgress } from '../lib/gamification.js';
import { Skeleton } from '../components/Skeleton.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';

export default function Profile() {
  const { user, profile } = useAuth();
  const [className, setClassName] = useState(null);
  const [institutionName, setInstitutionName] = useState(null);
  const [completedCount, setCompletedCount] = useState(null);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError('');
      try {
        const [classDoc, institutionDoc, assignmentsRes, allProgress] = await Promise.all([
          profile.classIds.length > 0 ? getClass(profile.institutionId, profile.classIds[0]) : Promise.resolve(null),
          getInstitution(profile.institutionId),
          callGetMyAssignments(),
          getAllProgress(user.uid),
        ]);

        const active = assignmentsRes.data.assignments.filter((a) => a.status === 'active');
        const results = await Promise.all(active.map((a) => computeAssignmentProgress(allProgress, a)));
        const completed = results.filter((r) => r.total > 0 && r.completed >= r.total).length;

        if (!cancelled) {
          setClassName(classDoc?.name || null);
          setInstitutionName(institutionDoc?.name || null);
          setCompletedCount(completed);
        }
      } catch {
        if (!cancelled) setError('שגיאה בטעינת הפרופיל.');
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user, profile, reloadKey]);

  const { level, xpWithinLevel, xpRangeOfLevel } = levelProgress(profile.totalXp);
  const levelPct = xpRangeOfLevel > 0 ? Math.min(100, Math.round((xpWithinLevel / xpRangeOfLevel) * 100)) : 0;
  const initial = (profile.displayName || '?').trim().charAt(0).toUpperCase();

  return (
    <div className="px-4 pt-6 space-y-4">
      <h1 className="text-2xl font-bold text-brand-text">פרופיל</h1>

      {error && <ErrorBanner message={error} onRetry={() => setReloadKey((k) => k + 1)} />}

      <div className="rounded-2xl bg-white shadow-md p-6 flex flex-col items-center text-center">
        <div className="h-20 w-20 rounded-full bg-brand-turquoise text-white flex items-center justify-center text-3xl font-bold mb-3">
          {initial}
        </div>
        <p className="text-xl font-bold text-brand-text">{profile.displayName}</p>
        {className || institutionName ? (
          <p className="text-sm text-brand-grey-text mt-1">
            {className}
            {className && institutionName ? ' · ' : ''}
            {institutionName}
          </p>
        ) : (
          <Skeleton className="h-4 w-32 mt-2" />
        )}
      </div>

      <div className="rounded-2xl bg-white shadow-md p-5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-brand-text">רמה {level}</span>
          <span className="text-sm text-brand-grey-text">
            {xpWithinLevel} / {xpRangeOfLevel} XP
          </span>
        </div>
        <div className="h-2 rounded-full bg-brand-grey-light overflow-hidden">
          <div className="h-full bg-brand-turquoise rounded-full transition-all" style={{ width: `${levelPct}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white shadow-md p-4 flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
            <Flame size={22} strokeWidth={2.25} />
          </div>
          <div>
            <p className="text-xl font-bold text-brand-text leading-none">{profile.streak}</p>
            <p className="text-xs text-brand-grey-text mt-1">ימים ברצף</p>
          </div>
        </div>
        <div className="rounded-2xl bg-white shadow-md p-4 flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-brand-green/10 text-brand-green flex items-center justify-center shrink-0">
            <CheckCircle2 size={22} strokeWidth={2.25} />
          </div>
          <div>
            <p className="text-xl font-bold text-brand-text leading-none">
              {completedCount === null ? '—' : completedCount}
            </p>
            <p className="text-xs text-brand-grey-text mt-1">משימות הושלמו</p>
          </div>
        </div>
      </div>

      <button
        onClick={() => signOut(auth)}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-white shadow-md text-red-600 font-bold"
      >
        <LogOut size={18} />
        התנתקות
      </button>
    </div>
  );
}
