import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Layers, ListChecks, PenLine, Link2, Search, Zap, BookOpen, PencilLine, Shuffle } from 'lucide-react';
import { callGetMyAssignments } from '../lib/api.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';

const MODULES = [
  { key: 'flashcards', label: 'כרטיסיות', icon: Layers, bg: 'bg-brand-turquoise/10', text: 'text-brand-turquoise' },
  { key: 'quiz', label: 'מבחן', icon: ListChecks, bg: 'bg-blue-50', text: 'text-blue-600' },
  { key: 'spelling', label: 'איות', icon: PenLine, bg: 'bg-purple-50', text: 'text-purple-600' },
  { key: 'matching', label: 'התאמה', icon: Link2, bg: 'bg-brand-green/10', text: 'text-brand-green' },
  { key: 'whoami', label: 'מי אני?', icon: Search, bg: 'bg-amber-50', text: 'text-amber-600' },
  { key: 'truefalse', label: 'נכון/לא נכון', icon: Zap, bg: 'bg-pink-50', text: 'text-pink-600' },
  { key: 'whatmeans', label: 'מה המשמעות?', icon: BookOpen, bg: 'bg-indigo-50', text: 'text-indigo-600' },
  { key: 'fillsentence', label: 'השלמת משפט', icon: PencilLine, bg: 'bg-cyan-50', text: 'text-cyan-600' },
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
            <p className="text-brand-grey-text mt-1">
              {assignment.practiceMode === 'varied' ? 'המורה הכין לך תרגול מגוון' : 'איך תרצה לתרגל?'}
            </p>
          </div>

          {assignment.practiceMode === 'varied' ? (
            <button
              onClick={() => navigate(`/practice/${assignmentId}/varied`)}
              className="w-full flex flex-col items-center gap-3 rounded-2xl bg-white shadow-md p-8 hover:shadow-lg transition"
            >
              <div className="h-16 w-16 rounded-2xl bg-brand-turquoise/10 text-brand-turquoise flex items-center justify-center">
                <Shuffle size={32} strokeWidth={2.25} />
              </div>
              <span className="font-bold text-brand-text text-lg">התחל תרגול מגוון 🎯</span>
              <p className="text-sm text-brand-grey-text text-center">
                כל 5 מילים תעברו למודול תרגול אחר — כרטיסיות, מבחן, נכון/לא נכון ואיות, לסירוגין
              </p>
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {MODULES.map((m) => (
                <button
                  key={m.key}
                  onClick={() => navigate(`/practice/${assignmentId}/${m.key}`)}
                  className="aspect-square flex flex-col items-center justify-center gap-2 rounded-2xl bg-white shadow-md p-4 hover:shadow-lg transition"
                >
                  <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 ${m.bg} ${m.text}`}>
                    <m.icon size={28} strokeWidth={2.25} />
                  </div>
                  <span className="font-semibold text-brand-text text-sm text-center leading-tight">{m.label}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
