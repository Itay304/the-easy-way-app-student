import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Layers, ListChecks, PenLine, Link2 } from 'lucide-react';
import { callGetMyAssignments } from '../lib/api.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';

const MODULES = [
  { key: 'flashcards', label: 'כרטיסיות', icon: Layers },
  { key: 'quiz', label: 'מבחן', icon: ListChecks },
  { key: 'spelling', label: 'איות', icon: PenLine },
  { key: 'matching', label: 'התאמה', icon: Link2 },
];

export default function PracticePicker() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState(undefined); // undefined = loading, null = not found
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    callGetMyAssignments()
      .then((res) => {
        if (cancelled) return;
        const found = res.data.assignments.find((a) => a.assignmentId === assignmentId);
        setAssignment(found || null);
      })
      .catch((err) => {
        console.error('[PracticePicker] load failed:', err);
        if (!cancelled) setError('שגיאה בטעינת המשימה.');
      });
    return () => {
      cancelled = true;
    };
  }, [assignmentId]);

  function goBack() {
    if (window.history.state && window.history.state.idx > 0) navigate(-1);
    else navigate('/practice', { replace: true });
  }

  return (
    <div className="px-4 pt-6 space-y-4">
      <button
        onClick={goBack}
        className="inline-flex items-center gap-1 text-sm text-brand-grey-text hover:text-brand-text"
      >
        <ArrowRight size={16} />
        חזרה לתרגול
      </button>

      {error && <ErrorBanner message={error} />}

      {assignment === undefined && !error && <LoadingSpinner />}

      {assignment === null && !error && (
        <p className="text-brand-grey-text text-center py-12">המשימה לא נמצאה.</p>
      )}

      {assignment && (
        <>
          <div>
            <h1 className="text-2xl font-bold text-brand-text">{assignment.title}</h1>
            <p className="text-brand-grey-text mt-1">איך תרצה לתרגל?</p>
          </div>

          <div className="space-y-3">
            {MODULES.map((m) => (
              <button
                key={m.key}
                onClick={() => navigate(`/practice/${assignmentId}/${m.key}`)}
                className="w-full flex items-center gap-4 rounded-2xl bg-white shadow-md p-5 hover:shadow-lg transition text-right"
              >
                <div className="h-12 w-12 rounded-xl bg-brand-turquoise/10 text-brand-turquoise flex items-center justify-center shrink-0">
                  <m.icon size={24} strokeWidth={2.25} />
                </div>
                <span className="font-semibold text-brand-text text-lg">{m.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
