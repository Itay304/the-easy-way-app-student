import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { callGetMyAssignments } from '../lib/api.js';
import { loadAssignmentStatus } from '../lib/assignmentStatus.js';

/**
 * המשימות הפעילות של התלמיד, כל אחת עם מצב השלבים שלה — עמוד התרגול ומסך הבית במחשב.
 * enabled=false — לא טוען כלום (מסך הבית בטלפון לא מציג משימות).
 * מחזיר { assignments: null (טוען) | [{ assignment, status }], error, reload }.
 */
export default function useActiveAssignments(enabled = true) {
  const { user, profile } = useAuth();
  const [assignments, setAssignments] = useState(null);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;

    async function load() {
      setError('');
      try {
        const assignmentsRes = await callGetMyAssignments();
        const active = assignmentsRes.data.assignments.filter((a) => a.status === 'active');
        // מסמך התקדמות אחד לכל משימה (assignments/{id}/students/{uid}) — במקום כל ה-progress הגלובלי
        const withProgress = await Promise.all(
          active.map(async (a) => ({
            assignment: a,
            status: await loadAssignmentStatus(a, profile?.institutionId, user.uid),
          })),
        );
        if (!cancelled) setAssignments(withProgress);
      } catch (err) {
        console.error('[useActiveAssignments] load failed:', err);
        if (!cancelled) setError('שגיאה בטעינת המשימות.');
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [enabled, user, reloadKey, profile?.institutionId]);

  return { assignments, error, reload: () => setReloadKey((k) => k + 1) };
}
