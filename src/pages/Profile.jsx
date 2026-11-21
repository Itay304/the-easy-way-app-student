import { useEffect, useState } from 'react';
import { signOut } from 'firebase/auth';
import { LogOut, Flame, CheckCircle2, Star, BookOpenCheck } from 'lucide-react';
import { auth } from '../firebase.js';
import { useAuth } from '../context/AuthContext.jsx';
import { callGetMyAssignments, getClass, getInstitution } from '../lib/api.js';
import { loadAssignmentStatus } from '../lib/assignmentStatus.js';
import { levelProgress } from '../lib/gamification.js';
import { getEarnedBadges } from '../lib/badges.js';
import { Skeleton } from '../components/Skeleton.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import BadgeGrid from '../components/profile/BadgeGrid.jsx';
import SettingsSection from '../components/profile/SettingsSection.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';

export default function Profile() {
  const { user, profile } = useAuth();
  const [className, setClassName] = useState(null);
  const [institutionName, setInstitutionName] = useState(null);
  const [completedCount, setCompletedCount] = useState(null);
  const [knownWords, setKnownWords] = useState(null);
  const [earnedBadgeIds, setEarnedBadgeIds] = useState(new Set());
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError('');
      try {
        const [classDoc, institutionDoc, assignmentsRes, badges] = await Promise.all([
          profile.classIds.length > 0 ? getClass(profile.institutionId, profile.classIds[0]) : Promise.resolve(null),
          getInstitution(profile.institutionId),
          callGetMyAssignments(),
          getEarnedBadges(user.uid),
        ]);

        const active = assignmentsRes.data.assignments.filter((a) => a.status === 'active');
        // משימה שהושלמה = כל המילים בה ידועות (ברמת המשימה)
        const results = await Promise.all(active.map((a) => loadAssignmentStatus(a, profile?.institutionId, user.uid)));
        const completed = results.filter((r) => r.progress.complete).length;
        // מילים ידועות — סכום המילים הידועות במשימות הפעילות (אותו "ידועה" כמו בעמוד המשימה)
        const known = results.reduce((sum, r) => sum + (r.progress.knownWords || 0), 0);

        if (!cancelled) {
          setClassName(classDoc?.name || null);
          setInstitutionName(institutionDoc?.name || null);
          setCompletedCount(completed);
          setKnownWords(known);
          setEarnedBadgeIds(new Set(badges.map((b) => b.id)));
        }
      } catch (err) {
        console.error('[Profile] load failed:', err);
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

  // פריסה: כותרת; כרטיס עליון לרוחב מלא (אווטאר, שם, בית ספר וכיתה, ופס הרמה בתוכו); שורת נתונים
  // (2 בטלפון, 4 במחשב); ואז תגים והגדרות (זה מתחת לזה בטלפון, זה לצד זה במחשב). התנתקות — בתוך כרטיס ההגדרות.
  return (
    <div className="px-4 pt-6 space-y-5 lg:space-y-6">
      <h1 className="text-h1 font-bold text-brand-text">פרופיל</h1>

      {error && <ErrorBanner message={error} onRetry={() => setReloadKey((k) => k + 1)} />}

      <Card
        padding="p-6 lg:p-8"
        className="flex flex-col items-center text-center lg:flex-row lg:items-center lg:gap-6 lg:text-right"
      >
        <div className="h-20 w-20 rounded-full bg-brand-turquoise text-white flex items-center justify-center text-display font-bold mb-3 shrink-0 lg:mb-0">
          {initial}
        </div>
        <div className="min-w-0 lg:flex-1">
          <p className="text-h2 font-bold text-brand-text">{profile.displayName}</p>
          {className || institutionName ? (
            <p className="text-body-sm text-brand-grey-text mt-1">
              {institutionName}
              {className && institutionName ? ' · ' : ''}
              {className}
            </p>
          ) : (
            <Skeleton className="h-4 w-32 mt-2 mx-auto lg:mx-0" />
          )}
        </div>
        <div className="w-full mt-5 space-y-2 lg:mt-0 lg:w-80 lg:shrink-0">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-brand-text">רמה {level}</span>
            {/* dir=ltr: כך זה נקרא "730 / 1300 XP" ולא "XP 1300 / 730" */}
            <span className="text-body-sm text-brand-grey-text" dir="ltr">
              {xpWithinLevel} / {xpRangeOfLevel} XP
            </span>
          </div>
          <div className="h-2 rounded-full bg-brand-grey-light overflow-hidden">
            <div
              className="h-full bg-brand-turquoise-light rounded-full transition-all"
              style={{ width: `${levelPct}%` }}
            />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-6">
        <StatCard icon={Flame} value={profile.streak} label="ימים ברצף" iconClassName="bg-amber-50 text-amber-600" />
        <StatCard
          icon={CheckCircle2}
          value={completedCount === null ? '—' : completedCount}
          label="משימות שהושלמו"
          accent="success"
        />
        <StatCard icon={Star} value={profile.totalXp} label="XP" accent="primary" />
        <StatCard
          icon={BookOpenCheck}
          value={knownWords === null ? '—' : knownWords}
          label="מילים ידועות"
          accent="primary"
        />
      </div>

      <div className="space-y-5 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6 lg:space-y-0">
        <BadgeGrid earnedIds={earnedBadgeIds} />

        <SettingsSection>
          <Button variant="danger-subtle" size="sm" onClick={() => signOut(auth)}>
            <LogOut size={16} />
            התנתקות
          </Button>
        </SettingsSection>
      </div>
    </div>
  );
}
