import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase.js';

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
      // מרעננים בכפייה את ה-ID token לפני כל שימוש בו, בדיוק כמו
      // UserRoleManager.java ב-Android: ל-getMyAssignments (Cloud Function)
      // יש request.auth.token.institutionId — אם ה-token נשאר cached מלפני
      // סנכרון ה-Custom Claims (syncUserClaims), הקריאה "נכשלת בשקט" ומחזירה
      // assignments ריק, גם כשה-Firestore doc כבר מעודכן.
      firebaseUser.getIdToken(true).finally(() => setUser(firebaseUser));
    });
    return unsubAuth;
  }, []);

  useEffect(() => {
    if (!user) return undefined;

    setStatus('loading');
    // מזהה מעבר "אין institutionId עדיין" → "יש" בתוך אותה subscription (למשל
    // מיד אחרי הרשמה+joinClass) — לא רק את המצב ההתחלתי. משתמש חוזר שכבר
    // הצטרף לכיתה בעבר מקבל institutionId כבר ב-snapshot הראשון ולא נכנס
    // לכאן כלל, כי אין דבר לרענן (ה-token שלו כבר מסונכרן מפעם קודמת).
    let sawMissingInstitution = false;

    const unsubDoc = onSnapshot(
      doc(db, 'users', user.uid),
      async (snap) => {
        const data = snap.data() || {};
        const institutionId = data.institutionId || null;

        if (!institutionId) {
          sawMissingInstitution = true;
        } else if (sawMissingInstitution) {
          sawMissingInstitution = false;
          // syncUserClaims (functions/index.js, onDocumentWritten על users/{uid})
          // מסנכרן role/institutionId ל-Custom Claims באופן א-סינכרוני, אחרי
          // הכתיבה עצמה — לא בו-זמנית איתה. institutionId שכרגע הופיע ב-doc
          // (למשל דרך joinClass בהרשמה) לא בהכרח כבר השתקף ב-token הנוכחי;
          // בלי רענון כאן, הדף הבא (Home וכו') שקורא נתונים מסוננים לפי
          // request.auth.token.institutionId ייכשל ב-permission-denied מיד
          // אחרי הרשמה, גם כש-status כבר 'ready' וה-Firestore doc כבר נכון.
          await user.getIdToken(true);
        }

        const emailPrefix = user.email ? user.email.split('@')[0] : '';
        setProfile({
          role: data.role || 'student',
          institutionId,
          displayName: data.displayName || user.displayName || emailPrefix,
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
    return unsubDoc;
  }, [user]);

  return { status, user, profile };
}
