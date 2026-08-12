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
      console.error('[DEBUG] onAuthStateChanged fired, uid =', firebaseUser?.uid);
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
      firebaseUser.getIdToken(true).finally(() => {
        console.error('[DEBUG] getIdToken(true) resolved, calling setUser, uid =', firebaseUser.uid);
        setUser(firebaseUser);
      });
    });
    return unsubAuth;
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    console.error('[DEBUG] subscribing onSnapshot for uid =', user.uid);

    setStatus('loading');
    const unsubDoc = onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        const data = snap.data() || {};
        const institutionId = data.institutionId || null;
        console.error('[DEBUG] onSnapshot delivered, exists =', snap.exists(), 'institutionId =', institutionId, 'fromCache =', snap.metadata.fromCache);
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
      (err) => {
        console.error('[DEBUG] onSnapshot ERROR:', err.code, err.message);
        setStatus('no-institution');
      },
    );
    return () => {
      console.error('[DEBUG] unsubscribing onSnapshot for uid =', user.uid);
      unsubDoc();
    };
  }, [user]);

  return { status, user, profile };
}
