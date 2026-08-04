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
      setUser(firebaseUser);
      if (!firebaseUser) {
        setProfile(null);
        setStatus('signed-out');
      }
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
        setProfile({
          role: data.role || 'student',
          institutionId,
          displayName: data.displayName || user.email,
          classIds: Array.isArray(data.classIds) ? data.classIds : [],
          totalXp: typeof data.totalXp === 'number' ? data.totalXp : 0,
          level: typeof data.level === 'number' ? data.level : 1,
          streak: typeof data.streak === 'number' ? data.streak : 0,
        });
        setStatus(institutionId ? 'ready' : 'no-institution');
      },
      () => setStatus('no-institution'),
    );
    return unsubDoc;
  }, [user]);

  return { status, user, profile };
}
