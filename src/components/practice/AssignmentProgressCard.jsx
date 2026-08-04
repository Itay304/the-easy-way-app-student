import { Link } from 'react-router-dom';
import { CalendarClock } from 'lucide-react';

export default function AssignmentProgressCard({ assignment, completed, total }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <Link
      to={`/practice/${assignment.assignmentId}`}
      className="block rounded-2xl bg-white shadow-md p-4"
    >
      <div className="flex items-center justify-between mb-2">
        <p className="font-semibold text-brand-text truncate">{assignment.title}</p>
        <span className="text-sm font-bold text-brand-turquoise shrink-0">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-brand-grey-light overflow-hidden">
        <div
          className="h-full bg-brand-turquoise rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      {assignment.dueDateMs && (
        <p className="flex items-center gap-1 text-xs text-brand-grey-text mt-2">
          <CalendarClock size={13} />
          עד {new Date(assignment.dueDateMs).toLocaleDateString('he-IL')}
        </p>
      )}
    </Link>
  );
}
