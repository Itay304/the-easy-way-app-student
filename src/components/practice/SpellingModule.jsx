import { useMemo, useState } from 'react';
import { ArrowRight, Check, X } from 'lucide-react';
import { masteryLevel } from '../../lib/gamification.js';
import { shuffle } from '../../lib/quizChoices.js';
import useCelebration from '../../hooks/useCelebration.js';
import useCombo from '../../hooks/useCombo.js';
import Confetti from './Confetti.jsx';
import XpFlyup from './XpFlyup.jsx';
import ComboBar from './ComboBar.jsx';
import Card from '../ui/Card.jsx';
import Button from '../ui/Button.jsx';

function blankSentence(sentence, word) {
  if (!sentence) return null;
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(escaped, 'i');
  if (!re.test(sentence)) return null;
  return sentence.replace(re, '_____');
}

export default function SpellingModule({ words, onFinish, onBack, adaptiveBanner }) {
  const eligibleWords = useMemo(
    () => shuffle(words.filter((w) => (w.partOfSpeech || '').toLowerCase() !== 'phrase')),
    [words],
  );

  const [index, setIndex] = useState(0);
  const [session, setSession] = useState(() => eligibleWords.map((w) => ({ ...w })));
  const [input, setInput] = useState('');
  const [wrongOnce, setWrongOnce] = useState(false);
  const [feedback, setFeedback] = useState(null); // 'correct' | 'wrong' | null
  const [correctCount, setCorrectCount] = useState(0);
  const [masteredCount, setMasteredCount] = useState(0);
  const { confettiKey, xpFlyup, shaking, celebrate, shake, stopShake } = useCelebration();
  const { combo, justBroke, registerAnswer, getMaxCombo } = useCombo();

  const current = session[index];
  const progressPct = session.length > 0 ? Math.round((index / session.length) * 100) : 0;
  const blanked = current ? blankSentence(current.exampleSentence, current.englishWord) : null;

  function finishSession(finalSession, finalCorrectCount, finalMasteredCount) {
    onFinish({
      finalWords: finalSession,
      correctCount: finalCorrectCount,
      wordsMasteredCount: finalMasteredCount,
      moduleComplete: false,
      maxCombo: getMaxCombo(),
    });
  }

  function advance(nextSession, nextCorrectCount, nextMasteredCount) {
    setTimeout(() => {
      if (index + 1 >= session.length) {
        finishSession(nextSession, nextCorrectCount, nextMasteredCount);
        return;
      }
      setIndex((i) => i + 1);
      setInput('');
      setWrongOnce(false);
      setFeedback(null);
    }, 900);
  }

  function checkAnswer() {
    if (feedback === 'correct') return;
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
          module: 'spelling',
          correct: true,
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
      advance(nextSession, nextCorrectCount, nextMasteredCount);
      return;
    }

    setFeedback('wrong');
    shake();
    if (!wrongOnce) {
      const updated = { ...current, totalAttempts: current.totalAttempts + 1, module: 'spelling', correct: false };
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
        <p className="text-brand-grey-text">אין מילים מתאימות לתרגול איות במשימה זו.</p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 space-y-5">
      {confettiKey && <Confetti key={confettiKey} count={30} durationMs={1000} />}
      {xpFlyup && <XpFlyup amount={xpFlyup.amount} flyKey={xpFlyup.key} />}

      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowRight size={16} />
        חזרה
      </Button>

      {adaptiveBanner && (
        <p className="text-body-sm font-semibold text-brand-turquoise bg-brand-turquoise/10 rounded-xl px-3 py-2 text-center">
          מתאים את הסשן עבורך 🎯
        </p>
      )}

      <ComboBar combo={combo} justBroke={justBroke} />

      <div className="h-2 rounded-full bg-brand-grey-light overflow-hidden">
        <div className="h-full bg-brand-turquoise rounded-full transition-all" style={{ width: `${progressPct}%` }} />
      </div>
      <p className="text-center text-body-sm text-brand-grey-text">
        {index + 1} מתוך {session.length}
      </p>

      <Card padding="p-6" className="space-y-3 text-center">
        <p className="text-h1 font-bold text-brand-turquoise">{current.hebrewTranslation}</p>
        {blanked ? (
          <p className="text-body text-brand-grey-text" dir="ltr">
            {blanked}
          </p>
        ) : (
          <p className="text-body-sm text-brand-grey-text">השלם/י את המילה באנגלית</p>
        )}
      </Card>

      <div className={`space-y-3 ${shaking ? 'animate-shake' : ''}`} onAnimationEnd={stopShake}>
        <input
          type="text"
          dir="ltr"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && checkAnswer()}
          disabled={feedback === 'correct'}
          placeholder="הקלד/י את המילה באנגלית..."
          className={`w-full rounded-xl border-2 p-4 text-body-lg text-center font-semibold outline-none transition ${
            feedback === 'correct'
              ? 'border-brand-green bg-brand-green/10 text-brand-green'
              : feedback === 'wrong'
                ? 'border-brand-error bg-brand-error-light text-brand-error'
                : 'border-brand-grey-light focus:border-brand-turquoise'
          }`}
        />

        {feedback === 'wrong' && (
          <div className="text-center space-y-1">
            <p className="flex items-center justify-center gap-1 text-body-sm font-semibold text-brand-error">
              <X size={16} />
              נסה/י שוב
            </p>
            <p className="text-body-sm font-bold text-brand-green" dir="ltr">
              {current.englishWord}
            </p>
          </div>
        )}
        {feedback === 'correct' && (
          <p className="flex items-center justify-center gap-1 text-body-sm font-semibold text-brand-green">
            <Check size={16} />
            נכון!
          </p>
        )}

        <Button size="lg" onClick={checkAnswer} disabled={feedback === 'correct' || !input.trim()}>
          בדוק/י
        </Button>
      </div>
    </div>
  );
}
