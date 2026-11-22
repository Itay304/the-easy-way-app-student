import { useEffect, useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, deleteUser } from 'firebase/auth';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '../firebase.js';
import Input from '../components/ui/Input.jsx';
import Button from '../components/ui/Button.jsx';
import TermsCheckbox from '../components/consent/TermsCheckbox.jsx';
import { friendlyError } from '../lib/errors.js';
import { studentConsentFields, TERMS_REQUIRED_ERROR } from '../lib/consent.js';
import {
  normalizeJoinCode,
  joinErrorMessage,
  isCheckUnavailable,
  JOIN_MESSAGES,
  NETWORK_MESSAGE,
} from '../lib/classJoin.js';

// אם ההצטרפות לכיתה נכשלת אחרי שהחשבון נוצר, מבטלים את החשבון — ובזמן הזה האפליקציה מחליפה מסך
// (נכנס → יצא) ו-Login נטען מחדש. ההודעה וערכי הטופס (בלי סיסמה) נשמרים כאן כדי שיופיעו שוב.
const SIGNUP_ERROR_KEY = 'easylex_signup_error';

export default function Login() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [classCode, setClassCode] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState('');
  const [classCodeError, setClassCodeError] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // תלמיד שמגיע מקישור הזמנה של המורה (?code=XXXX) — ממלאים את קוד הכיתה
  // מראש ומעבירים ישר למצב הרשמה, בלי שיצטרך למצוא/להקליד את הקוד בעצמו.
  useEffect(() => {
    // שגיאת הצטרפות מניסיון הרשמה שבוטל (ר' SIGNUP_ERROR_KEY)
    try {
      const saved = JSON.parse(sessionStorage.getItem(SIGNUP_ERROR_KEY) || 'null');
      if (saved) {
        sessionStorage.removeItem(SIGNUP_ERROR_KEY);
        setMode('signup');
        setFullName(saved.fullName || '');
        setEmail(saved.email || '');
        setClassCode(saved.classCode || '');
        if (saved.field === 'classCode') setClassCodeError(saved.message);
        else setError(saved.message);
        return;
      }
    } catch {
      // sessionStorage חסום — פשוט ממשיכים
    }
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
    setTermsError('');
    setClassCodeError('');
  }

  function showJoinError(err) {
    const r = joinErrorMessage(err);
    if (r.field === 'classCode') setClassCodeError(r.message);
    else setError(r.message);
    return r;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setClassCodeError('');
    if (mode === 'login') {
      setSubmitting(true);
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (err) {
        setError(err?.code === 'auth/network-request-failed' ? NETWORK_MESSAGE : 'אימייל או סיסמה שגויים.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // ---- הרשמה ----
    // הרשמה בלי אישור התקנון — לא נשלחת בכלל
    if (!termsAccepted) {
      setTermsError(TERMS_REQUIRED_ERROR);
      return;
    }
    setTermsError('');
    const joinCode = normalizeJoinCode(classCode);
    setClassCode(joinCode);
    if (!joinCode) {
      setClassCodeError(JOIN_MESSAGES.missing);
      return;
    }
    setSubmitting(true);

    // 1. בודקים את הקוד לפני שיוצרים חשבון — קוד שגוי / כיתה סגורה / מוסד שלא מקבל תלמידים לא יוצרים חשבון בכלל
    try {
      await httpsCallable(functions, 'checkClassCode')({ joinCode });
    } catch (err) {
      if (isCheckUnavailable(err)) {
        // שרת בלי checkClassCode (גרסה קודמת) — ממשיכים; joinClass בודק את הקוד ומבטל את החשבון אם צריך
        console.warn('[signup] checkClassCode unavailable, falling back to join + rollback', err?.code);
      } else {
        showJoinError(err);
        setSubmitting(false);
        return;
      }
    }

    // 2. יצירת החשבון והצטרפות. אם ההצטרפות בכל זאת נכשלת (למשל הכיתה נסגרה ברגע הזה) — מבטלים הכל.
    let user;
    try {
      ({ user } = await createUserWithEmailAndPassword(auth, email, password));
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') setError('כתובת האימייל כבר רשומה. התחבר במקום זאת.');
      else if (err.code === 'auth/weak-password') setError('הסיסמה חייבת להכיל לפחות 6 תווים.');
      else if (err.code === 'auth/invalid-email') setError('כתובת האימייל לא תקינה.');
      else if (err.code === 'auth/network-request-failed') setError(NETWORK_MESSAGE);
      else setError(friendlyError(err, { context: 'createUser' }));
      setSubmitting(false);
      return;
    }
    try {
      await setDoc(doc(db, 'users', user.uid), {
        fullName,
        displayName: fullName, // ר' audit/REPORT.md #1 — כל קוד קורא מ-displayName
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
        ...studentConsentFields(), // termsAcceptedAt (זמן שרת), termsVersion, marketingConsent: false
      });
      // הפונקציה קוראת request.data.joinCode — לא code (ר' functions/index.js, וגם JoinClassFragment.java)
      await httpsCallable(functions, 'joinClass')({ joinCode });
    } catch (joinErr) {
      // all-or-nothing: לא משאירים חשבון "חצי רשום" (מחובר בלי כיתה, ובלי אפשרות לנסות שוב עם אותו אימייל)
      const r = joinErrorMessage(joinErr);
      try {
        sessionStorage.setItem(SIGNUP_ERROR_KEY, JSON.stringify({ ...r, fullName, email, classCode: joinCode }));
      } catch {
        // sessionStorage חסום — ההודעה תוצג רק אם המסך לא נטען מחדש
      }
      await deleteDoc(doc(db, 'users', user.uid)).catch(() => {});
      await deleteUser(user).catch((e) => console.error('[signup] rollback deleteUser failed', e?.code));
      showJoinError(joinErr);
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 py-12">
      <img src="/logo.svg" alt="Easylex" className="w-56 h-auto mb-6" />
      <h1 className="text-h1 font-bold text-brand-text mb-2">כניסת תלמידים</h1>
      <p className="text-brand-grey-text text-body-sm mb-8">
        {mode === 'login' ? 'ברוך הבא! התחבר כדי להמשיך' : 'צור חשבון חדש'}
      </p>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        {mode === 'signup' && (
          <Input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="שם מלא"
          />
        )}
        <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="אימייל" />
        <Input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="סיסמה"
        />
        {mode === 'signup' && (
          <Input
            id="class-code"
            type="text"
            required
            aria-label="קוד כיתה"
            value={classCode}
            onChange={(e) => {
              setClassCode(e.target.value.toUpperCase());
              setClassCodeError('');
            }}
            placeholder="קוד כיתה"
            maxLength={9}
            className="text-center font-mono"
            error={classCodeError}
          />
        )}
        {mode === 'signup' && (
          <TermsCheckbox
            checked={termsAccepted}
            onChange={(v) => {
              setTermsAccepted(v);
              if (v) setTermsError('');
            }}
            error={termsError}
          />
        )}
        {error && <p className="text-brand-error text-body-sm text-center">{error}</p>}
        <Button type="submit" size="lg" loading={submitting}>
          {mode === 'login' ? 'כניסה' : 'הרשמה'}
        </Button>
        <button
          type="button"
          onClick={switchMode}
          className="w-full text-body-sm text-brand-grey-text hover:text-brand-text underline"
        >
          {mode === 'login' ? 'אין לך חשבון? הירשם' : 'כבר יש לך חשבון? התחבר'}
        </button>
      </form>
    </main>
  );
}
