import { useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { masteryLevel } from '../../lib/gamification.js';
import { shuffle } from '../../lib/quizChoices.js';
import useCelebration from '../../hooks/useCelebration.js';
import useCombo from '../../hooks/useCombo.js';
import Confetti from './Confetti.jsx';
import XpFlyup from './XpFlyup.jsx';
import ComboBar from './ComboBar.jsx';

const RESOLVE_DELAY_MS = 900;

function blankSentence(sentence, word) {
  if (!sentence) return null;
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(escaped, 'i');
  if (!re.test(sentence)) return null;
  return sentence.replace(re, '_____');
}

function buildWordChoices(words, current) {
  const pool = words.filter((w) => w.englishWord !== current.englishWord).map((w) => w.englishWord);
  const distractors = shuffle(pool).slice(0, 3);
  return shuffle([current.englishWord, ...distractors]);
}

export default function FillSentence({ words, onFinish, onBack, adaptiveBanner }) {
  const eligibleWords = useMemo(() => {
    const seen = new Set();
    const list = [];
    for (const w of words) {
      if (!w.exampleSentence || seen.has(w.englishWord)) continue;
      if (!blankSentence(w.exampleSentence, w.englishWord)) continue;
      seen.add(w.englishWord);
      list.push(w);
    }
    return shuffle(list);
  }, [words]);

  const [index, setIndex] = useState(0);
  const [session, setSession] = useState(() => eligibleWords.map((w) => ({ ...w })));
  const [correctCount, setCorrectCount] = useState(0);
  const [masteredCount, setMasteredCount] = useState(0);
  const [selected, setSelected] = useState(null);
  const { confettiKey, xpFlyup, celebrate, shake } = useCelebration();
  const { combo, justBroke, registerAnswer, getMaxCombo } = useCombo();

  const current = session[index];
  const choices = useMemo(
    () => (eligibleWords.length >= 4 && current ? buildWordChoices(eligibleWords, current) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [index, eligibleWords],
  );
  const progressPct = session.length > 0 ? Math.round((index / session.length) * 100) : 0;
  const blanked = current ? blankSentence(current.exampleSentence, current.englishWord) : null;

  function selectAnswer(choice) {
    if (selected !== null) return;
    setSelected(choice);

    const isCorrect = choice === current.englishWord;
    const before = masteryLevel(current.correctAttempts, current.totalAttempts);
    const updated = { ...current, totalAttempts: current.totalAttempts + 1 };
    if (isCorrect) updated.correctAttempts = current.correctAttempts + 1;
    const after = masteryLevel(updated.correctAttempts, updated.totalAttempts);
    const justMastered = isCorrect && before < 5 && after === 5;

    if (isCorrect) celebrate(10);
    else shake();
    registerAnswer(isCorrect);

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
          maxCombo: getMaxCombo(),
        });
        return;
      }
      setIndex((i) => i + 1);
      setSelected(null);
    }, RESOLVE_DELAY_MS);
  }

  if (eligibleWords.length < 4) {
    return (
      <div className="px-4 pt-6 text-center py-12">
        <p className="text-brand-grey-text">אין מספיק משפטי דוגמה לתרגול "השלמת משפט" במשימה זו.</p>
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

      <div className="rounded-2xl bg-gradient-to-b from-white to-gray-50 shadow-lg p-6 text-center">
        <p className="text-xs text-brand-grey-text mb-2">השלימו את המשפט ✍️</p>
        <p className="text-lg font-semibold text-brand-text" dir="ltr">
          {blanked}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {choices.map((choice) => {
          const isSelected = selected === choice;
          const isCorrectChoice = choice === current.englishWord;
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
              dir="ltr"
              className={`rounded-xl shadow-md p-4 font-semibold transition ${style} ${shakeClass}`}
            >
              {choice}
            </button>
          );
        })}
      </div>
    </div>
  );
}
