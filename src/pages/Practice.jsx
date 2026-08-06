import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { callGetMyAssignments, getAllProgress } from '../lib/api.js';
import { computeAssignmentMastery } from '../lib/assignmentMastery.js';
import { ListSkeleton } from '../components/Skeleton.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import AssignmentProgressCard from '../components/practice/AssignmentProgressCard.jsx';

export default function Practice() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState(null);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError('');
      try {
        const [assignmentsRes, allProgress] = await Promise.all([
          callGetMyAssignments(),
          getAllProgress(user.uid),
        ]);
        const active = assignmentsRes.data.assignments.filter((a) => a.status === 'active');
        const withProgress = await Promise.all(
          active.map(async (a) => ({ assignment: a, ...(await computeAssignmentMastery(allProgress, a)) })),
        );
        if (!cancelled) setAssignments(withProgress);
      } catch (err) {
        console.error('[Practice] load failed:', err);
        if (!cancelled) setError('שגיאה בטעינת המשימות.');
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user, reloadKey]);

  return (
    <div className="px-4 pt-6 space-y-5">
      <h1 className="text-2xl font-bold text-brand-text">תרגול</h1>

      {error && <ErrorBanner message={error} onRetry={() => setReloadKey((k) => k + 1)} />}

      {assignments && assignments.length > 0 && (
        <Link
          to="/sprint"
          className="flex items-center justify-center gap-2 rounded-2xl bg-amber-500 text-white font-bold py-4 shadow-md hover:opacity-90 transition"
        >
          <Zap size={20} strokeWidth={2.5} />
          ספרינט ⚡ — 10 מילים, 60 שניות
        </Link>
      )}

      {!assignments && !error && <ListSkeleton rows={4} />}

      {assignments && assignments.length === 0 && (
        <EmptyState icon={ClipboardList} title="אין משימות פעילות כרגע" subtitle="המורה שלך עוד לא הקצה משימות" />
      )}

      {assignments && assignments.length > 0 && (
        <div className="space-y-3">
          {assignments.map(({ assignment, mastered, total }) => (
            <AssignmentProgressCard
              key={assignment.assignmentId}
              assignment={assignment}
              mastered={mastered}
              total={total}
            />
          ))}
        </div>
      )}
    </div>
  );
}
