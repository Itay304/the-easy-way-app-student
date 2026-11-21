import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { callGetMyAssignments, getAllProgress } from '../lib/api.js';
import { loadAssignmentStatus } from '../lib/assignmentStatus.js';
import { isMastered } from '../lib/gamification.js';
import { bucketIntoWeeks } from '../lib/dateUtils.js';
import { Skeleton } from '../components/Skeleton.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import MasteryLineChart from '../components/stats/MasteryLineChart.jsx';
import AssignmentDonut from '../components/stats/AssignmentDonut.jsx';
import WordRankList from '../components/stats/WordRankList.jsx';

const STRENGTHS_WEAKNESSES_LIMIT = 5;

export default function Statistics() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chartData, setChartData] = useState(null);
  const [donuts, setDonuts] = useState(null);
  const [strengths, setStrengths] = useState([]);
  const [weaknesses, setWeaknesses] = useState([]);
  const [hasAnyProgress, setHasAnyProgress] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const [assignmentsRes, allProgress] = await Promise.all([callGetMyAssignments(), getAllProgress(user.uid)]);

        const masteredTimestampsMs = allProgress
          .filter((p) => isMastered(p.correctAttempts || 0, p.totalAttempts || 0))
          .map((p) => (p.lastPracticed?.toMillis ? p.lastPracticed.toMillis() : null))
          .filter((ms) => ms !== null);

        const activeAssignments = assignmentsRes.data.assignments.filter((a) => a.status === 'active');
        // לכל משימה: מילים ידועות (ברמת המשימה) ושלב — לא אחוז
        const donutData = await Promise.all(
          activeAssignments.map(async (a) => {
            const { progress } = await loadAssignmentStatus(a, profile?.institutionId, user.uid);
            return { assignmentId: a.assignmentId, title: a.title, progress };
          }),
        );

        const attempted = allProgress.filter((p) => (p.totalAttempts || 0) > 0);
        const topStrengths = [...attempted]
          .sort((a, b) => (b.correctAttempts || 0) - (a.correctAttempts || 0))
          .slice(0, STRENGTHS_WEAKNESSES_LIMIT);
        const topWeaknesses = [...attempted]
          .sort((a, b) => (b.totalAttempts - b.correctAttempts || 0) - (a.totalAttempts - a.correctAttempts || 0))
          .slice(0, STRENGTHS_WEAKNESSES_LIMIT);

        if (!cancelled) {
          setChartData(bucketIntoWeeks(masteredTimestampsMs));
          setDonuts(donutData);
          setStrengths(topStrengths);
          setWeaknesses(topWeaknesses);
          setHasAnyProgress(attempted.length > 0);
        }
      } catch {
        if (!cancelled) setError('שגיאה בטעינת הסטטיסטיקות.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user, reloadKey, profile?.institutionId]);

  // טלפון: עמודה אחת כמו קודם. ממסך רחב (lg): הגרף לרוחב מלא, המשימות בשתי עמודות,
  // ו"החוזקות שלך" / "דורש תרגול נוסף" זו לצד זו.
  return (
    <div className="px-4 pt-6 space-y-5 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6 lg:space-y-0">
      <h1 className="text-h1 font-bold text-brand-text lg:col-span-full">סטטיסטיקות</h1>

      {error && (
        <div className="lg:col-span-full">
          <ErrorBanner message={error} onRetry={() => setReloadKey((k) => k + 1)} />
        </div>
      )}

      {loading && !error && (
        <div className="space-y-4 lg:col-span-full">
          <Skeleton className="h-56 !rounded-2xl" />
          <Skeleton className="h-24 !rounded-2xl" />
          <Skeleton className="h-56 !rounded-2xl" />
        </div>
      )}

      {!loading && !error && !hasAnyProgress && (
        <div className="lg:col-span-full">
          <EmptyState icon={BarChart3} title="עדיין אין נתוני תרגול" subtitle="תרגל/י מילים כדי לראות כאן סטטיסטיקות" />
        </div>
      )}

      {!loading && !error && hasAnyProgress && (
        <>
          <div className="lg:col-span-full">
            <MasteryLineChart data={chartData} />
          </div>

          {donuts.length > 0 && (
            <div className="lg:col-span-full">
              <h2 className="text-body-lg font-bold text-brand-text mb-3">התקדמות לפי משימה</h2>
              <div className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-4">
                {donuts.map((d) => (
                  <AssignmentDonut key={d.assignmentId} title={d.title} progress={d.progress} />
                ))}
              </div>
            </div>
          )}

          <WordRankList
            title="החוזקות שלך"
            icon={TrendingUp}
            iconClass="text-brand-green"
            items={strengths}
            valueLabel={(item) => `${item.correctAttempts} נכונות`}
          />

          <WordRankList
            title="דורש תרגול נוסף"
            icon={TrendingDown}
            iconClass="text-brand-error"
            items={weaknesses}
            valueLabel={(item) => `${item.totalAttempts - item.correctAttempts} שגיאות`}
          />
        </>
      )}
    </div>
  );
}
