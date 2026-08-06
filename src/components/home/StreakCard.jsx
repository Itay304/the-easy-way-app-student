import { Flame, Droplet } from 'lucide-react';
import { toDateKey } from '../../lib/dateUtils.js';

function computeStreakStatus(streak, lastActiveDate) {
  if (!lastActiveDate) return { status: 'none', displayStreak: 0 };

  const todayKey = toDateKey(Date.now());
  const diffDays = Math.round(
    (new Date(todayKey) - new Date(lastActiveDate)) / (24 * 60 * 60 * 1000),
  );
  if (diffDays <= 0) return { status: 'active', displayStreak: streak };
  if (diffDays === 1) return { status: 'at-risk', displayStreak: streak };
  return { status: 'broken', displayStreak: 0 };
}

const STATUS_CONFIG = {
  active: { icon: Flame, iconClass: 'text-amber-500 bg-amber-50', message: 'ימים ברצף 🔥' },
  'at-risk': { icon: Droplet, iconClass: 'text-blue-400 bg-blue-50', message: 'הרצף בסכנה! תרגל היום' },
  broken: { icon: Flame, iconClass: 'text-brand-grey-text bg-brand-grey-light', message: 'הרצף נשבר 😢 התחל מחדש' },
  none: { icon: Flame, iconClass: 'text-brand-grey-text bg-brand-grey-light', message: 'התחל את הרצף שלך!' },
};

export default function StreakCard({ streak, lastActiveDate }) {
  const { status, displayStreak } = computeStreakStatus(streak, lastActiveDate);
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <div className="rounded-2xl bg-gradient-to-b from-white to-gray-50 shadow-lg p-4 flex items-center gap-3">
      <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${config.iconClass}`}>
        <Icon size={22} strokeWidth={2.25} />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold text-brand-text leading-none">{displayStreak}</p>
        <p className="text-xs text-brand-grey-text mt-1 truncate">{config.message}</p>
      </div>
    </div>
  );
}
