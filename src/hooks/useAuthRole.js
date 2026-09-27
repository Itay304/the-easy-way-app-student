import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase.js';

// syncUserClaims (functions/index.js, onDocumentWritten על users/{uid}) מסנכרן
// role/institutionId ל-Custom Claims א-סינכרונית, אחרי הכתיבה שקבעה אותם —
// לא בו-זמנית איתה, ולפעמים עם עיכוב ניכר (cold start של ה-Cloud Function).
// רענון כפוי בודד מיד עם הופעת institutionId לא מספיק תמיד: אם syncUserClaims
// עוד לא סיים לרוץ בצד שרת, הרענון עצמו מביא טוקן שעדיין חסר את ה-claim.
// פונקציה זו בודקת תחילה את הטוקן הקיים (זול, בלי רשת — המקרה הנפוץ:
// משתמש חוזר שה-claims שלו כבר מסונכרנים מפעם קודמת), ורק אם יש אי-התאמה
// מנסה שוב עם רענון כפוי ופער זמן גדל, עד שה-claim בפועל תואם את המסמך.
const CLAIM_RETRY_DELAYS_MS = [300, 800, 1500];

async function ensureInstitutionClaimMatches(user, institutionId) {
  let result = await user.getIdTokenResult();
  if (result.claims.institutionId === institutionId) return;

  for (const delayMs of CLAIM_RETRY_DELAYS_MS) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    result = await user.getIdTokenResult(true);
    if (result.claims.institutionId === institutionId) return;
  }
}

// status: 'loading' | 'signed-out' | 'no-institution' | 'ready'
export default function useAuthRole() {
  const [status, setStatus] = useState('loading');
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null); // { role, institutionId, displayName, classIds, totalXp, streak, level }

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setProfile(null);
        setStatus('signed-out');
        return;
      }
      firebaseUser.getIdToken(true).finally(() => setUser(firebaseUser));
    });
    return unsubAuth;
  }, []);

  useEffect(() => {
    if (!user) return undefined;

    setStatus('loading');
    let cancelled = false;

    const unsubDoc = onSnapshot(
      doc(db, 'users', user.uid),
      async (snap) => {
        const data = snap.data() || {};
        const institutionId = data.institutionId || null;

        if (institutionId) {
          await ensureInstitutionClaimMatches(user, institutionId);
          if (cancelled) return;
        }

        const emailPrefix = user.email ? user.email.split('@')[0] : '';
        setProfile({
          role: data.role || 'student',
          institutionId,
          // fullName הוא השדה שההרשמה כותבת בפועל (Login.jsx) — displayName
          // נשמר כ-fallback ראשון רק כי חלק מהמסמכים הישנים/אחרים כן משתמשים
          // בו (ר' audit/REPORT.md #1: פער fullName/displayName).
          displayName: data.displayName || data.fullName || user.displayName || emailPrefix,
          classIds: Array.isArray(data.classIds) ? data.classIds : [],
          totalXp: typeof data.totalXp === 'number' ? data.totalXp : 0,
          level: typeof data.level === 'number' ? data.level : 1,
          streak: typeof data.streak === 'number' ? data.streak : 0,
          lastActiveDate: data.lastActiveDate || null,
          totalActiveDays: typeof data.totalActiveDays === 'number' ? data.totalActiveDays : 0,
        });
        setStatus(institutionId ? 'ready' : 'no-institution');
      },
      () => setStatus('no-institution'),
    );
    return () => {
      cancelled = true;
      unsubDoc();
    };
  }, [user]);

  return { status, user, profile };
}
