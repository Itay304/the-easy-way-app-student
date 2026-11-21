import { Link, useNavigate } from 'react-router-dom';
import { ClipboardList, Play } from 'lucide-react';
import useActiveAssignments from '../../hooks/useActiveAssignments.js';
import AssignmentStatus from '../practice/AssignmentStatus.jsx';
import { ListSkeleton } from '../Skeleton.jsx';
import ErrorBanner from '../ErrorBanner.jsx';
import Button from '../ui/Button.jsx';

// "המשימות שלי" במסך הבית — רק במסך רחב (768px ומעלה; בטלפון המשימות נמצאות בטאב "תרגול").
// לכל משימה: שלב והתקדמות, וכפתור "מתחילים סבב" ישירות מהבית (אותו טקסט ואותה לוגיקה כמו בעמוד המשימה).
export default function HomeAssignments({ enabled }) {
  const navigate = useNavigate();
  const { assignments, error, reload } = useActiveAssignments(enabled);

  return (
    <section aria-labelledby="home-assignments-title" className="space-y-3">
      <h2 id="home-assignments-title" className="text-h2 font-bold text-brand-text">
        המשימות שלי
      </h2>

      {error && <ErrorBanner message={error} onRetry={reload} />}
      {!assignments && !error && <ListSkeleton rows={2} />}

      {assignments && assignments.length === 0 && (
        <div className="rounded-2xl bg-gradient-to-b from-white to-gray-50 shadow-lg p-6 flex items-center gap-3 text-brand-grey-text">
          <ClipboardList size={22} aria-hidden="true" />
          אין משימות פעילות כרגע — המורה שלך עוד לא הקצה משימות.
        </div>
      )}

      {assignments?.map(({ assignment, status }) => (
        <div
          key={assignment.assignmentId}
          className="rounded-2xl bg-gradient-to-b from-white to-gray-50 shadow-lg p-5 space-y-4"
        >
          <Link
            to={`/practice/${assignment.assignmentId}`}
            className="block font-bold text-body-lg text-brand-text hover:text-brand-turquoise transition truncate"
          >
            {assignment.title}
          </Link>
          <AssignmentStatus assignment={assignment} status={status} compact />
          {!status.progress.complete && (
            <Button
              size="lg"
              className="w-full"
              onClick={() => navigate(`/practice/${assignment.assignmentId}/varied`)}
            >
              <Play size={18} className="fill-current" aria-hidden="true" />
              {status.sessionsToday >= status.goal.sessions ? 'סבב נוסף — בונוס XP' : 'מתחילים סבב'}
            </Button>
          )}
        </div>
      ))}
    </section>
  );
}
