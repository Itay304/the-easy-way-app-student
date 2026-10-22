import { CalendarClock, CheckCircle2, Gauge } from 'lucide-react';
import StageBar from './StageBar.jsx';

// תצוגת מצב משימה לתלמיד — בלי אחוז: שלב, פס שלבים, מילים ידועות, יעד יומי, ועם תאריך יעד — קצב.
// משותף לכרטיס ברשימת התרגול ולעמוד המשימה. status מ-lib/assignmentStatus.js.
export default function AssignmentStatus({ assignment, status, compact = false }) {
  const { progress, goal, sessionsToday } = status;
  const stageCount = progress.perStage.length;
  const goalDone = sessionsToday >= goal.sessions;

  return (
    <div className="space-y-2">
      {progress.complete ? (
        <p className="font-bold text-brand-green">כל המילים ידועות! 🎉</p>
      ) : (
        <p className="font-bold text-brand-text">
          שלב {progress.current + 1} מתוך {stageCount}
        </p>
      )}
      <StageBar progress={progress} />
      {/* "X מילים ידועות" רק כשיש לפחות אחת — ביום הראשון הפס עצמו מראה את ההתקדמות */}
      {progress.knownWords > 0 && (
        <p className="text-body-sm text-brand-grey-text">
          {progress.knownWords} מילים ידועות מתוך {progress.totalWords}
        </p>
      )}
      {!progress.complete && (
        <p className={`flex items-center gap-1.5 text-body-sm font-semibold ${goalDone ? 'text-brand-green' : 'text-brand-text'}`}>
          <CheckCircle2 size={16} className={goalDone ? '' : 'text-brand-grey-text'} />
          היום: סבב {Math.min(sessionsToday, goal.sessions)} מתוך {goal.sessions}
          {goalDone ? ' ✓' : ''}
        </p>
      )}
      {assignment.dueDateMs && (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-brand-grey-text">
          <span className="flex items-center gap-1">
            <CalendarClock size={14} />
            עד {new Date(assignment.dueDateMs).toLocaleDateString('he-IL')}
          </span>
          {!compact && goal.wordsPerDay > 0 && !progress.complete && (
            <span className="flex items-center gap-1">
              <Gauge size={14} />
              קצב: {goal.wordsPerDay} מילים חדשות ליום
            </span>
          )}
        </p>
      )}
    </div>
  );
}
