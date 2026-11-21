import { TERMS_URL, PRIVACY_URL } from '../../lib/consent.js';

// תיבת הסכמה חובה: "קראתי ואני מסכים/ה לתקנון ולמדיניות הפרטיות" — לא מסומנת מראש.
// הקישורים נפתחים בלשונית חדשה. error — הודעת שגיאה בעברית (מוצגת מתחת, ומקושרת לתיבה לקוראי מסך).
export default function TermsCheckbox({ checked, onChange, error }) {
  return (
    <div className="space-y-1">
      <label className="flex items-start gap-2.5 text-body-sm text-brand-text text-right cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? 'terms-error' : undefined}
          className="mt-0.5 h-5 w-5 shrink-0 accent-brand-turquoise"
        />
        <span>
          קראתי ואני מסכים/ה ל
          <a href={TERMS_URL} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
            תקנון
          </a>{' '}
          ול
          <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
            מדיניות הפרטיות
          </a>
        </span>
      </label>
      {error && (
        <p id="terms-error" role="alert" className="text-brand-error text-body-sm">
          {error}
        </p>
      )}
    </div>
  );
}
