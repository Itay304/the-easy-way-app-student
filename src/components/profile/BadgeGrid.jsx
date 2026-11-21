import { HelpCircle } from 'lucide-react';
import { BADGE_DEFINITIONS } from '../../lib/badges.js';
import Card from '../ui/Card.jsx';

export default function BadgeGrid({ earnedIds }) {
  return (
    <Card padding="p-5">
      <h2 className="text-body-lg font-bold text-brand-text mb-4">תגים</h2>
      <div className="grid grid-cols-3 gap-3">
        {BADGE_DEFINITIONS.map((badge, i) => {
          const earned = earnedIds.has(badge.id);
          const hidden = badge.secret && !earned;
          const Icon = hidden ? HelpCircle : badge.icon;
          // הסבר במעבר עכבר / פוקוס (גם הקשה בטלפון): לתג נעול — איך משיגים אותו
          const tip = earned
            ? badge.description
            : hidden
              ? 'תג סודי — ממשיכים לתרגל כדי לגלות'
              : `איך משיגים: ${badge.description}`;
          const tipId = `badge-tip-${badge.id}`;
          return (
            <div
              key={badge.id}
              tabIndex={0}
              aria-describedby={tipId}
              className="group relative flex flex-col items-center text-center gap-1.5 rounded-xl p-3 outline-none focus-visible:ring-2 focus-visible:ring-brand-turquoise animate-badge-pop"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <div
                className={`h-11 w-11 rounded-full flex items-center justify-center shrink-0 lg:h-16 lg:w-16 ${
                  hidden || !earned ? 'bg-brand-grey-light text-brand-grey-text' : badge.accent
                }`}
              >
                <Icon className="h-6 w-6 lg:h-8 lg:w-8" />
              </div>
              <span
                className={`text-caption font-semibold leading-tight lg:text-body-sm ${
                  earned ? 'text-brand-text' : 'text-brand-grey-text'
                }`}
              >
                {hidden ? 'תג סודי' : badge.title}
                {!earned && <span className="sr-only"> (נעול)</span>}
              </span>
              <span
                id={tipId}
                role="tooltip"
                className="pointer-events-none absolute inset-x-0 bottom-full z-20 mb-1 rounded-lg bg-brand-text px-2.5 py-1.5 text-caption font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus:opacity-100"
              >
                {tip}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
