import { useState } from 'react';
import { ArrowRight, Check, X } from 'lucide-react';
import { masteryLevel } from '../../lib/gamification.js';
import useCelebration from '../../hooks/useCelebration.js';
import useCombo from '../../hooks/useCombo.js';
import Confetti from './Confetti.jsx';
import XpFlyup from './XpFlyup.jsx';
import ComboBar from './ComboBar.jsx';

export default function FlashcardsModule({ words, onFinish, onBack, adaptiveBanner }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [session, setSession] = useState(() => words.map((w) => ({ ...w })));
  const [correctCount, setCorrectCount] = useState(0);
  const [masteredCount, setMasteredCount] = useState(0);
  const { confettiKey, xpFlyup, shaking, celebrate, shake, stopShake } = useCelebration();
  const { combo, justBroke, registerAnswer, getMaxCombo } = useCombo();

  const current = session[index];
  const progressPct = Math.round((index / words.length) * 100);

  function toggleFlip() {
    setFlipped((f) => !f);
  }

  function answer(knew) {
    const before = masteryLevel(current.correctAttempts, current.totalAttempts);
    const updated = { ...current, totalAttempts: current.totalAttempts + 1 };
    if (knew) {
      updated.correctAttempts = current.correctAttempts + 1;
      setCorrectCount((c) => c + 1);
      celebrate(10);
      const after = masteryLevel(updated.correctAttempts, updated.totalAttempts);
      if (before < 5 && after === 5) setMasteredCount((m) => m + 1);
    } else {
      shake();
    }
    registerAnswer(knew);

    const nextSession = [...session];
    nextSession[index] = updated;
    setSession(nextSession);

    if (index + 1 >= session.length) {
      onFinish({
        finalWords: nextSession,
        correctCount: correctCount + (knew ? 1 : 0),
        wordsMasteredCount: masteredCount + (knew && before < 5 && masteryLevel(updated.correctAttempts, updated.totalAttempts) === 5 ? 1 : 0),
        moduleComplete: false,
        maxCombo: getMaxCombo(),
      });
      return;
    }

    setIndex((i) => i + 1);
    setFlipped(false);
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

      <ComboBar combo={combo} justBroke={justBroke} />

      <div className="h-2 rounded-full bg-brand-grey-light overflow-hidden">
        <div className="h-full bg-brand-turquoise rounded-full transition-all" style={{ width: `${progressPct}%` }} />
      </div>
      <p className="text-center text-sm text-brand-grey-text">
        {index + 1} מתוך {session.length}
      </p>

      <div
        className={`flip-card h-56 ${shaking ? 'animate-shake' : ''}`}
        role="button"
        tabIndex={0}
        onClick={toggleFlip}
        onAnimationEnd={stopShake}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleFlip();
          }
        }}
      >
        <div className={`flip-card-inner ${flipped ? 'is-flipped' : ''}`}>
          <div className="flip-card-face rounded-2xl bg-white shadow-md p-8 flex flex-col items-center justify-center text-center">
            <p className="text-3xl font-bold text-brand-text" dir="ltr">
              {current.englishWord}
            </p>
            <p className="text-xs text-brand-grey-text mt-4">הקש להיפוך</p>
          </div>
          <div className="flip-card-face flip-card-back rounded-2xl bg-white shadow-md p-8 flex flex-col items-center justify-center text-center">
            <p className="text-2xl font-bold text-brand-turquoise mb-3">{current.hebrewTranslation}</p>
            {current.exampleSentence && (
              <p className="text-sm text-brand-grey-text" dir="ltr">
                {current.exampleSentence}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => answer(false)}
          className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl bg-red-50 text-red-600 font-bold"
        >
          <X size={18} />
          לא ידעתי
        </button>
        <button
          onClick={() => answer(true)}
          className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl bg-brand-green/10 text-brand-green font-bold"
        >
          <Check size={18} />
          ידעתי
        </button>
      </div>
    </div>
  );
}
