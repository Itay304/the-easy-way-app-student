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
          return (
            <div
              key={badge.id}
              title={hidden ? 'תג סודי' : badge.description}
              className={`flex flex-col items-center text-center gap-1 rounded-xl p-3 animate-badge-pop ${
                earned ? 'bg-amber-50' : 'bg-brand-grey-light opacity-40 grayscale'
              }`}
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <span className="text-display">{hidden ? '❓' : badge.icon}</span>
              <span className="text-caption font-semibold text-brand-text leading-tight">
                {hidden ? 'תג סודי' : badge.title}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
