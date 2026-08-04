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
    const unsubDoc = onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        const data = snap.data() || {};
        const institutionId = data.institutionId || null;
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
