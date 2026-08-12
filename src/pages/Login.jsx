import { useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  deleteUser,
} from 'firebase/auth';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '../firebase.js';

export default function Login() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [classCode, setClassCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // תלמיד שמגיע מקישור הזמנה של המורה (?code=XXXX) — ממלאים את קוד הכיתה
  // מראש ומעבירים ישר למצב הרשמה, בלי שיצטרך למצוא/להקליד את הקוד בעצמו.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      setClassCode(code.toUpperCase());
      setMode('signup');
    }
  }, []);

  function switchMode() {
    setMode((m) => (m === 'login' ? 'signup' : 'login'));
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        try {
          await setDoc(doc(db, 'users', user.uid), {
            fullName,
            email,
            role: 'student',
            createdAt: serverTimestamp(),
            xp: 0,
            level: 1,
            streak: 0,
            totalActiveDays: 0,
            totalXp: 0,
            totalAttemptsCount: 0,
            totalCorrectAttempts: 0,
          });
          const joinClass = httpsCallable(functions, 'joinClass');
          // הפונקציה קוראת request.data.joinCode — לא code (ר' functions/index.js,
          // וגם JoinClassFragment.java באפליקציית האנדרואיד, שכבר משתמש בשם הנכון).
          await joinClass({ joinCode: classCode.trim().toUpperCase() });
        } catch (joinErr) {
          // דיבוג זמני — לראות בדיוק מה joinClass מחזיר בפרודקשן (code/message)
          // כשהצטרפות לכיתה בהרשמה נכשלת, לפני שמנחשים סיבה.
          console.error('[signup] joinClass failed:', joinErr.code, joinErr.message, joinErr);
          // הרשמה היא all-or-nothing: קוד כיתה שגוי/הגבלת קצב וכו' לא אמורים
          // להשאיר משתמש "יתום" — מחוברים אבל בלי כיתה, ובלי אפשרות לנסות
          // שוב עם אותו אימייל (auth/email-already-in-use). מוחקים את מה
          // שכבר נוצר ומעלים את השגיאה המקורית לטיפול ה-catch החיצוני.
          await deleteDoc(doc(db, 'users', user.uid)).catch(() => {});
          await deleteUser(user).catch(() => {});
          throw joinErr;
        }
      }
    } catch (err) {
      if (mode === 'login') {
        setError('אימייל או סיסמה שגויים.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('כתובת האימייל כבר רשומה. התחבר במקום זאת.');
      } else if (err.code === 'auth/weak-password') {
        setError('הסיסמה חייבת להכיל לפחות 6 תווים.');
      } else if (err.code && err.code.startsWith('functions/')) {
        // joinClass (functions/index.js) זורק HttpsError עם הודעות עברית
        // מוכנות (קוד לא נמצא / הגבלת קצב וכו') — מציגים אותן ישירות במקום
        // להתאים תבנית לטקסט אנגלי שלעולם לא מופיע בהודעה בפועל.
        setError(err.message || 'קוד הכיתה אינו תקין. בקש מהמורה קוד חדש.');
      } else {
        setError('שגיאה בהרשמה. נסו שנית.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 py-12">
      <img src="/icons/icon-192.png" alt="EasyLex" className="h-20 w-20 rounded-2xl shadow-md mb-6" />
      <h1 className="text-2xl font-bold text-brand-text mb-2">EasyLex — תלמיד</h1>
      <p className="text-brand-grey-text text-sm mb-8">
        {mode === 'login' ? 'ברוך הבא! התחבר כדי להמשיך' : 'צור חשבון חדש'}
      </p>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        {mode === 'signup' && (
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="שם מלא"
            className="w-full rounded-xl border border-black/10 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-turquoise"
          />
        )}
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="אימייל"
          className="w-full rounded-xl border border-black/10 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-turquoise"
        />
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="סיסמה"
          className="w-full rounded-xl border border-black/10 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-turquoise"
        />
        {mode === 'signup' && (
          <input
            type="text"
            required
            value={classCode}
            onChange={(e) => setClassCode(e.target.value.toUpperCase())}
            placeholder="קוד כיתה"
            maxLength={8}
            className="w-full rounded-xl border border-black/10 px-4 py-3 text-center font-mono focus:outline-none focus:ring-2 focus:ring-brand-turquoise"
          />
        )}
        {error && <p className="text-red-600 text-sm text-center">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-turquoise-400 to-turquoise-600 text-white font-bold text-lg hover:opacity-90 transition disabled:opacity-60"
        >
          {submitting ? '...' : mode === 'login' ? 'כניסה' : 'הרשמה'}
        </button>
        <button type="button" onClick={switchMode} className="w-full text-sm text-brand-grey-text hover:text-brand-text underline">
          {mode === 'login' ? 'אין לך חשבון? הירשם' : 'כבר יש לך חשבון? התחבר'}
        </button>
      </form>
    </div>
  );
}
