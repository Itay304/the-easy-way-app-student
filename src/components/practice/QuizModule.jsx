import { useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { masteryLevel } from '../../lib/gamification.js';
import { buildChoices } from '../../lib/quizChoices.js';
import useCelebration from '../../hooks/useCelebration.js';
import Confetti from './Confetti.jsx';
import XpFlyup from './XpFlyup.jsx';

export default function QuizModule({ words, onFinish, onBack, adaptiveBanner }) {
  const [index, setIndex] = useState(0);
  const [session, setSession] = useState(() => words.map((w) => ({ ...w })));
  const [correctCount, setCorrectCount] = useState(0);
  const [masteredCount, setMasteredCount] = useState(0);
  const [selected, setSelected] = useState(null);
  const { confettiKey, xpFlyup, celebrate, shake } = useCelebration();

  const choices = useMemo(() => buildChoices(words, index), [words, index]);
  const current = session[index];
  const progressPct = Math.round((index / words.length) * 100);

  function selectAnswer(choice) {
    if (selected !== null) return;
    setSelected(choice);

    const isCorrect = choice === current.hebrewTranslation;
    const before = masteryLevel(current.correctAttempts, current.totalAttempts);
    const updated = { ...current, totalAttempts: current.totalAttempts + 1 };
    if (isCorrect) updated.correctAttempts = current.correctAttempts + 1;
    const after = masteryLevel(updated.correctAttempts, updated.totalAttempts);
    const justMastered = isCorrect && before < 5 && after === 5;

    if (isCorrect) celebrate(10);
    else shake();

    const nextSession = [...session];
    nextSession[index] = updated;
    setSession(nextSession);

    const nextCorrectCount = correctCount + (isCorrect ? 1 : 0);
    const nextMasteredCount = masteredCount + (justMastered ? 1 : 0);
    setCorrectCount(nextCorrectCount);
    setMasteredCount(nextMasteredCount);

    setTimeout(() => {
      if (index + 1 >= session.length) {
        onFinish({
          finalWords: nextSession,
          correctCount: nextCorrectCount,
          wordsMasteredCount: nextMasteredCount,
          moduleComplete: nextCorrectCount / session.length >= 0.6,
        });
        return;
      }
      setIndex((i) => i + 1);
      setSelected(null);
    }, 900);
  }

  return (
    <div className="px-4 pt-6 space-y-5">
      {confettiKey && <Confetti key={confettiKey} count={50} durationMs={1500} />}
      {xpFlyup && <XpFlyup amount={xpFlyup.amount} flyKey={xpFlyup.key} />}

      <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-brand-grey-text hover:text-brand-text">
        <ArrowRight size={16} />
        חזרה
      </button>

      {adaptiveBanner && (
        <p className="text-sm font-semibold text-brand-turquoise bg-brand-turquoise/10 rounded-xl px-3 py-2 text-center">
          מתאים את הסשן עבורך 🎯
        </p>
      )}

      <div className="h-2 rounded-full bg-brand-grey-light overflow-hidden">
        <div className="h-full bg-brand-turquoise rounded-full transition-all" style={{ width: `${progressPct}%` }} />
      </div>
      <p className="text-center text-sm text-brand-grey-text">
        {index + 1} מתוך {session.length}
      </p>

      <div className="rounded-2xl bg-white shadow-md p-8 text-center">
        <p className="text-3xl font-bold text-brand-text" dir="ltr">
          {current.englishWord}
        </p>
      </div>

      <div className="space-y-3">
        {choices.map((choice) => {
          const isSelected = selected === choice;
          const isCorrectChoice = choice === current.hebrewTranslation;
          let style = 'bg-white text-brand-text';
          let shakeClass = '';
          if (selected !== null) {
            if (isCorrectChoice) style = 'bg-brand-green/10 text-brand-green';
            else if (isSelected) {
              style = 'bg-red-50 text-red-600';
              shakeClass = 'animate-shake';
            }
          }
          return (
            <button
              key={choice}
              onClick={() => selectAnswer(choice)}
              disabled={selected !== null}
              className={`w-full rounded-xl shadow-md p-4 font-semibold text-lg transition ${style} ${shakeClass}`}
            >
              {choice}
            </button>
          );
        })}
      </div>
    </div>
  );
}
