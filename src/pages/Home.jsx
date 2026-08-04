import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, ClipboardList } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import {
  callGetMyAssignments,
  getAllProgress,
  getRankAndTotal,
  listenTopLeaderboard,
  getLatestAnnouncement,
  isAnnouncementRead,
  markAnnouncementRead,
} from '../lib/api.js';
import { computeAssignmentProgress } from '../lib/assignmentProgress.js';
import { pickWordOfDay } from '../lib/wordOfDay.js';
import { ListSkeleton } from '../components/Skeleton.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import AnnouncementBanner from '../components/home/AnnouncementBanner.jsx';
import LeaderboardCard from '../components/home/LeaderboardCard.jsx';
import StreakCard from '../components/home/StreakCard.jsx';
import WordOfTheDayCard from '../components/home/WordOfTheDayCard.jsx';
import AssignmentProgressCard from '../components/practice/AssignmentProgressCard.jsx';

const ASSIGNMENTS_PREVIEW_LIMIT = 3;
const LEADERBOARD_TOP_N = 5;

export default function Home() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assignments, setAssignments] = useState(null);
  const [rankInfo, setRankInfo] = useState(null);
  const [topStudents, setTopStudents] = useState([]);
  const [announcement, setAnnouncement] = useState(null);
  const [wordOfDay, setWordOfDay] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const [assignmentsRes, allProgress, rank, latestAnnouncement] = await Promise.all([
          callGetMyAssignments(),
          getAllProgress(user.uid),
          getRankAndTotal(profile.institutionId, profile.totalXp),
          profile.classIds.length > 0
            ? getLatestAnnouncement(profile.institutionId, profile.classIds[0])
            : Promise.resolve(null),
        ]);

        if (import.meta.env.DEV) {
          console.log('[getMyAssignments] response:', assignmentsRes.data);
        }

        const active = assignmentsRes.data.assignments.filter((a) => a.status === 'active');
        const preview = active.slice(0, ASSIGNMENTS_PREVIEW_LIMIT);
        const [withProgress, todayWord] = await Promise.all([
          Promise.all(preview.map(async (a) => ({ assignment: a, ...(await computeAssignmentProgress(allProgress, a)) }))),
          pickWordOfDay(active, allProgress),
        ]);

        if (!cancelled) {
          setAssignments(withProgress);
          setRankInfo(rank);
          setWordOfDay(todayWord);
          if (latestAnnouncement && !isAnnouncementRead(latestAnnouncement.id)) {
            setAnnouncement(latestAnnouncement);
          }
        }
      } catch (err) {
        console.error('[Home] load failed:', err);
        if (!cancelled) setError('שגיאה בטעינת מסך הבית.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user, profile, reloadKey]);

  useEffect(() => {
    const unsub = listenTopLeaderboard(profile.institutionId, LEADERBOARD_TOP_N, setTopStudents);
    return unsub;
  }, [profile.institutionId]);

  function dismissAnnouncement() {
    if (announcement) markAnnouncementRead(announcement.id);
    setAnnouncement(null);
  }

  return (
    <div className="px-4 pt-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-brand-text">שלום {profile.displayName}!</h1>
      </div>

      {error && <ErrorBanner message={error} onRetry={() => setReloadKey((k) => k + 1)} />}

      <AnnouncementBanner announcement={announcement} onDismiss={dismissAnnouncement} />

      <WordOfTheDayCard word={wordOfDay} />

      <div className="grid grid-cols-2 gap-3">
        <StreakCard streak={profile.streak} lastActiveDate={profile.lastActiveDate} />
        <div className="rounded-2xl bg-white shadow-md p-4 flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-brand-turquoise/10 text-brand-turquoise flex items-center justify-center shrink-0">
            <Star size={22} strokeWidth={2.25} />
          </div>
          <div>
            <p className="text-xl font-bold text-brand-text leading-none">{profile.totalXp}</p>
            <p className="text-xs text-brand-grey-text mt-1">XP</p>
          </div>
        </div>
      </div>

      <LeaderboardCard
        topStudents={topStudents}
        myRank={rankInfo?.rank ?? null}
        totalStudents={rankInfo?.total ?? null}
        myUid={user.uid}
      />

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-brand-text">משימות פעילות</h2>
          <Link to="/practice" className="text-sm font-semibold text-brand-turquoise">
            ראה הכל
          </Link>
        </div>

        {loading && <ListSkeleton rows={2} />}

        {!loading && assignments && assignments.length === 0 && (
          <EmptyState icon={ClipboardList} title="אין משימות פעילות כרגע" />
        )}

        {!loading && assignments && assignments.length > 0 && (
          <div className="space-y-3">
            {assignments.map(({ assignment, completed, total }) => (
              <AssignmentProgressCard
                key={assignment.assignmentId}
                assignment={assignment}
                completed={completed}
                total={total}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
