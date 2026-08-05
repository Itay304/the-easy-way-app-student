import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, X } from 'lucide-react';
import { masteryLevel } from '../../lib/gamification.js';
import { shuffle } from '../../lib/quizChoices.js';
import { getGlobalWordPool } from '../../lib/api.js';
import useCelebration from '../../hooks/useCelebration.js';
import useCombo from '../../hooks/useCombo.js';
import Confetti from './Confetti.jsx';
import XpFlyup from './XpFlyup.jsx';
import ComboBar from './ComboBar.jsx';
import LoadingSpinner from '../LoadingSpinner.jsx';

const SWIPE_THRESHOLD_PX = 80;
const RESOLVE_DELAY_MS = 500;

function buildRounds(words, globalPool) {
  const shuffled = shuffle(words);
  return shuffled.map((w) => {
    const isTrue = globalPool.length < 2 || Math.random() < 0.5;
    if (isTrue) return { word: w, shownTranslation: w.hebrewTranslation, isTrue: true };
    const decoyPool = globalPool.filter((p) => p.englishWord !== w.englishWord);
    const decoy = decoyPool[Math.floor(Math.random() * decoyPool.length)];
    return { word: w, shownTranslation: decoy.hebrewTranslation, isTrue: false };
  });
}

export default function TrueFalse({ words, onFinish, onBack, adaptiveBanner }) {
  const [globalPool, setGlobalPool] = useState(null);
  const rounds = useMemo(() => (globalPool ? buildRounds(words, globalPool) : []), [words, globalPool]);
  const [index, setIndex] = useState(0);
  const [session, setSession] = useState(() => words.map((w) => ({ ...w })));
  const [correctCount, setCorrectCount] = useState(0);
  const [masteredCount, setMasteredCount] = useState(0);
  const [flyDirection, setFlyDirection] = useState(null); // 'right' | 'left' | null
  const { confettiKey, xpFlyup, celebrate, shake } = useCelebration();
  const { combo, justBroke, registerAnswer, getMaxCombo } = useCombo();
  const touchStartX = useRef(null);

  useEffect(() => {
    let cancelled = false;
    getGlobalWordPool().then((pool) => {
      if (!cancelled) setGlobalPool(pool);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const round = rounds[index];
  const progressPct = rounds.length > 0 ? Math.round((index / rounds.length) * 100) : 0;

  function answer(saidTrue) {
    if (flyDirection || !round) return;
    const isCorrect = saidTrue === round.isTrue;

    const sessionIdx = session.findIndex((w) => w.englishWord === round.word.englishWord);
    const currentWord = session[sessionIdx];
    const before = masteryLevel(currentWord.correctAttempts, currentWord.totalAttempts);
    const updated = { ...currentWord, totalAttempts: currentWord.totalAttempts + 1 };
    if (isCorrect) updated.correctAttempts = currentWord.correctAttempts + 1;
    const after = masteryLevel(updated.correctAttempts, updated.totalAttempts);
    const justMastered = isCorrect && before < 5 && after === 5;

    const nextSession = [...session];
    nextSession[sessionIdx] = updated;
    setSession(nextSession);

    const nextCorrectCount = correctCount + (isCorrect ? 1 : 0);
    const nextMasteredCount = masteredCount + (justMastered ? 1 : 0);
    setCorrectCount(nextCorrectCount);
    setMasteredCount(nextMasteredCount);

    registerAnswer(isCorrect);
    if (isCorrect) celebrate(10);
    else shake();

    setFlyDirection(saidTrue ? 'right' : 'left');

    setTimeout(() => {
      if (index + 1 >= rounds.length) {
        onFinish({
          finalWords: nextSession,
          correctCount: nextCorrectCount,
          wordsMasteredCount: nextMasteredCount,
          moduleComplete: nextCorrectCount / rounds.length >= 0.6,
          maxCombo: getMaxCombo(),
        });
        return;
      }
      setIndex((i) => i + 1);
      setFlyDirection(null);
    }, RESOLVE_DELAY_MS);
  }

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
  }
  function handleTouchEnd(e) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return;
    answer(dx > 0);
  }

  if (words.length === 0) {
    return (
      <div className="px-4 pt-6 text-center py-12">
        <p className="text-brand-grey-text">אין מילים זמינות לתרגול נכון/לא נכון במשימה זו.</p>
      </div>
    );
  }

  if (globalPool === null || !round) {
    return <LoadingSpinner />;
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
        {index + 1} מתוך {rounds.length}
      </p>

      <div
        key={index}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`rounded-2xl bg-white shadow-md p-8 text-center space-y-3 select-none ${
          flyDirection === 'right' ? 'animate-card-fly-right' : flyDirection === 'left' ? 'animate-card-fly-left' : ''
        }`}
      >
        <p className="text-3xl font-bold text-brand-text" dir="ltr">
          {round.word.englishWord}
        </p>
        <p className="text-xl font-semibold text-brand-turquoise">{round.shownTranslation}</p>
        <p className="text-xs text-brand-grey-text pt-2">החליקו ימינה = נכון, שמאלה = לא נכון</p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => answer(false)}
          disabled={!!flyDirection}
          className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl bg-red-50 text-red-600 font-bold disabled:opacity-50"
        >
          <X size={18} />
          לא נכון
        </button>
        <button
          onClick={() => answer(true)}
          disabled={!!flyDirection}
          className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl bg-brand-green/10 text-brand-green font-bold disabled:opacity-50"
        >
          <Check size={18} />
          נכון
        </button>
      </div>
    </div>
  );
}
