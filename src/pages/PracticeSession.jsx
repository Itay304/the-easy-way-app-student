import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  callGetMyAssignments,
  getWordsForList,
  getAllProgress,
  applySessionGamification,
} from '../lib/api.js';
import { syncSession } from '../lib/progressSync.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import FlashcardsModule from '../components/practice/FlashcardsModule.jsx';
import QuizModule from '../components/practice/QuizModule.jsx';
import SpellingModule from '../components/practice/SpellingModule.jsx';
import SessionSummary from '../components/practice/SessionSummary.jsx';

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
      sourceListId: assignment.listId,
      correctAttempts: baseline?.correctAttempts || 0,
      totalAttempts: baseline?.totalAttempts || 0,
    };
  });
}

export default function PracticeSession() {
  const { assignmentId, module } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [assignment, setAssignment] = useState(undefined);
  const [words, setWords] = useState(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null); // { correctCount, total } once finished

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
        const sessionWords = await buildSessionWords(found, user.uid);
        if (!cancelled) setWords(sessionWords);
      } catch (err) {
        console.error('[PracticeSession] load failed:', err);
        if (!cancelled) setError('שגיאה בטעינת מילות המשימה.');
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [assignmentId, user]);

  async function handleFinish({ finalWords, correctCount, wordsMasteredCount, moduleComplete }) {
    const xpGained =
      correctCount * 10 + wordsMasteredCount * 100 + (moduleComplete ? 50 : 0);
    try {
      await syncSession(user.uid, finalWords);
      await applySessionGamification(user.uid, { xpGained });
    } catch {
      // כתיבת progress נכשלה — עדיין מציגים סיכום, לא חוסמים את המשתמש
    }
    setResult({ correctCount, total: finalWords.length, xpGained });
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
    return <SessionSummary {...result} onDone={() => navigate('/practice', { replace: true })} />;
  }

  if (words.length === 0) {
    return (
      <div className="px-4 pt-6 text-center py-12">
        <p className="text-brand-grey-text">אין מילים זמינות למשימה הזו.</p>
      </div>
    );
  }

  if (module === 'flashcards') return <FlashcardsModule words={words} onFinish={handleFinish} onBack={goBack} />;
  if (module === 'quiz') return <QuizModule words={words} onFinish={handleFinish} onBack={goBack} />;
  if (module === 'spelling') return <SpellingModule words={words} onFinish={handleFinish} onBack={goBack} />;

  return null;
}
