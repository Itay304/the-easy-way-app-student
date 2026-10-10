import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { getRankAndTotal, listenTopLeaderboard, getLatestAnnouncement, isAnnouncementRead, markAnnouncementRead } from '../lib/api.js';
import ErrorBanner from '../components/ErrorBanner.jsx';
import InstallBanner from '../components/InstallBanner.jsx';
import AnnouncementBanner from '../components/home/AnnouncementBanner.jsx';
import LeaderboardCard from '../components/home/LeaderboardCard.jsx';
import StreakCard from '../components/home/StreakCard.jsx';
import DailyChallengeCard from '../components/home/DailyChallengeCard.jsx';
import StatCard from '../components/ui/StatCard.jsx';

const LEADERBOARD_TOP_N = 5;

export default function Home() {
  const { user, profile } = useAuth();
  const [error, setError] = useState('');
  const [rankInfo, setRankInfo] = useState(null);
  const [topStudents, setTopStudents] = useState([]);
  const [announcement, setAnnouncement] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError('');
      try {
        const [rank, latestAnnouncement] = await Promise.all([
          getRankAndTotal(profile.institutionId, profile.totalXp),
          profile.classIds.length > 0
            ? getLatestAnnouncement(profile.institutionId, profile.classIds[0])
            : Promise.resolve(null),
        ]);

        if (!cancelled) {
          setRankInfo(rank);
          if (latestAnnouncement && !isAnnouncementRead(latestAnnouncement.id)) {
            setAnnouncement(latestAnnouncement);
          }
        }
      } catch (err) {
        console.error('[Home] load failed:', err);
        if (!cancelled) setError('שגיאה בטעינת מסך הבית.');
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
        <h1 className="text-h1 font-bold text-brand-text">שלום {profile.displayName}!</h1>
      </div>

      {error && <ErrorBanner message={error} onRetry={() => setReloadKey((k) => k + 1)} />}

      <DailyChallengeCard uid={user.uid} />

      <AnnouncementBanner announcement={announcement} onDismiss={dismissAnnouncement} />

      <div className="grid grid-cols-2 gap-3">
        <StreakCard streak={profile.streak} lastActiveDate={profile.lastActiveDate} />
        <StatCard icon={Star} value={profile.totalXp} label="XP" accent="primary" />
      </div>

      <LeaderboardCard
        topStudents={topStudents}
        myRank={rankInfo?.rank ?? null}
        totalStudents={rankInfo?.total ?? null}
        myUid={user.uid}
      />

      <InstallBanner />
    </div>
  );
}
