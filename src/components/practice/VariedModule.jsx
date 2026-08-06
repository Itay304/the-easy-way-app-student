import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, X } from 'lucide-react';
import { masteryLevel } from '../../lib/gamification.js';
import { shuffle, buildChoicesFromPool } from '../../lib/quizChoices.js';
import { getGlobalWordPool } from '../../lib/api.js';
import useCelebration from '../../hooks/useCelebration.js';
import useCombo from '../../hooks/useCombo.js';
import Confetti from './Confetti.jsx';
import XpFlyup from './XpFlyup.jsx';
import ComboBar from './ComboBar.jsx';
import LoadingSpinner from '../LoadingSpinner.jsx';

// תרגול מגוון אמיתי: כל 5 מילים עוברים למודול הבא במחזור, וחוזר חלילה —
// כך כל מילה מתורגלת במודול שונה, בלי שהתלמיד בוחר בעצמו (ר' PracticePicker).
const CYCLE = ['flashcards', 'quiz', 'truefalse', 'spelling'];
const BLOCK_SIZE = 5;
const MODULE_LABELS = {
  flashcards: 'כרטיסיות',
  quiz: 'מבחן',
  truefalse: 'נכון/לא נכון',
  spelling: 'איות',
};
const SWIPE_THRESHOLD_PX = 80;

function moduleForIndex(i) {
  return CYCLE[Math.floor(i / BLOCK_SIZE) % CYCLE.length];
}

function blankSentence(sentence, word) {
  if (!sentence) return null;
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(escaped, 'i');
  if (!re.test(sentence)) return null;
  return sentence.replace(re, '_____');
}

export default function VariedModule({ words, onFinish, onBack }) {
  const [session, setSession] = useState(() => shuffle(words).map((w) => ({ ...w })));
  const [globalPool, setGlobalPool] = useState(null);
  const [index, setIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [masteredCount, setMasteredCount] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [selected, setSelected] = useState(null); // מבחן/נכון-לא-נכון: הבחירה שנעלה
  const [flyDirection, setFlyDirection] = useState(null); // נכון/לא נכון
  const [input, setInput] = useState(''); // איות
  const [wrongOnce, setWrongOnce] = useState(false); // איות
  const [feedback, setFeedback] = useState(null); // איות: 'correct' | 'wrong' | null
  const { confettiKey, xpFlyup, shaking, celebrate, shake, stopShake } = useCelebration();
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

  const current = session[index];
  const currentType = current ? moduleForIndex(index) : null;
  const progressPct = session.length > 0 ? Math.round((index / session.length) * 100) : 0;
  const needsPool = currentType === 'quiz' || currentType === 'truefalse';

  const quizChoices = useMemo(
    () => (globalPool && current && currentType === 'quiz' ? buildChoicesFromPool(current, globalPool) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [globalPool, index, currentType],
  );

  const trueFalseRound = useMemo(() => {
    if (!globalPool || !current || currentType !== 'truefalse') return null;
    const isTrue = globalPool.length < 2 || Math.random() < 0.5;
    if (isTrue) return { shownTranslation: current.hebrewTranslation, isTrue: true };
    const decoyPool = globalPool.filter((p) => p.englishWord !== current.englishWord);
    if (decoyPool.length === 0) return { shownTranslation: current.hebrewTranslation, isTrue: true };
    const decoy = decoyPool[Math.floor(Math.random() * decoyPool.length)];
    return { shownTranslation: decoy.hebrewTranslation, isTrue: false };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalPool, index, currentType]);

  const blanked = currentType === 'spelling' && current ? blankSentence(current.exampleSentence, current.englishWord) : null;

  function finishIfDone(nextSession, nextCorrectCount, nextMasteredCount) {
    if (index + 1 >= session.length) {
      onFinish({
        finalWords: nextSession,
        correctCount: nextCorrectCount,
        wordsMasteredCount: nextMasteredCount,
        moduleComplete: nextCorrectCount / session.length >= 0.6,
        maxCombo: getMaxCombo(),
      });
      return true;
    }
    return false;
  }

  function advance() {
    setIndex((i) => i + 1);
    setFlipped(false);
    setSelected(null);
    setFlyDirection(null);
    setInput('');
    setWrongOnce(false);
    setFeedback(null);
  }

  function commitAnswer(isCorrect) {
    const before = masteryLevel(current.correctAttempts, current.totalAttempts);
    const updated = { ...current, totalAttempts: current.totalAttempts + 1 };
    if (isCorrect) updated.correctAttempts = current.correctAttempts + 1;
    const after = masteryLevel(updated.correctAttempts, updated.totalAttempts);
    const justMastered = isCorrect && before < 5 && after === 5;

    const nextSession = [...session];
    nextSession[index] = updated;
    setSession(nextSession);

    const nextCorrectCount = correctCount + (isCorrect ? 1 : 0);
    const nextMasteredCount = masteredCount + (justMastered ? 1 : 0);
    setCorrectCount(nextCorrectCount);
    setMasteredCount(nextMasteredCount);
    registerAnswer(isCorrect);

    if (isCorrect) celebrate(10);
    else shake();

    return { nextSession, nextCorrectCount, nextMasteredCount };
  }

  function answerFlashcard(knew) {
    const { nextSession, nextCorrectCount, nextMasteredCount } = commitAnswer(knew);
    setTimeout(() => {
      if (!finishIfDone(nextSession, nextCorrectCount, nextMasteredCount)) advance();
    }, 900);
  }

  function answerQuiz(choice) {
    if (selected !== null) return;
    setSelected(choice);
    const isCorrect = choice === current.hebrewTranslation;
    const { nextSession, nextCorrectCount, nextMasteredCount } = commitAnswer(isCorrect);
    setTimeout(() => {
      if (!finishIfDone(nextSession, nextCorrectCount, nextMasteredCount)) advance();
    }, 900);
  }

  function answerTrueFalse(saidTrue) {
    if (flyDirection || !trueFalseRound) return;
    const isCorrect = saidTrue === trueFalseRound.isTrue;
    setFlyDirection(saidTrue ? 'right' : 'left');
    const { nextSession, nextCorrectCount, nextMasteredCount } = commitAnswer(isCorrect);
    setTimeout(() => {
      if (!finishIfDone(nextSession, nextCorrectCount, nextMasteredCount)) advance();
    }, 500);
  }

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
  }
  function handleTouchEnd(e) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return;
    answerTrueFalse(dx > 0);
  }

  function submitSpelling() {
    if (feedback === 'correct' || !input.trim()) return;
    const isCorrect = input.trim().toLowerCase() === current.englishWord.trim().toLowerCase();

    if (isCorrect) {
      setFeedback('correct');
      celebrate(10);
      let nextSession = session;
      let nextCorrectCount = correctCount;
      let nextMasteredCount = masteredCount;

      if (!wrongOnce) {
        const before = masteryLevel(current.correctAttempts, current.totalAttempts);
        const updated = {
          ...current,
          correctAttempts: current.correctAttempts + 1,
          totalAttempts: current.totalAttempts + 1,
        };
        const after = masteryLevel(updated.correctAttempts, updated.totalAttempts);
        nextSession = [...session];
        nextSession[index] = updated;
        nextCorrectCount = correctCount + 1;
        nextMasteredCount = masteredCount + (before < 5 && after === 5 ? 1 : 0);
        setSession(nextSession);
        setCorrectCount(nextCorrectCount);
        setMasteredCount(nextMasteredCount);
        registerAnswer(true);
      }

      setTimeout(() => {
        if (!finishIfDone(nextSession, nextCorrectCount, nextMasteredCount)) advance();
      }, 900);
      return;
    }

    setFeedback('wrong');
    shake();
    if (!wrongOnce) {
      const updated = { ...current, totalAttempts: current.totalAttempts + 1 };
      const nextSession = [...session];
      nextSession[index] = updated;
      setSession(nextSession);
      setWrongOnce(true);
      registerAnswer(false);
    }
  }

  if (session.length === 0) {
    return (
      <div className="px-4 pt-6 text-center py-12">
        <p className="text-brand-grey-text">אין מילים זמינות לתרגול המגוון הזה.</p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 space-y-5">
      {confettiKey && <Confetti key={confettiKey} count={30} durationMs={1000} />}
      {xpFlyup && <XpFlyup amount={xpFlyup.amount} flyKey={xpFlyup.key} />}

      <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-brand-grey-text hover:text-brand-text">
        <ArrowRight size={16} />
        חזרה
      </button>

      <p className="text-sm font-semibold text-brand-turquoise bg-brand-turquoise/10 rounded-xl px-3 py-2 text-center">
        🎯 תרגול מגוון — עכשיו: {MODULE_LABELS[currentType]}
      </p>

      <ComboBar combo={combo} justBroke={justBroke} />

      <div className="h-2 rounded-full bg-brand-grey-light overflow-hidden">
        <div className="h-full bg-brand-turquoise rounded-full transition-all" style={{ width: `${progressPct}%` }} />
      </div>
      <p className="text-center text-sm text-brand-grey-text">
        {index + 1} מתוך {session.length}
      </p>

      {needsPool && globalPool === null ? (
        <LoadingSpinner />
      ) : (
        <>
          {currentType === 'flashcards' && (
            <>
              <div
                className={`flip-card h-56 ${shaking ? 'animate-shake' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => setFlipped((f) => !f)}
                onAnimationEnd={stopShake}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setFlipped((f) => !f);
                  }
                }}
              >
                <div className={`flip-card-inner ${flipped ? 'is-flipped' : ''}`}>
                  <div className="flip-card-face rounded-2xl bg-gradient-to-b from-white to-gray-50 shadow-lg p-8 flex flex-col items-center justify-center text-center">
                    <p className="text-3xl font-bold text-brand-text" dir="ltr">
                      {current.englishWord}
                    </p>
                    <p className="text-xs text-brand-grey-text mt-4">הקש להיפוך</p>
                  </div>
                  <div className="flip-card-face flip-card-back rounded-2xl bg-gradient-to-b from-white to-gray-50 shadow-lg p-8 flex flex-col items-center justify-center text-center">
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
                  onClick={() => answerFlashcard(false)}
                  className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl bg-red-50 text-red-600 font-bold"
                >
                  <X size={18} />
                  לא ידעתי
                </button>
                <button
                  onClick={() => answerFlashcard(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl bg-brand-green/10 text-brand-green font-bold"
                >
                  <Check size={18} />
                  ידעתי
                </button>
              </div>
            </>
          )}

          {currentType === 'quiz' && (
            <>
              <div className="rounded-2xl bg-gradient-to-b from-white to-gray-50 shadow-lg p-8 text-center">
                <p className="text-3xl font-bold text-brand-text" dir="ltr">
                  {current.englishWord}
                </p>
              </div>
              <div className="space-y-3">
                {quizChoices.map((choice) => {
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
                      onClick={() => answerQuiz(choice)}
                      disabled={selected !== null}
                      className={`w-full rounded-xl shadow-md p-4 font-semibold text-lg transition ${style} ${shakeClass}`}
                    >
                      {choice}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {currentType === 'truefalse' && trueFalseRound && (
            <>
              <div
                key={index}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                className={`rounded-2xl bg-gradient-to-b from-white to-gray-50 shadow-lg p-8 text-center space-y-3 select-none ${
                  flyDirection === 'right'
                    ? 'animate-card-fly-right'
                    : flyDirection === 'left'
                      ? 'animate-card-fly-left'
                      : ''
                }`}
              >
                <p className="text-3xl font-bold text-brand-text" dir="ltr">
                  {current.englishWord}
                </p>
                <p className="text-xl font-semibold text-brand-turquoise">{trueFalseRound.shownTranslation}</p>
                <p className="text-xs text-brand-grey-text pt-2">החליקו ימינה = נכון, שמאלה = לא נכון</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => answerTrueFalse(false)}
                  disabled={!!flyDirection}
                  className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl bg-red-50 text-red-600 font-bold disabled:opacity-50"
                >
                  <X size={18} />
                  לא נכון
                </button>
                <button
                  onClick={() => answerTrueFalse(true)}
                  disabled={!!flyDirection}
                  className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl bg-brand-green/10 text-brand-green font-bold disabled:opacity-50"
                >
                  <Check size={18} />
                  נכון
                </button>
              </div>
            </>
          )}

          {currentType === 'spelling' && (
            <>
              <div className="rounded-2xl bg-gradient-to-b from-white to-gray-50 shadow-lg p-6 space-y-3 text-center">
                <p className="text-2xl font-bold text-brand-turquoise">{current.hebrewTranslation}</p>
                {blanked ? (
                  <p className="text-base text-brand-grey-text" dir="ltr">
                    {blanked}
                  </p>
                ) : (
                  <p className="text-sm text-brand-grey-text">השלם/י את המילה באנגלית</p>
                )}
              </div>
              <div className={`space-y-3 ${shaking ? 'animate-shake' : ''}`} onAnimationEnd={stopShake}>
                <input
                  type="text"
                  dir="ltr"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitSpelling()}
                  disabled={feedback === 'correct'}
                  placeholder="הקלד/י את המילה באנגלית..."
                  className={`w-full rounded-xl border-2 p-4 text-lg text-center font-semibold outline-none transition ${
                    feedback === 'correct'
                      ? 'border-brand-green bg-brand-green/10 text-brand-green'
                      : feedback === 'wrong'
                        ? 'border-red-400 bg-red-50 text-red-600'
                        : 'border-brand-grey-light focus:border-brand-turquoise'
                  }`}
                />
                {feedback === 'wrong' && (
                  <div className="text-center space-y-1">
                    <p className="flex items-center justify-center gap-1 text-sm font-semibold text-red-600">
                      <X size={16} />
                      נסה/י שוב
                    </p>
                    <p className="text-sm font-bold text-brand-green" dir="ltr">
                      {current.englishWord}
                    </p>
                  </div>
                )}
                {feedback === 'correct' && (
                  <p className="flex items-center justify-center gap-1 text-sm font-semibold text-brand-green">
                    <Check size={16} />
                    נכון!
                  </p>
                )}
                <button
                  onClick={submitSpelling}
                  disabled={feedback === 'correct' || !input.trim()}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-turquoise-400 to-turquoise-600 text-white font-bold disabled:opacity-50"
                >
                  בדוק/י
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
