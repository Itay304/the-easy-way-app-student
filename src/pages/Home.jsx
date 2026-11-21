import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import {
  getRankAndTotal,
  listenTopLeaderboard,
  getLatestAnnouncement,
  isAnnouncementRead,
  markAnnouncementRead,
} from '../lib/api.js';
import ErrorBanner from '../components/ErrorBanner.jsx';
import InstallBanner from '../components/InstallBanner.jsx';
import AnnouncementBanner from '../components/home/AnnouncementBanner.jsx';
import LeaderboardCard from '../components/home/LeaderboardCard.jsx';
import StreakCard from '../components/home/StreakCard.jsx';
import DailyChallengeCard from '../components/home/DailyChallengeCard.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import HomeAssignments from '../components/home/HomeAssignments.jsx';
import useMediaQuery from '../hooks/useMediaQuery.js';

const LEADERBOARD_TOP_N = 5;

export default function Home() {
  const { user, profile } = useAuth();
  const [error, setError] = useState('');
  const [rankInfo, setRankInfo] = useState(null);
  const [topStudents, setTopStudents] = useState([]);
  const [announcement, setAnnouncement] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  // המשימות במסך הבית מוצגות (ונטענות) רק ממסך רחב — בטלפון אין קריאה נוספת
  const wide = useMediaQuery('(min-width: 768px)');

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

  // טלפון: עמודה אחת, בדיוק כמו קודם. טאבלט (md): רשת של 2 עמודות. מחשב (lg): 3 עמודות —
  // שורה עליונה: אתגר היום (2/3) + רצף ו-XP (1/3); למטה: המשימות שלי (2/3) + טבלת המובילים (1/3).
  // empty:hidden — עוטף של רכיב שלא מציג כלום (באנר התקנה/הודעה) לא תופס מקום ברשת.
  return (
    <div className="px-4 pt-6 space-y-5 md:grid md:grid-cols-2 md:items-start md:gap-5 md:space-y-0 lg:grid-cols-3 lg:gap-6">
      <div className="md:col-span-full">
        <h1 className="text-h1 font-bold text-brand-text">שלום {profile.displayName}!</h1>
      </div>

      <div className="md:col-span-full empty:hidden">
        <InstallBanner />
      </div>

      {error && (
        <div className="md:col-span-full">
          <ErrorBanner message={error} onRetry={() => setReloadKey((k) => k + 1)} />
        </div>
      )}

      {/* שורה עליונה: אתגר היום + רצף ו-XP זה לצד זה; הודעת המורה (אם יש) מעליהם */}
      <div className="space-y-5 md:col-span-full md:grid md:grid-cols-2 md:items-stretch md:gap-5 md:space-y-0 lg:grid-cols-3 lg:gap-6">
        <div className="lg:col-span-2">
          <DailyChallengeCard uid={user.uid} />
        </div>

        <div className="md:col-span-full md:order-first empty:hidden">
          <AnnouncementBanner announcement={announcement} onDismiss={dismissAnnouncement} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StreakCard streak={profile.streak} lastActiveDate={profile.lastActiveDate} />
          <StatCard icon={Star} value={profile.totalXp} label="XP" accent="primary" />
        </div>
      </div>

      <div className="hidden md:block lg:col-span-2">
        <HomeAssignments enabled={wide} />
      </div>

      <LeaderboardCard
        topStudents={topStudents}
        myRank={rankInfo?.rank ?? null}
        totalStudents={rankInfo?.total ?? null}
        myUid={user.uid}
      />
    </div>
  );
}
