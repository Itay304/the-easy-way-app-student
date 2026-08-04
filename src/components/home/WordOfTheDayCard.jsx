import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

export default function WordOfTheDayCard({ word }) {
  if (!word) return null;

  return (
    <section className="rounded-2xl bg-gradient-to-l from-amber-50 to-brand-turquoise/10 border border-amber-200/60 p-5">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={18} className="text-amber-500" />
        <h2 className="text-sm font-bold text-amber-700">מילת היום</h2>
      </div>
      <p className="text-xl font-bold text-brand-text">
        <span dir="ltr">{word.englishWord}</span>{' '}
        <span className="text-brand-grey-text font-normal">=</span> {word.hebrewTranslation}
      </p>
      {word.exampleSentence && (
        <p className="text-sm text-brand-grey-text mt-1" dir="ltr">
          {word.exampleSentence}
        </p>
      )}
      {word.assignmentId && (
        <Link
          to={`/practice/${word.assignmentId}`}
          className="inline-block mt-3 px-4 py-2 rounded-lg bg-brand-turquoise text-white text-sm font-bold"
        >
          תרגל אותה עכשיו
        </Link>
      )}
    </section>
  );
}
