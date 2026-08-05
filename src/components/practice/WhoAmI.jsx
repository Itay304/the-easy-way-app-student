import { useMemo, useState } from 'react';
import { ArrowRight, Lightbulb } from 'lucide-react';
import { masteryLevel } from '../../lib/gamification.js';
import { shuffle } from '../../lib/quizChoices.js';
import { isWhoAmITypingMode } from '../../lib/settings.js';
import useCelebration from '../../hooks/useCelebration.js';
import useCombo from '../../hooks/useCombo.js';
import Confetti from './Confetti.jsx';
import XpFlyup from './XpFlyup.jsx';
import ComboBar from './ComboBar.jsx';

// רמז 1 (descriptionSentence בלבד) = 3 נק', רמז 2 (+hebrewTranslation) = 2,
// רמז 3 (+exampleSentence עם ___) = 1. הניקוד מתורגם ל-XP אמיתי דרך
// bonusXp שמועבר ל-onFinish (ר' PracticeSession.handleFinish).
const POINTS_BY_CLUE = { 1: 3, 2: 2, 3: 1 };

function blankSentence(sentence, word) {
  if (!sentence) return null;
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(escaped, 'i');
  if (!re.test(sentence)) return sentence;
  return sentence.replace(re, '_____');
}

function buildWordChoices(words, current) {
  const pool = words.filter((w) => w.englishWord !== current.englishWord).map((w) => w.englishWord);
  const distractors = shuffle(pool).slice(0, 3);
  return shuffle([current.englishWord, ...distractors]);
}

export default function WhoAmI({ words, onFinish, onBack, adaptiveBanner }) {
  const eligibleWords = useMemo(() => {
    const seen = new Set();
    const list = [];
    for (const w of words) {
      if (!w.descriptionSentence || seen.has(w.englishWord)) continue;
      seen.add(w.englishWord);
      list.push(w);
    }
    return shuffle(list);
  }, [words]);

  // אם אין מספיק מילים לבניית 4 אפשרויות, נופלים חזרה למצב הקלדה
  // גם אם המשתמש בחר בחירה בהגדרות — אחרת אין דרך לענות בכלל.
  const typingMode = useMemo(
    () => isWhoAmITypingMode() || eligibleWords.length < 4,
    [eligibleWords],
  );

  const [index, setIndex] = useState(0);
  const [session, setSession] = useState(() => eligibleWords.map((w) => ({ ...w })));
  const [clueLevel, setClueLevel] = useState(1);
  const [status, setStatus] = useState('active'); // 'active' | 'correct' | 'wrong'
  const [input, setInput] = useState('');
  const [correctCount, setCorrectCount] = useState(0);
  const [masteredCount, setMasteredCount] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const { confettiKey, xpFlyup, shaking, celebrate, shake, stopShake } = useCelebration();
  const { combo, justBroke, registerAnswer, getMaxCombo } = useCombo();

  const current = session[index];
  const progressPct = session.length > 0 ? Math.round((index / session.length) * 100) : 0;
  const choices = useMemo(
    () => (typingMode || !current || eligibleWords.length < 4 ? [] : buildWordChoices(eligibleWords, current)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [current, clueLevel, typingMode],
  );

  function finishSession(finalSession, finalCorrectCount, finalMasteredCount, finalPoints) {
    const baselineXp = finalCorrectCount * 10;
    const scaledXp = finalPoints * 10;
    onFinish({
      finalWords: finalSession,
      correctCount: finalCorrectCount,
      wordsMasteredCount: finalMasteredCount,
      moduleComplete: false,
      bonusXp: Math.max(0, scaledXp - baselineXp),
      maxCombo: getMaxCombo(),
    });
  }

  function goToNext(nextSession, nextCorrectCount, nextMasteredCount, nextPoints) {
    setTimeout(() => {
      if (index + 1 >= session.length) {
        finishSession(nextSession, nextCorrectCount, nextMasteredCount, nextPoints);
        return;
      }
      setIndex((i) => i + 1);
      setClueLevel(1);
      setStatus('active');
      setInput('');
    }, 1100);
  }

  function resolveCorrect() {
    const points = POINTS_BY_CLUE[clueLevel];
    const before = masteryLevel(current.correctAttempts, current.totalAttempts);
    const updated = {
      ...current,
      correctAttempts: current.correctAttempts + 1,
      totalAttempts: current.totalAttempts + 1,
    };
    const after = masteryLevel(updated.correctAttempts, updated.totalAttempts);
    const justMastered = before < 5 && after === 5;

    const nextSession = [...session];
    nextSession[index] = updated;
    setSession(nextSession);

    const nextCorrectCount = correctCount + 1;
    const nextMasteredCount = masteredCount + (justMastered ? 1 : 0);
    const nextPoints = totalPoints + points;
    setCorrectCount(nextCorrectCount);
    setMasteredCount(nextMasteredCount);
    setTotalPoints(nextPoints);

    setStatus('correct');
    celebrate(points * 10);
    registerAnswer(true);
    goToNext(nextSession, nextCorrectCount, nextMasteredCount, nextPoints);
  }

  function resolveWrongFinal() {
    const updated = { ...current, totalAttempts: current.totalAttempts + 1 };
    const nextSession = [...session];
    nextSession[index] = updated;
    setSession(nextSession);

    setStatus('wrong');
    shake();
    registerAnswer(false);
    goToNext(nextSession, correctCount, masteredCount, totalPoints);
  }

  function revealNextClue() {
    if (clueLevel < 3) {
      setClueLevel((l) => l + 1);
      setInput('');
    }
  }

  function submitTyping() {
    if (status !== 'active' || !input.trim()) return;
    const isCorrect = input.trim().toLowerCase() === current.englishWord.trim().toLowerCase();
    if (isCorrect) {
      resolveCorrect();
    } else {
      shake();
      setInput('');
      if (clueLevel >= 3) resolveWrongFinal();
    }
  }

  function selectChoice(choice) {
    if (status !== 'active') return;
    const isCorrect = choice === current.englishWord;
    if (isCorrect) {
      resolveCorrect();
    } else if (clueLevel < 3) {
      shake();
      revealNextClue();
    } else {
      resolveWrongFinal();
    }
  }

  if (eligibleWords.length === 0) {
    return (
      <div className="px-4 pt-6 text-center py-12">
        <p className="text-brand-grey-text">אין מספיק מידע על מילים לתרגול "מי אני?" במשימה זו.</p>
      </div>
    );
  }

  const clue3Text = blankSentence(current.exampleSentence, current.englishWord);

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
        className={`rounded-2xl bg-white shadow-md p-6 space-y-3 ${shaking ? 'animate-shake' : ''}`}
        onAnimationEnd={stopShake}
      >
        <p className="text-xs font-semibold text-brand-turquoise text-center">מי אני? 🕵️</p>

        <div key={`clue1-${index}`} className="text-center animate-reveal-down">
          <p className="text-xs text-brand-grey-text mb-1">רמז 1 (3 נק')</p>
          <p className="text-base font-semibold text-brand-text" dir="ltr">
            {current.descriptionSentence}
          </p>
        </div>

        {clueLevel >= 2 && (
          <div className="text-center animate-reveal-down">
            <p className="text-xs text-brand-grey-text mb-1">רמז 2 (2 נק')</p>
            <p className="text-lg font-bold text-brand-turquoise">{current.hebrewTranslation}</p>
          </div>
        )}

        {clueLevel >= 3 && clue3Text && (
          <div className="text-center animate-reveal-down">
            <p className="text-xs text-brand-grey-text mb-1">רמז 3 (1 נק')</p>
            <p className="text-sm text-brand-grey-text" dir="ltr">
              {clue3Text}
            </p>
          </div>
        )}

        {status === 'wrong' && (
          <p className="text-center text-sm font-bold text-brand-green" dir="ltr">
            {current.englishWord}
          </p>
        )}
      </div>

      {status === 'active' && clueLevel < 3 && (
        <button
          onClick={revealNextClue}
          className="w-full flex items-center justify-center gap-2 py-2 text-sm font-semibold text-brand-turquoise"
        >
          <Lightbulb size={16} />
          רמז נוסף
        </button>
      )}

      {typingMode ? (
        <div className="space-y-3">
          <input
            type="text"
            dir="ltr"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitTyping()}
            disabled={status !== 'active'}
            placeholder="מי אני? הקלד/י באנגלית..."
            className="w-full rounded-xl border-2 border-brand-grey-light focus:border-brand-turquoise p-4 text-lg text-center font-semibold outline-none transition"
          />
          <button
            onClick={submitTyping}
            disabled={status !== 'active' || !input.trim()}
            className="w-full py-4 rounded-xl bg-brand-turquoise text-white font-bold disabled:opacity-50"
          >
            בדוק/י
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {choices.map((choice) => {
            const isCorrectChoice = choice === current.englishWord;
            let style = 'bg-white text-brand-text';
            if (status !== 'active' && isCorrectChoice) style = 'bg-brand-green/10 text-brand-green';
            return (
              <button
                key={choice}
                onClick={() => selectChoice(choice)}
                disabled={status !== 'active'}
                dir="ltr"
                className={`w-full rounded-xl shadow-md p-4 font-semibold text-lg transition ${style}`}
              >
                {choice}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
