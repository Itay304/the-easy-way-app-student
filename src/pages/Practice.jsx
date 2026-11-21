import { Link } from 'react-router-dom';
import { ClipboardList, Zap } from 'lucide-react';
import useActiveAssignments from '../hooks/useActiveAssignments.js';
import { ListSkeleton } from '../components/Skeleton.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import AssignmentProgressCard from '../components/practice/AssignmentProgressCard.jsx';

export default function Practice() {
  const { assignments, error, reload } = useActiveAssignments();

  return (
    <div className="px-4 pt-6 space-y-5">
      <h1 className="text-h1 font-bold text-brand-text">תרגול</h1>

      {error && <ErrorBanner message={error} onRetry={reload} />}

      {assignments && assignments.length > 0 && (
        <Link
          to="/sprint"
          className="flex items-center justify-center gap-2 rounded-2xl bg-amber-700 text-white font-bold py-4 shadow-md hover:opacity-90 transition md:max-w-md"
        >
          <Zap size={20} strokeWidth={2} />
          ספרינט ⚡ — 10 מילים, 60 שניות
        </Link>
      )}

      {!assignments && !error && <ListSkeleton rows={4} />}

      {assignments && assignments.length === 0 && (
        <EmptyState icon={ClipboardList} title="אין משימות פעילות כרגע" subtitle="המורה שלך עוד לא הקצה משימות" />
      )}

      {assignments && assignments.length > 0 && (
        <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-2 md:gap-4">
          {assignments.map(({ assignment, status }) => (
            <AssignmentProgressCard key={assignment.assignmentId} assignment={assignment} status={status} />
          ))}
        </div>
      )}
    </div>
  );
}
