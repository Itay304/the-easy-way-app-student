import { useEffect, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { callGetMyAssignments, getAllProgress } from '../lib/api.js';
import { computeAssignmentProgress } from '../lib/assignmentProgress.js';
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
          active.map(async (a) => ({ assignment: a, ...(await computeAssignmentProgress(allProgress, a)) })),
        );
        if (!cancelled) setAssignments(withProgress);
      } catch {
        if (!cancelled) setError('שגיאה בטעינת המשימות.');
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user, reloadKey]);

  return (
    <div className="px-4 pt-6 space-y-4">
      <h1 className="text-2xl font-bold text-brand-text">תרגול</h1>

      {error && <ErrorBanner message={error} onRetry={() => setReloadKey((k) => k + 1)} />}

      {!assignments && !error && <ListSkeleton rows={4} />}

      {assignments && assignments.length === 0 && (
        <EmptyState icon={ClipboardList} title="אין משימות פעילות כרגע" subtitle="המורה שלך עוד לא הקצה משימות" />
      )}

      {assignments && assignments.length > 0 && (
        <div className="space-y-3">
          {assignments.map(({ assignment, completed, total }) => (
            <AssignmentProgressCard
              key={assignment.assignmentId}
              assignment={assignment}
              completed={completed}
              total={total}
            />
          ))}
        </div>
      )}
    </div>
  );
}
