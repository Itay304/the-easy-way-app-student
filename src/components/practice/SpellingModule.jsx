import { useMemo, useState } from 'react';
import { ArrowRight, Check, X } from 'lucide-react';
import { masteryLevel } from '../../lib/gamification.js';

function blankSentence(sentence, word) {
  if (!sentence) return null;
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(escaped, 'i');
  if (!re.test(sentence)) return null;
  return sentence.replace(re, '_____');
}

export default function SpellingModule({ words, onFinish, onBack }) {
  const eligibleWords = useMemo(
    () => words.filter((w) => (w.partOfSpeech || '').toLowerCase() !== 'phrase'),
    [words],
  );

  const [index, setIndex] = useState(0);
  const [session, setSession] = useState(() => eligibleWords.map((w) => ({ ...w })));
  const [input, setInput] = useState('');
  const [wrongOnce, setWrongOnce] = useState(false);
  const [feedback, setFeedback] = useState(null); // 'correct' | 'wrong' | null
  const [correctCount, setCorrectCount] = useState(0);
  const [masteredCount, setMasteredCount] = useState(0);

  const current = session[index];
  const progressPct = session.length > 0 ? Math.round((index / session.length) * 100) : 0;
  const blanked = current ? blankSentence(current.exampleSentence, current.englishWord) : null;

  function finishSession(finalSession, finalCorrectCount, finalMasteredCount) {
    onFinish({
      finalWords: finalSession,
      correctCount: finalCorrectCount,
      wordsMasteredCount: finalMasteredCount,
      moduleComplete: false,
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
      }
      advance(nextSession, nextCorrectCount, nextMasteredCount);
      return;
    }

    setFeedback('wrong');
    if (!wrongOnce) {
      const updated = { ...current, totalAttempts: current.totalAttempts + 1 };
      const nextSession = [...session];
      nextSession[index] = updated;
      setSession(nextSession);
      setWrongOnce(true);
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
      <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-brand-grey-text hover:text-brand-text">
        <ArrowRight size={16} />
        חזרה
      </button>

      <div className="h-2 rounded-full bg-brand-grey-light overflow-hidden">
        <div className="h-full bg-brand-turquoise rounded-full transition-all" style={{ width: `${progressPct}%` }} />
      </div>
      <p className="text-center text-sm text-brand-grey-text">
        {index + 1} מתוך {session.length}
      </p>

      <div className="rounded-2xl bg-white shadow-md p-6 space-y-3 text-center">
        <p className="text-2xl font-bold text-brand-turquoise">{current.hebrewTranslation}</p>
        {blanked ? (
          <p className="text-base text-brand-grey-text" dir="ltr">
            {blanked}
          </p>
        ) : (
          <p className="text-sm text-brand-grey-text">השלם/י את המילה באנגלית</p>
        )}
      </div>

      <div className="space-y-3">
        <input
          type="text"
          dir="ltr"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && checkAnswer()}
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
          <p className="flex items-center justify-center gap-1 text-sm font-semibold text-red-600">
            <X size={16} />
            נסה/י שוב
          </p>
        )}
        {feedback === 'correct' && (
          <p className="flex items-center justify-center gap-1 text-sm font-semibold text-brand-green">
            <Check size={16} />
            נכון!
          </p>
        )}

        <button
          onClick={checkAnswer}
          disabled={feedback === 'correct' || !input.trim()}
          className="w-full py-4 rounded-xl bg-brand-turquoise text-white font-bold disabled:opacity-50"
        >
          בדוק/י
        </button>
      </div>
    </div>
  );
}
