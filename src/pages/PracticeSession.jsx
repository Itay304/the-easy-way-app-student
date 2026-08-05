import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  callGetMyAssignments,
  getWordsForList,
  getAllProgress,
  applySessionGamification,
  getRankAndTotal,
} from '../lib/api.js';
import { syncSession } from '../lib/progressSync.js';
import { applyAdaptiveOrder } from '../lib/adaptivePractice.js';
import { computeAssignmentMastery } from '../lib/assignmentMastery.js';
import { checkAndAwardBadges } from '../lib/badges.js';
import { updateDailyChallengeProgress } from '../lib/dailyChallenge.js';
import useBackgroundMusic from '../hooks/useBackgroundMusic.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import FlashcardsModule from '../components/practice/FlashcardsModule.jsx';
import QuizModule from '../components/practice/QuizModule.jsx';
import SpellingModule from '../components/practice/SpellingModule.jsx';
import MatchingModule from '../components/practice/MatchingModule.jsx';
import WhoAmI from '../components/practice/WhoAmI.jsx';
import TrueFalse from '../components/practice/TrueFalse.jsx';
import WhatMeans from '../components/practice/WhatMeans.jsx';
import FillSentence from '../components/practice/FillSentence.jsx';
import SessionSummary from '../components/practice/SessionSummary.jsx';
import BadgeUnlockToast from '../components/practice/BadgeUnlockToast.jsx';

// תרגול אדפטיבי (30% מהמילים החלשות בתחילת הסשן) חל רק על quiz/flashcards,
// לא spelling — לפי הבקשה המפורשת.
const ADAPTIVE_MODULES = new Set(['flashcards', 'quiz']);
const NIGHT_OWL_HOUR = 22;

async function buildSessionWords(assignment, uid) {
  const allWords = await getWordsForList(assignment.listId);
  const scoped =
    assignment.wordIds && assignment.wordIds.length > 0
      ? allWords.filter((w) => assignment.wordIds.includes(w.id))
      : allWords;

  const allProgress = await getAllProgress(uid);
  const progressByWord = new Map(allProgress.map((p) => [`${p.sourceListId}::${p.englishWord}`, p]));

  return scoped.map((w) => {
    const baseline = progressByWord.get(`${assignment.listId}::${w.englishWord}`);
    return {
      englishWord: w.englishWord,
      hebrewTranslation: w.hebrewTranslation,
      partOfSpeech: w.partOfSpeech,
      exampleSentence: w.exampleSentence,
      hebrewExample: w.hebrewExample,
      descriptionSentence: w.descriptionSentence,
      sourceListId: assignment.listId,
      correctAttempts: baseline?.correctAttempts || 0,
      totalAttempts: baseline?.totalAttempts || 0,
    };
  });
}

export default function PracticeSession() {
  const { assignmentId, module } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [assignment, setAssignment] = useState(undefined);
  const [words, setWords] = useState(null);
  const [isAdaptive, setIsAdaptive] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [badgeQueue, setBadgeQueue] = useState([]);
  const sessionStartRef = useRef(Date.now());
  useBackgroundMusic();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await callGetMyAssignments();
        const found = res.data.assignments.find((a) => a.assignmentId === assignmentId);
        if (!found) {
          if (!cancelled) setError('המשימה לא נמצאה.');
          return;
        }
        if (!cancelled) setAssignment(found);
        let sessionWords = await buildSessionWords(found, user.uid);
        let adaptive = false;
        if (ADAPTIVE_MODULES.has(module)) {
          const ordered = applyAdaptiveOrder(sessionWords);
          sessionWords = ordered.words;
          adaptive = ordered.isAdaptive;
        }
        if (!cancelled) {
          setWords(sessionWords);
          setIsAdaptive(adaptive);
        }
      } catch (err) {
        console.error('[PracticeSession] load failed:', err);
        if (!cancelled) setError('שגיאה בטעינת מילות המשימה.');
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [assignmentId, module, user]);

  async function handleFinish({ finalWords, correctCount, wordsMasteredCount, moduleComplete, bonusXp = 0, maxCombo = 0 }) {
    const xpGained = correctCount * 10 + wordsMasteredCount * 100 + (moduleComplete ? 50 : 0) + bonusXp;
    const secondsPracticed = Math.round((Date.now() - sessionStartRef.current) / 1000);
    const sessionAccuracy = finalWords.length > 0 ? correctCount / finalWords.length : 0;
    let assignmentMastery = null;
    try {
      await syncSession(user.uid, finalWords);
      const gamification = await applySessionGamification(user.uid, {
        xpGained,
        sessionCorrect: correctCount,
        sessionTotal: finalWords.length,
      });

      const { justCompleted } = await updateDailyChallengeProgress(user.uid, {
        wordsPracticed: finalWords.length,
        secondsPracticed,
        sessionAccuracy,
      });

      // allProgress נטען אחרי syncSession כדי לשקף את התוצאות המעודכנות של
      // הסשן הזה — גם ל-badges וגם להתקדמות-במשימה שמוצגת ב-SessionSummary.
      const allProgress = await getAllProgress(user.uid);
      assignmentMastery = await computeAssignmentMastery(allProgress, assignment);

      if (gamification && profile?.institutionId) {
        const rankInfo = await getRankAndTotal(profile.institutionId, gamification.totalXp);
        const newlyEarned = await checkAndAwardBadges(user.uid, {
          streak: gamification.streak,
          allProgress,
          rank: rankInfo.rank,
          totalActiveDays: gamification.totalActiveDays,
          maxComboThisSession: maxCombo,
          sessionAccuracyPct: sessionAccuracy,
          sessionWordCount: finalWords.length,
          isNightOwlSession: new Date().getHours() >= NIGHT_OWL_HOUR,
          completedFirstDailyChallenge: justCompleted,
        });
        if (newlyEarned.length > 0) setBadgeQueue(newlyEarned);
      }
    } catch (err) {
      console.error('[PracticeSession] finish sync failed:', err);
      // כתיבת progress/תגים נכשלה — עדיין מציגים סיכום, לא חוסמים את המשתמש
    }
    setResult({
      correctCount,
      total: finalWords.length,
      xpGained,
      wordsMasteredCount,
      assignmentMastered: assignmentMastery?.mastered ?? null,
      assignmentTotal: assignmentMastery?.total ?? null,
    });
  }

  function goBack() {
    if (window.history.state && window.history.state.idx > 0) navigate(-1);
    else navigate('/practice', { replace: true });
  }

  if (error) {
    return (
      <div className="px-4 pt-6">
        <ErrorBanner message={error} />
      </div>
    );
  }

  if (assignment === undefined || words === null) {
    return <LoadingSpinner label="טוען מילים..." />;
  }

  if (result) {
    return (
      <>
        <SessionSummary {...result} onDone={() => navigate('/practice', { replace: true })} />
        {badgeQueue[0] && (
          <BadgeUnlockToast badge={badgeQueue[0]} onDismiss={() => setBadgeQueue((q) => q.slice(1))} />
        )}
      </>
    );
  }

  if (words.length === 0) {
    return (
      <div className="px-4 pt-6 text-center py-12">
        <p className="text-brand-grey-text">אין מילים זמינות למשימה הזו.</p>
      </div>
    );
  }

  if (module === 'flashcards')
    return <FlashcardsModule words={words} onFinish={handleFinish} onBack={goBack} adaptiveBanner={isAdaptive} />;
  if (module === 'quiz')
    return <QuizModule words={words} onFinish={handleFinish} onBack={goBack} adaptiveBanner={isAdaptive} />;
  if (module === 'spelling')
    return <SpellingModule words={words} onFinish={handleFinish} onBack={goBack} />;
  if (module === 'matching')
    return <MatchingModule words={words} onFinish={handleFinish} onBack={goBack} />;
  if (module === 'whoami')
    return <WhoAmI words={words} onFinish={handleFinish} onBack={goBack} />;
  if (module === 'truefalse')
    return <TrueFalse words={words} onFinish={handleFinish} onBack={goBack} />;
  if (module === 'whatmeans')
    return <WhatMeans words={words} onFinish={handleFinish} onBack={goBack} />;
  if (module === 'fillsentence')
    return <FillSentence words={words} onFinish={handleFinish} onBack={goBack} />;

  return null;
}
