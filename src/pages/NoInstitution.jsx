import { signOut } from 'firebase/auth';
import { MessageCircleQuestion } from 'lucide-react';
import { auth } from '../firebase.js';

export default function NoInstitution() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="h-16 w-16 rounded-full bg-brand-turquoise/10 text-brand-turquoise flex items-center justify-center mb-4">
        <MessageCircleQuestion size={30} />
      </div>
      <h1 className="text-2xl font-bold text-brand-text mb-2">אין לך עדיין כיתה</h1>
      <p className="text-brand-grey-text mb-10 max-w-sm">
        החשבון שלך עדיין לא משויך למוסד או לכיתה. צור קשר עם המורה שלך כדי לקבל קוד הצטרפות.
      </p>
      <button
        onClick={() => signOut(auth)}
        className="text-sm text-brand-grey-text hover:text-brand-text underline"
      >
        התנתק
      </button>
    </div>
  );
}
