import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  callGetMyAssignments,
  getWordsForAssignment,
  getAllProgress,
  applySessionGamification,
  getRankAndTotal,
} from '../lib/api.js';
import { withBaseline } from '../lib/progressSync.js';
import { createSessionRecorder } from '../lib/sessionRecorder.js';
import { createAssignmentTracker, loadStudentProgress } from '../lib/assignmentProgress.js';
import { applyAdaptiveOrder } from '../lib/adaptivePractice.js';
import { buildSession, dayKey, daySummary, stagesFor } from '../lib/stages.js';
import { statusFrom } from '../lib/assignmentStatus.js';
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
import VariedModule from '../components/practice/VariedModule.jsx';
import SessionSummary from '../components/practice/SessionSummary.jsx';
import BadgeUnlockToast from '../components/practice/BadgeUnlockToast.jsx';

// תרגול אדפטיבי (30% מהמילים החלשות בתחילת הסשן) חל רק על quiz/flashcards,
// לא spelling — לפי הבקשה המפורשת.
const ADAPTIVE_MODULES = new Set(['flashcards', 'quiz']);
const NIGHT_OWL_HOUR = 22;
const EXTRA_SESSION_XP = 30; // סבב נוסף מעבר ליעד היומי

async function buildSessionWords(assignment, uid, institutionId) {
  const allWords = await getWordsForAssignment(assignment, institutionId);
  const scoped =
    assignment.wordIds && assignment.wordIds.length > 0
      ? allWords.filter((w) => assignment.wordIds.includes(w.id))
      : allWords;

  const allProgress = await getAllProgress(uid);
  const progressByWord = new Map(allProgress.map((p) => [`${p.sourceListId}::${p.englishWord}`, p]));

  return scoped.map((w) => {
    const baseline = progressByWord.get(`${assignment.listId}::${w.englishWord}`);
    return withBaseline({
      wordId: w.id,
      englishWord: w.englishWord,
      hebrewTranslation: w.hebrewTranslation,
      partOfSpeech: w.partOfSpeech,
      exampleSentence: w.exampleSentence,
      hebrewExample: w.hebrewExample,
      descriptionSentence: w.descriptionSentence,
      sourceListId: assignment.listId,
      correctAttempts: baseline?.correctAttempts || 0,
      totalAttempts: baseline?.totalAttempts || 0,
    });
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
  const recorderRef = useRef(null);
  const trackerRef = useRef(null); // התקדמות במשימה (שלבים) — רק בתרגול המגוון של המשימה, לא בתרגול חופשי
  const stageRef = useRef(null); // { stages, before, sessions, today } — לבניית הסבב ולסיכום היום
  const sessionRef = useRef([]);
  const finishedRef = useRef(false);
  useBackgroundMusic();

  // כל עדכון מהמודול → שמירת ביניים כל כמה תשובות (sessionRecorder)
  const handleProgress = useCallback((session) => {
    sessionRef.current = session;
    recorderRef.current?.update(session);
  }, []);

  // מעבר לרקע / סגירת הלשונית / יציאה מהעמוד — שומרים מה שנענה עד עכשיו
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') recorderRef.current?.flush();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
      if (!finishedRef.current) recorderRef.current?.flush();
    };
  }, []);

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
        const stageMode = module === 'varied' && Boolean(profile?.institutionId);
        if (stageMode) {
          const initial = await loadStudentProgress(profile.institutionId, found.assignmentId, user.uid);
          trackerRef.current = createAssignmentTracker({
            institutionId: profile.institutionId,
            assignment: found,
            uid: user.uid,
            initialWords: initial.words,
          });
          stageRef.current = { before: structuredClone(initial.words), sessions: initial.sessions, today: dayKey() };
        }
        recorderRef.current = createSessionRecorder({
          uid: user.uid,
          assignmentId,
          extraWritesFor: trackerRef.current ? (deltas) => trackerRef.current.extraWritesFor(deltas) : undefined,
        });
        let sessionWords = await buildSessionWords(found, user.uid, profile?.institutionId);
        if (stageMode) {
          // סבב של המשימה: מילים חדשות מהשלב הנוכחי + חזרה, עד 16 (lib/stages.js), בסדר שנקבע
          const stages = stagesFor(found.wordIds?.length ? found.wordIds : sessionWords.map((w) => w.wordId), found.stagePlan);
          stageRef.current.stages = stages;
          const byId = new Map(sessionWords.map((w) => [w.wordId, w]));
          const items = buildSession({ stages, words: stageRef.current.before, today: stageRef.current.today });
          sessionWords = items.map((it) => byId.get(it.wordId)).filter(Boolean);
        }
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
  }, [assignmentId, module, user, profile?.institutionId]);

  async function handleFinish({ finalWords, correctCount, wordsMasteredCount, moduleComplete, bonusXp = 0, maxCombo = 0 }) {
    finishedRef.current = true;
    // ה-XP על תשובות נכונות (10 לכל אחת) כבר נכתב בשמירות הביניים; כאן רק הבונוסים של סוף הסבב
    // סבב נוסף אחרי שהיעד היומי כבר הושג → בונוס
    const st = stageRef.current;
    const goalBefore = st ? statusFrom({ assignment, stages: st.stages, words: st.before, sessions: st.sessions }) : null;
    const extraSessionXp = goalBefore && goalBefore.sessionsToday >= goalBefore.goal.sessions ? EXTRA_SESSION_XP : 0;
    const finishBonusXp = wordsMasteredCount * 100 + (moduleComplete ? 50 : 0) + bonusXp + extraSessionXp;
    const xpGained = correctCount * 10 + finishBonusXp;
    const secondsPracticed = Math.round((Date.now() - sessionStartRef.current) / 1000);
    const sessionAccuracy = finalWords.length > 0 ? correctCount / finalWords.length : 0;
    let stageSummary = null;
    try {
      recorderRef.current.update(finalWords);
      await recorderRef.current.flush();
      await trackerRef.current?.markSessionComplete();
      const gamification =
        (finishBonusXp > 0 ? await applySessionGamification(user.uid, { xpGained: finishBonusXp }) : null) ||
        recorderRef.current.gamification();

      const { justCompleted } = await updateDailyChallengeProgress(user.uid, {
        wordsPracticed: finalWords.length,
        secondsPracticed,
        sessionAccuracy,
      });

      // allProgress נטען אחרי השמירה כדי לשקף את הסבב הזה (לתגים)
      const allProgress = await getAllProgress(user.uid);

      // סיכום היום במשימה: מה נלמד, מה חוזר מחר, השלב והיעד היומי אחרי הסבב
      if (st && trackerRef.current) {
        const after = trackerRef.current.words();
        const sessions = { ...st.sessions, [st.today]: (st.sessions[st.today] || 0) + 1 };
        const statusAfter = statusFrom({ assignment, stages: st.stages, words: after, sessions });
        const day = daySummary(st.stages, st.before, after, st.today);
        stageSummary = {
          learned: day.becameKnown.map((id) => after[id]?.en).filter(Boolean),
          firstSeen: day.firstSeen.length,
          tomorrowReview: day.tomorrowReview,
          progress: statusAfter.progress,
          sessionsToday: statusAfter.sessionsToday,
          goalSessions: statusAfter.goal.sessions,
          extraSessionXp,
        };
      }

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
      stageSummary,
    });
  }

  // יציאה באמצע הסבב: שומרים מה שנענה (התקדמות, XP, רצף) ומעדכנים את אתגר היום — ורק אז יוצאים
  async function goBack() {
    if (!finishedRef.current && recorderRef.current) {
      finishedRef.current = true;
      recorderRef.current.update(sessionRef.current);
      await recorderRef.current.flush();
      const { total } = recorderRef.current.totals();
      if (total > 0) {
        await updateDailyChallengeProgress(user.uid, {
          wordsPracticed: total,
          secondsPracticed: Math.round((Date.now() - sessionStartRef.current) / 1000),
          sessionAccuracy: 0,
        }).catch((err) => console.error('[PracticeSession] daily challenge on exit failed:', err));
      }
    }
    if (window.history.state && window.history.state.idx > 0) navigate(-1);
    else navigate('/practice', { replace: true });
  }

  if (error) {
    return (
      <div className="px-4 pt-6 lg:px-10">
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
        <SessionSummary {...result} onDone={() => navigate(`/practice/${assignmentId}`, { replace: true })} />
        {badgeQueue[0] && (
          <BadgeUnlockToast badge={badgeQueue[0]} onDismiss={() => setBadgeQueue((q) => q.slice(1))} />
        )}
      </>
    );
  }

  if (words.length === 0) {
    return (
      <div className="px-4 pt-6 text-center py-12 lg:px-10">
        <p className="text-brand-grey-text">אין מילים זמינות למשימה הזו.</p>
      </div>
    );
  }

  if (module === 'flashcards')
    return <FlashcardsModule words={words} onFinish={handleFinish} onBack={goBack} onProgress={handleProgress} adaptiveBanner={isAdaptive} />;
  if (module === 'quiz')
    return <QuizModule words={words} onFinish={handleFinish} onBack={goBack} onProgress={handleProgress} adaptiveBanner={isAdaptive} />;
  if (module === 'spelling')
    return <SpellingModule words={words} onFinish={handleFinish} onBack={goBack} onProgress={handleProgress} />;
  if (module === 'matching')
    return <MatchingModule words={words} onFinish={handleFinish} onBack={goBack} onProgress={handleProgress} />;
  if (module === 'whoami')
    return <WhoAmI words={words} onFinish={handleFinish} onBack={goBack} onProgress={handleProgress} />;
  if (module === 'truefalse')
    return <TrueFalse words={words} onFinish={handleFinish} onBack={goBack} onProgress={handleProgress} />;
  if (module === 'whatmeans')
    return <WhatMeans words={words} onFinish={handleFinish} onBack={goBack} onProgress={handleProgress} />;
  if (module === 'fillsentence')
    return <FillSentence words={words} onFinish={handleFinish} onBack={goBack} onProgress={handleProgress} />;
  if (module === 'varied')
    return <VariedModule words={words} onFinish={handleFinish} onBack={goBack} onProgress={handleProgress} ordered={Boolean(stageRef.current)} requeueMistakes={Boolean(stageRef.current)} />;

  return null;
}
