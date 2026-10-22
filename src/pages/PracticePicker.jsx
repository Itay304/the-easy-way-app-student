import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Layers, ListChecks, PenLine, Link2, Search, Zap, BookOpen, PencilLine, Play } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { callGetMyAssignments } from '../lib/api.js';
import { loadAssignmentStatus } from '../lib/assignmentStatus.js';
import AssignmentStatus from '../components/practice/AssignmentStatus.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import Button from '../components/ui/Button.jsx';

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

// עמוד משימה: מצב השלבים + "התחל סבב" (תרגול מגוון, תמיד — המורה כבר לא בוחר מצב),
// ומתחת — "תרגול חופשי" ב-8 המודולים הבודדים על מילות המשימה (לא משפיע על השלבים).
export default function PracticePicker() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [assignment, setAssignment] = useState(undefined); // undefined = loading, null = not found
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    callGetMyAssignments()
      .then(async (res) => {
        if (cancelled) return;
        const found = res.data.assignments.find((a) => a.assignmentId === assignmentId);
        setAssignment(found || null);
        if (found) {
          const st = await loadAssignmentStatus(found, profile?.institutionId, user.uid);
          if (!cancelled) setStatus(st);
        }
      })
      .catch((err) => {
        console.error('[PracticePicker] load failed:', err);
        if (!cancelled) setError('שגיאה בטעינת המשימה.');
      });
    return () => {
      cancelled = true;
    };
  }, [assignmentId, user, profile?.institutionId]);

  function goBack() {
    if (window.history.state && window.history.state.idx > 0) navigate(-1);
    else navigate('/practice', { replace: true });
  }

  return (
    <div className="px-4 pt-6 space-y-5">
      <Button variant="ghost" size="sm" onClick={goBack}>
        <ArrowRight size={16} />
        חזרה לתרגול
      </Button>

      {error && <ErrorBanner message={error} />}

      {assignment === undefined && !error && <LoadingSpinner />}

      {assignment === null && !error && (
        <p className="text-brand-grey-text text-center py-12">המשימה לא נמצאה.</p>
      )}

      {assignment && (
        <>
          <h1 className="text-h1 font-bold text-brand-text">{assignment.title}</h1>

          {!status && <LoadingSpinner />}
          {status && (
            <div className="rounded-2xl bg-gradient-to-b from-white to-gray-50 shadow-lg p-5 space-y-4">
              <AssignmentStatus assignment={assignment} status={status} />
              {!status.progress.complete && (
                <Button size="lg" className="w-full" onClick={() => navigate(`/practice/${assignmentId}/varied`)}>
                  <Play size={18} className="fill-current" />
                  {status.sessionsToday >= status.goal.sessions ? 'סבב נוסף — בונוס XP' : 'התחל סבב'}
                </Button>
              )}
            </div>
          )}

          <h2 className="text-h3 font-bold text-brand-text pt-2">תרגול חופשי</h2>
          {/* 8 המודולים הבודדים על מילות המשימה — לא משנים את השלבים */}
            <div className="grid grid-cols-2 gap-3">
              {MODULES.map((m) => (
                <button
                  key={m.key}
                  onClick={() => navigate(`/practice/${assignmentId}/${m.key}`)}
                  className="aspect-square flex flex-col items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-white to-gray-50 shadow-lg p-4 hover:shadow-lg transition"
                >
                  <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 ${m.bg} ${m.text}`}>
                    <m.icon size={24} strokeWidth={2} />
                  </div>
                  <span className="font-semibold text-brand-text text-body-sm text-center leading-tight">{m.label}</span>
                </button>
              ))}
            </div>
        </>
      )}
    </div>
  );
}
