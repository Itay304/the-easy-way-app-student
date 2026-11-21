import { useState } from 'react';
import { signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase.js';
import { studentConsentFields, TERMS_REQUIRED_ERROR } from '../../lib/consent.js';
import TermsCheckbox from './TermsCheckbox.jsx';
import Button from '../ui/Button.jsx';

// מסך חד-פעמי למשתמש קיים שעוד לא אישר את התקנון (אין termsAcceptedAt על המסמך).
// אי אפשר להמשיך בלי לאשר — אפשר רק להתנתק. אחרי האישור ה-snapshot של המסמך מתעדכן והמסך נעלם.
export default function ConsentGate({ uid }) {
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!accepted) {
      setError(TERMS_REQUIRED_ERROR);
      return;
    }
    setError('');
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', uid), studentConsentFields());
    } catch (err) {
      console.error('[ConsentGate] save failed:', err);
      setError('השמירה נכשלה. נסו שוב.');
      setSaving(false);
    }
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 py-12">
      <img src="/logo.svg" alt="Easylex" className="w-48 h-auto mb-6" />
      <form onSubmit={handleSubmit} noValidate className="w-full max-w-sm space-y-5">
        <div className="text-center space-y-2">
          <h1 className="text-h1 font-bold text-brand-text">עדכון תנאי השימוש</h1>
          <p className="text-body-sm text-brand-grey-text">
            כדי להמשיך להשתמש ב-Easylex, יש לאשר את התקנון ואת מדיניות הפרטיות.
          </p>
        </div>
        <TermsCheckbox
          checked={accepted}
          onChange={(v) => {
            setAccepted(v);
            if (v) setError('');
          }}
          error={error}
        />
        <Button type="submit" size="lg" loading={saving}>
          המשך
        </Button>
        <button
          type="button"
          onClick={() => signOut(auth)}
          className="w-full text-body-sm text-brand-grey-text hover:text-brand-text underline"
        >
          התנתקות
        </button>
      </form>
    </main>
  );
}
