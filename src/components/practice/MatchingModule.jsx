import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, X } from 'lucide-react';
import { masteryLevel } from '../../lib/gamification.js';
import { shuffle } from '../../lib/quizChoices.js';
import useCelebration from '../../hooks/useCelebration.js';
import useCombo from '../../hooks/useCombo.js';
import Confetti from './Confetti.jsx';
import XpFlyup from './XpFlyup.jsx';
import ComboBar from './ComboBar.jsx';

const TARGETS_PER_ROUND = 3;
const ROUND_ADVANCE_DELAY_MS = 1100;
const WRONG_FLASH_MS = 600;

function dedupeByEnglishWord(list) {
  const seen = new Set();
  const out = [];
  for (const w of list) {
    if (seen.has(w.englishWord)) continue;
    seen.add(w.englishWord);
    out.push(w);
  }
  return out;
}

function buildRounds(targetWords, distractorPool) {
  const rounds = [];
  for (let i = 0; i < targetWords.length; i += TARGETS_PER_ROUND) {
    const targets = targetWords.slice(i, i + TARGETS_PER_ROUND);
    const targetEnglish = new Set(targets.map((w) => w.englishWord));
    const otherWords = shuffle(distractorPool.filter((w) => !targetEnglish.has(w.englishWord)));
    const distractorCount = Math.min(otherWords.length, Math.random() < 0.5 ? 2 : 3);
    const distractorChips = otherWords.slice(0, distractorCount).map((w) => w.englishWord);
    const targetChips = targets.map((w) => w.englishWord);

    rounds.push({
      sentences: targets.map((w) => ({
        englishWord: w.englishWord,
        descriptionSentence: w.descriptionSentence,
        status: 'pending', // 'pending' | 'correct' | 'wrong'
      })),
      words: shuffle([...targetChips, ...distractorChips]),
    });
  }
  return rounds;
}

export default function MatchingModule({ words, onFinish, onBack, adaptiveBanner }) {
  const targetWords = useMemo(() => {
    const withDescription = words.filter((w) => w.descriptionSentence);
    return shuffle(dedupeByEnglishWord(withDescription));
  }, [words]);

  const distractorPool = useMemo(() => dedupeByEnglishWord(words), [words]);

  const rounds = useMemo(() => buildRounds(targetWords, distractorPool), [targetWords, distractorPool]);

  const [roundIndex, setRoundIndex] = useState(0);
  const [round, setRound] = useState(() => rounds[0] || null);
  const [session, setSession] = useState(() => targetWords.map((w) => ({ ...w })));
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [usedWords, setUsedWords] = useState(() => new Set());
  const [flashWrong, setFlashWrong] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [masteredCount, setMasteredCount] = useState(0);
  const { confettiKey, xpFlyup, celebrate, shake } = useCelebration();
  const { combo, justBroke, registerAnswer, getMaxCombo } = useCombo();

  useEffect(() => {
    setRound(rounds[roundIndex] || null);
    setSelectedIdx(null);
    setUsedWords(new Set());
  }, [roundIndex, rounds]);

  const totalSentences = targetWords.length;
  const resolvedInRound = round ? round.sentences.filter((s) => s.status !== 'pending').length : 0;
  const resolvedSoFar = Math.min(roundIndex * TARGETS_PER_ROUND + resolvedInRound, totalSentences);
  const progressPct = totalSentences > 0 ? Math.round((resolvedSoFar / totalSentences) * 100) : 0;

  function attemptMatch(sentenceIdx, wordEnglish) {
    if (!round) return;
    const sentence = round.sentences[sentenceIdx];
    if (!sentence || sentence.status !== 'pending') return;

    const isCorrect = wordEnglish === sentence.englishWord;
    const sessionIdx = session.findIndex((w) => w.englishWord === sentence.englishWord);
    const currentWord = session[sessionIdx];
    const before = masteryLevel(currentWord.correctAttempts, currentWord.totalAttempts);
    const updatedWord = { ...currentWord, totalAttempts: currentWord.totalAttempts + 1 };
    if (isCorrect) updatedWord.correctAttempts = currentWord.correctAttempts + 1;
    const after = masteryLevel(updatedWord.correctAttempts, updatedWord.totalAttempts);
    const justMastered = isCorrect && before < 5 && after === 5;

    const nextSession = [...session];
    nextSession[sessionIdx] = updatedWord;
    setSession(nextSession);

    const nextCorrectCount = correctCount + (isCorrect ? 1 : 0);
    const nextMasteredCount = masteredCount + (justMastered ? 1 : 0);
    setCorrectCount(nextCorrectCount);
    setMasteredCount(nextMasteredCount);

    registerAnswer(isCorrect);
    if (isCorrect) {
      celebrate(10);
    } else {
      shake();
      setFlashWrong(wordEnglish);
      setTimeout(() => setFlashWrong((w) => (w === wordEnglish ? null : w)), WRONG_FLASH_MS);
    }

    const nextSentences = [...round.sentences];
    nextSentences[sentenceIdx] = { ...sentence, status: isCorrect ? 'correct' : 'wrong' };
    setRound({ ...round, sentences: nextSentences });
    setSelectedIdx(null);
    setUsedWords((prev) => new Set(prev).add(sentence.englishWord));

    const allResolved = nextSentences.every((s) => s.status !== 'pending');
    if (allResolved) {
      setTimeout(() => {
        if (roundIndex + 1 >= rounds.length) {
          onFinish({
            finalWords: nextSession,
            correctCount: nextCorrectCount,
            wordsMasteredCount: nextMasteredCount,
            moduleComplete: totalSentences > 0 && nextCorrectCount / totalSentences >= 0.6,
            maxCombo: getMaxCombo(),
          });
          return;
        }
        setRoundIndex((i) => i + 1);
      }, ROUND_ADVANCE_DELAY_MS);
    }
  }

  function handleDrop(sentenceIdx, e) {
    e.preventDefault();
    const wordEnglish = e.dataTransfer.getData('text/plain');
    if (wordEnglish) attemptMatch(sentenceIdx, wordEnglish);
  }

  if (targetWords.length === 0) {
    return (
      <div className="px-4 pt-6 text-center py-12">
        <p className="text-brand-grey-text">אין משפטי תיאור זמינים לתרגול התאמה במשימה זו.</p>
      </div>
    );
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
        {resolvedSoFar} מתוך {totalSentences}
      </p>
      <p className="text-center text-sm text-brand-grey-text">חברו כל משפט למילה המתאימה לו</p>

      <div className="space-y-3">
        {round.sentences.map((sentence, i) => {
          const isSelected = selectedIdx === i;
          let style = 'bg-white text-brand-text';
          if (sentence.status === 'correct') style = 'bg-brand-green/10 text-brand-green';
          else if (sentence.status === 'wrong') style = 'bg-red-50 text-red-600';
          else if (isSelected) style = 'ring-2 ring-brand-turquoise bg-brand-turquoise/5';

          return (
            <div
              key={`${roundIndex}-${i}`}
              onClick={() => sentence.status === 'pending' && setSelectedIdx(i)}
              onDragOver={(e) => sentence.status === 'pending' && e.preventDefault()}
              onDrop={(e) => sentence.status === 'pending' && handleDrop(i, e)}
              className={`rounded-2xl shadow-md p-4 transition cursor-pointer ${style}`}
            >
              <p className="text-base font-semibold" dir="ltr">
                {sentence.descriptionSentence}
              </p>
              {sentence.status === 'correct' && (
                <p className="flex items-center gap-1 text-sm font-bold mt-2" dir="ltr">
                  <Check size={16} />
                  {sentence.englishWord}
                </p>
              )}
              {sentence.status === 'wrong' && (
                <p className="flex items-center gap-1 text-sm font-bold mt-2" dir="ltr">
                  <X size={16} />
                  {sentence.englishWord}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {round.words.map((wordEnglish) => {
          const isUsed = usedWords.has(wordEnglish);
          const isFlashing = flashWrong === wordEnglish;
          let style = 'bg-white text-brand-text hover:shadow-lg';
          if (isUsed) style = 'bg-brand-green/10 text-brand-green opacity-60';
          else if (isFlashing) style = 'bg-red-50 text-red-600';

          return (
            <button
              key={wordEnglish}
              draggable={!isUsed}
              onDragStart={(e) => e.dataTransfer.setData('text/plain', wordEnglish)}
              disabled={isUsed}
              onClick={() => selectedIdx !== null && attemptMatch(selectedIdx, wordEnglish)}
              className={`rounded-xl shadow-md p-3 font-semibold text-center transition cursor-pointer ${style} ${
                isFlashing ? 'animate-shake' : ''
              }`}
              dir="ltr"
            >
              {isUsed && <Check size={14} className="inline ml-1" />}
              {wordEnglish}
            </button>
          );
        })}
      </div>
    </div>
  );
}
