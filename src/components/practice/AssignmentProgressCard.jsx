import { Link } from 'react-router-dom';
import AssignmentStatus from './AssignmentStatus.jsx';

// כרטיס משימה ברשימת התרגול — שלב, פס שלבים, מילים ידועות ויעד יומי (לא אחוז)
export default function AssignmentProgressCard({ assignment, status }) {
  return (
    <Link
      to={`/practice/${assignment.assignmentId}`}
      className="block rounded-2xl bg-gradient-to-b from-white to-gray-50 shadow-lg p-4 space-y-2"
    >
      <p className="font-semibold text-brand-text truncate">{assignment.title}</p>
      <AssignmentStatus assignment={assignment} status={status} compact />
    </Link>
  );
}
