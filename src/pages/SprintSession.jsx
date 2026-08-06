import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, ArrowRight, Trophy } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import {
  callGetMyAssignments,
  getWordsForList,
  getAllProgress,
  applySessionGamification,
  getRankAndTotal,
  getClassAverageAccuracy,
} from '../lib/api.js';
import { syncSession } from '../lib/progressSync.js';
import { checkAndAwardBadges } from '../lib/badges.js';
import { buildChoices, shuffle } from '../lib/quizChoices.js';
import useCelebration from '../hooks/useCelebration.js';
import useBackgroundMusic from '../hooks/useBackgroundMusic.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import Confetti from '../components/practice/Confetti.jsx';
import XpFlyup from '../components/practice/XpFlyup.jsx';
import BadgeUnlockToast from '../components/practice/BadgeUnlockToast.jsx';

const SPRINT_DURATION_SEC = 60;
const SPRINT_WORD_COUNT = 10;
const MIN_POOL_SIZE = 4;
const NIGHT_OWL_HOUR = 22;

async function buildSprintPool(uid) {
  const res = await callGetMyAssignments();
  const active = res.data.assignments.filter((a) => a.status === 'active');
  if (active.length === 0) return [];

  const uniqueListIds = [...new Set(active.map((a) => a.listId).filter(Boolean))];
  const [wordLists, allProgress] = await Promise.all([
    Promise.all(uniqueListIds.map((listId) => getWordsForList(listId))),
    getAllProgress(uid),
  ]);
  const progressByKey = new Map(allProgress.map((p) => [`${p.sourceListId}::${p.englishWord}`, p]));

  const allWords = wordLists.flat().map((w) => {
    const baseline = progressByKey.get(`${w.sourceListId}::${w.englishWord}`);
    return {
      englishWord: w.englishWord,
      hebrewTranslation: w.hebrewTranslation,
      sourceListId: w.sourceListId,
      correctAttempts: baseline?.correctAttempts || 0,
      totalAttempts: baseline?.totalAttempts || 0,
    };
  });

  return shuffle(allWords).slice(0, SPRINT_WORD_COUNT);
}

function timerColor(secondsLeft) {
  if (secondsLeft > 30) return 'text-brand-green';
  if (secondsLeft > 10) return 'text-amber-500';
  return 'text-red-600';
}

export default function SprintSession() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [pool, setPool] = useState(null); // null = loading
  const [error, setError] = useState('');
  const [index, setIndex] = useState(0);
  const [session, setSession] = useState([]);
  const [selected, setSelected] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(SPRINT_DURATION_SEC);
  const [result, setResult] = useState(null); // { correctCount, answered, classAverage }
  const [badgeQueue, setBadgeQueue] = useState([]);
  const { confettiKey, xpFlyup, celebrate, shake } = useCelebration();
  const finishingRef = useRef(false);
  useBackgroundMusic();

  useEffect(() => {
    let cancelled = false;
    buildSprintPool(user.uid)
      .then((words) => {
        if (!cancelled) {
          setPool(words);
          setSession(words.map((w) => ({ ...w })));
        }
      })
      .catch((err) => {
        console.error('[SprintSession] load failed:', err);
        if (!cancelled) setError('שגיאה בטעינת מילים לספרינט.');
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const choices = useMemo(() => {
    if (!pool || pool.length < MIN_POOL_SIZE || index >= pool.length) return [];
    return buildChoices(pool, index);
  }, [pool, index]);

  useEffect(() => {
    if (!pool || pool.length < MIN_POOL_SIZE || result) return undefined;
    if (secondsLeft <= 0) {
      finish();
      return undefined;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, pool, result]);

  async function finish() {
    if (finishingRef.current) return;
    finishingRef.current = true;

    const answered = session.filter((w) => (w.totalAttempts || 0) > 0);
    const xpGained = correctCount * 10;

    let classAverage = null;
    try {
      await syncSession(user.uid, answered);
      const gamification = await applySessionGamification(user.uid, {
        xpGained,
        sessionCorrect: correctCount,
        sessionTotal: answered.length,
      });
      if (profile?.institutionId) {
        classAverage = await getClassAverageAccuracy(profile.institutionId);
      }
      if (gamification && profile?.institutionId) {
        const [allProgress, rankInfo] = await Promise.all([
          getAllProgress(user.uid),
          getRankAndTotal(profile.institutionId, gamification.totalXp),
        ]);
        const newlyEarned = await checkAndAwardBadges(user.uid, {
          streak: gamification.streak,
          allProgress,
          rank: rankInfo.rank,
          totalActiveDays: gamification.totalActiveDays,
          isNightOwlSession: new Date().getHours() >= NIGHT_OWL_HOUR,
        });
        if (newlyEarned.length > 0) setBadgeQueue(newlyEarned);
      }
    } catch (err) {
      console.error('[SprintSession] finish sync failed:', err);
    }

    setResult({ correctCount, answered: answered.length, xpGained, classAverage });
  }

  function selectAnswer(choice) {
    if (selected !== null || !pool) return;
    setSelected(choice);

    const current = pool[index];
    const isCorrect = choice === current.hebrewTranslation;
    const updated = { ...current, totalAttempts: current.totalAttempts + 1 };
    if (isCorrect) updated.correctAttempts = current.correctAttempts + 1;

    if (isCorrect) {
      celebrate(10);
      setCorrectCount((c) => c + 1);
    } else {
      shake();
    }

    const nextSession = [...session];
    nextSession[index] = updated;
    setSession(nextSession);

    setTimeout(() => {
      if (index + 1 >= pool.length) {
        finish();
        return;
      }
      setIndex((i) => i + 1);
      setSelected(null);
    }, 700);
  }

  function goBack() {
    navigate('/practice', { replace: true });
  }

  if (error) {
    return (
      <div className="px-4 pt-6">
        <ErrorBanner message={error} />
      </div>
    );
  }

  if (pool === null) {
    return <LoadingSpinner label="מכין ספרינט..." />;
  }

  if (pool.length < MIN_POOL_SIZE) {
    return (
      <div className="px-4 pt-6 text-center py-12 space-y-4">
        <p className="text-brand-grey-text">אין מספיק מילים במשימות הפעילות שלך כדי להתחיל ספרינט.</p>
        <button onClick={goBack} className="text-brand-turquoise font-semibold">
          חזרה לתרגול
        </button>
      </div>
    );
  }

  if (result) {
    const { classAverage } = result;
    const myAccuracy = result.answered > 0 ? result.correctCount / result.answered : 0;
    const comparisonText =
      classAverage === null
        ? null
        : myAccuracy >= classAverage
          ? 'מעל הממוצע הכיתתי 💪'
          : 'מתחת לממוצע הכיתתי — עוד קצת תרגול!';

    return (
      <div className="px-4 pt-10 flex flex-col items-center text-center space-y-6">
        <div className="h-20 w-20 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center">
          <Zap size={40} strokeWidth={2} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-brand-text">ספרינט הסתיים!</h1>
          <p className="text-brand-grey-text mt-1">
            {result.correctCount} מתוך {result.answered} נכון
          </p>
        </div>

        <div className="w-full rounded-2xl bg-gradient-to-b from-white to-gray-50 shadow-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-brand-grey-text">
              <Trophy size={18} className="text-amber-500" />
              הדיוק שלך
            </span>
            <span className="font-bold text-brand-text">{Math.round(myAccuracy * 100)}%</span>
          </div>
          {classAverage !== null && (
            <div className="flex items-center justify-between">
              <span className="text-brand-grey-text">ממוצע הכיתה</span>
              <span className="font-bold text-brand-text">{Math.round(classAverage * 100)}%</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-brand-grey-text">נקודות שהרווחת</span>
            <span className="font-bold text-brand-turquoise">+{result.xpGained} XP</span>
          </div>
          {comparisonText && <p className="text-sm font-semibold text-brand-turquoise pt-2">{comparisonText}</p>}
        </div>

        <button onClick={goBack} className="w-full py-4 rounded-xl bg-gradient-to-r from-turquoise-400 to-turquoise-600 text-white font-bold">
          סיום
        </button>

        {badgeQueue[0] && (
          <BadgeUnlockToast badge={badgeQueue[0]} onDismiss={() => setBadgeQueue((q) => q.slice(1))} />
        )}
      </div>
    );
  }

  const current = pool[index];

  return (
    <div className="px-4 pt-6 space-y-5">
      {confettiKey && <Confetti key={confettiKey} count={30} durationMs={1000} />}
      {xpFlyup && <XpFlyup amount={xpFlyup.amount} flyKey={xpFlyup.key} />}

      <div className="flex items-center justify-between">
        <button onClick={goBack} className="inline-flex items-center gap-1 text-sm text-brand-grey-text hover:text-brand-text">
          <ArrowRight size={16} />
          חזרה
        </button>
        <span className={`text-2xl font-extrabold tabular-nums ${timerColor(secondsLeft)}`}>{secondsLeft}s</span>
      </div>

      <div className="h-2 rounded-full bg-brand-grey-light overflow-hidden">
        <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${(index / pool.length) * 100}%` }} />
      </div>
      <p className="text-center text-sm text-brand-grey-text">
        {index + 1} מתוך {pool.length}
      </p>

      <div className="rounded-2xl bg-gradient-to-b from-white to-gray-50 shadow-lg p-8 text-center">
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
