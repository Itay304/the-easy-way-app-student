import { useEffect, useMemo, useRef, useState } from 'react';
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

// גרירה מותאמת-אישית (לא HTML5 dataTransfer) — כדי שאותו מנגנון יעבוד
// זהה בעכבר (mousedown/mousemove/mouseup) ובמגע (touchstart/touchmove/
// touchend), בסגנון בגרות דיגיטלית: "רפאים" (ghost) עוקב אחר האצבע/העכבר,
// וזיהוי איזו כרטיסיית משפט נמצאת מתחתיו נעשה לפי מיקום (getBoundingClientRect)
// ולא לפי elementFromPoint, כדי שה-ghost עצמו (pointer-events: none) לא יפריע.
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
  const [usedWords, setUsedWords] = useState(() => new Set());
  const [flashWrong, setFlashWrong] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [masteredCount, setMasteredCount] = useState(0);
  const { confettiKey, xpFlyup, celebrate, shake } = useCelebration();
  const { combo, justBroke, registerAnswer, getMaxCombo } = useCombo();

  // גרירה: dragInfo נקבע פעם אחת בתחילת הגרירה (word/offset/מידות) ולא
  // משתנה בכל תזוזה — כך שה-effect שמצמיד listeners ל-window לא נרשם
  // מחדש בכל פיקסל. dragPos/hoverIdx כן מתעדכנים בכל תזוזה, לרינדור בלבד.
  const [dragInfo, setDragInfo] = useState(null);
  const [dragPos, setDragPos] = useState(null);
  const [hoverIdx, setHoverIdx] = useState(null);
  const sentenceRefs = useRef([]);
  const roundRef = useRef(round);
  roundRef.current = round;

  useEffect(() => {
    setRound(rounds[roundIndex] || null);
    setUsedWords(new Set());
    sentenceRefs.current = [];
  }, [roundIndex, rounds]);

  const totalSentences = targetWords.length;
  const resolvedInRound = round ? round.sentences.filter((s) => s.status !== 'pending').length : 0;
  const resolvedSoFar = Math.min(roundIndex * TARGETS_PER_ROUND + resolvedInRound, totalSentences);
  const progressPct = totalSentences > 0 ? Math.round((resolvedSoFar / totalSentences) * 100) : 0;

  function attemptMatch(sentenceIdx, wordEnglish) {
    const currentRound = roundRef.current;
    if (!currentRound) return;
    const sentence = currentRound.sentences[sentenceIdx];
    if (!sentence || sentence.status !== 'pending') return;

    const isCorrect = wordEnglish === sentence.englishWord;
    const sessionIdx = session.findIndex((w) => w.englishWord === sentence.englishWord);
    const currentWord = session[sessionIdx];
    const before = masteryLevel(currentWord.correctAttempts, currentWord.totalAttempts);
    const updatedWord = {
      ...currentWord,
      totalAttempts: currentWord.totalAttempts + 1,
      module: 'matching',
      correct: isCorrect,
    };
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

    const nextSentences = [...currentRound.sentences];
    nextSentences[sentenceIdx] = { ...sentence, status: isCorrect ? 'correct' : 'wrong' };
    setRound({ ...currentRound, sentences: nextSentences });
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

  function findSentenceUnderPoint(clientX, clientY) {
    let found = null;
    sentenceRefs.current.forEach((el, idx) => {
      if (!el) return;
      const sentence = roundRef.current?.sentences[idx];
      if (!sentence || sentence.status !== 'pending') return;
      const r = el.getBoundingClientRect();
      if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) {
        found = idx;
      }
    });
    return found;
  }

  function beginDrag(wordEnglish, clientX, clientY, rect) {
    setDragInfo({
      wordEnglish,
      offsetX: clientX - rect.left,
      offsetY: clientY - rect.top,
      width: rect.width,
      height: rect.height,
    });
    setDragPos({ x: clientX, y: clientY });
    setHoverIdx(findSentenceUnderPoint(clientX, clientY));
  }

  // מאזיני window מוצמדים רק כשמתחילה גרירה (תלוי רק ב-wordEnglish, לא
  // ב-x/y) — כך שהם לא נרשמים/מוסרים מחדש על כל תזוזה, רק בתחילת/סוף גרירה.
  useEffect(() => {
    if (!dragInfo) return undefined;

    function onMove(clientX, clientY) {
      setDragPos({ x: clientX, y: clientY });
      setHoverIdx(findSentenceUnderPoint(clientX, clientY));
    }

    function onEnd(clientX, clientY) {
      const idx = findSentenceUnderPoint(clientX, clientY);
      const wordEnglish = dragInfo.wordEnglish;
      setDragInfo(null);
      setDragPos(null);
      setHoverIdx(null);
      if (idx !== null) attemptMatch(idx, wordEnglish);
    }

    function onMouseMove(e) {
      onMove(e.clientX, e.clientY);
    }
    function onMouseUp(e) {
      onEnd(e.clientX, e.clientY);
    }
    function onTouchMove(e) {
      if (e.touches.length === 0) return;
      e.preventDefault();
      onMove(e.touches[0].clientX, e.touches[0].clientY);
    }
    function onTouchEnd(e) {
      const t = e.changedTouches[0];
      onEnd(t.clientX, t.clientY);
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragInfo?.wordEnglish]);

  if (targetWords.length === 0) {
    return (
      <div className="px-4 pt-6 text-center py-12">
        <p className="text-brand-grey-text">אין משפטי תיאור זמינים לתרגול התאמה במשימה זו.</p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 space-y-5">
      {confettiKey && <Confetti key={confettiKey} count={30} durationMs={1000} />}
      {xpFlyup && <XpFlyup amount={xpFlyup.amount} flyKey={xpFlyup.key} />}

      {dragInfo && dragPos && (
        <div
          className="fixed z-50 pointer-events-none rounded-xl shadow-lg bg-white border-2 border-brand-turquoise flex items-center justify-center font-semibold text-brand-text"
          style={{
            left: dragPos.x - dragInfo.offsetX,
            top: dragPos.y - dragInfo.offsetY,
            width: dragInfo.width,
            height: dragInfo.height,
          }}
          dir="ltr"
        >
          {dragInfo.wordEnglish}
        </div>
      )}

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
      <p className="text-center text-sm text-brand-grey-text">גררו כל מילה מימין למשפט המתאים לה</p>

      <div className="grid grid-cols-[3fr_2fr] gap-3 items-start">
        {/* עמודה ימנית (ראשונה ב-DOM, dir=rtl הופך אותה לימין) — משפטי תיאור, ממוספרים וקבועים */}
        <div className="space-y-3">
          {round.sentences.map((sentence, i) => {
            const isHovered = hoverIdx === i && sentence.status === 'pending';
            let cardStyle = 'bg-white text-brand-text border-2 border-transparent';
            if (sentence.status === 'correct') cardStyle = 'bg-brand-grey-light/70 text-brand-text/70 border-2 border-transparent';
            else if (sentence.status === 'wrong') cardStyle = 'bg-red-50 text-red-600 border-2 border-transparent';
            else if (isHovered) cardStyle = 'bg-brand-turquoise/5 text-brand-text border-2 border-brand-turquoise';

            return (
              <div
                key={`${roundIndex}-${i}`}
                ref={(el) => {
                  sentenceRefs.current[i] = el;
                }}
                className={`rounded-2xl shadow-md p-4 transition select-none ${cardStyle}`}
              >
                <div className="flex items-start gap-2">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-brand-turquoise/10 text-brand-turquoise text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <p className="text-base font-semibold flex-1" dir="ltr">
                    {sentence.descriptionSentence}
                  </p>
                  {sentence.status === 'correct' && <Check size={20} className="text-brand-turquoise shrink-0" />}
                  {sentence.status === 'wrong' && <X size={20} className="text-red-500 shrink-0" />}
                </div>
                {sentence.status === 'wrong' && (
                  <p className="text-sm font-bold mt-2 mr-8 text-red-600" dir="ltr">
                    {sentence.englishWord}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* עמודה שמאלית — כרטיסיות מילים לגרירה, קצת יותר קטנות מכרטיסי המשפטים */}
        <div className="space-y-2">
          {round.words.map((wordEnglish) => {
            const isUsed = usedWords.has(wordEnglish);
            const isFlashing = flashWrong === wordEnglish;
            const isDragging = dragInfo?.wordEnglish === wordEnglish;
            let style = 'bg-white text-brand-text shadow-sm';
            if (isUsed) style = 'bg-brand-turquoise/10 text-brand-turquoise opacity-60';
            else if (isFlashing) style = 'bg-red-50 text-red-600 shadow-sm';

            return (
              <div
                key={wordEnglish}
                onMouseDown={(e) => {
                  if (isUsed) return;
                  e.preventDefault();
                  const rect = e.currentTarget.getBoundingClientRect();
                  beginDrag(wordEnglish, e.clientX, e.clientY, rect);
                }}
                onTouchStart={(e) => {
                  if (isUsed) return;
                  const t = e.touches[0];
                  const rect = e.currentTarget.getBoundingClientRect();
                  beginDrag(wordEnglish, t.clientX, t.clientY, rect);
                }}
                className={`touch-none select-none rounded-xl p-2.5 font-semibold text-center text-sm transition ${style} ${
                  isFlashing ? 'animate-shake' : ''
                } ${isDragging ? 'opacity-0' : ''} ${!isUsed ? 'cursor-grab active:cursor-grabbing' : ''}`}
                dir="ltr"
              >
                {isUsed && <Check size={14} className="inline ml-1" />}
                {wordEnglish}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
