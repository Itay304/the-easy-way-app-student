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
          return (
            <div
              key={badge.id}
              title={hidden ? 'תג סודי' : badge.description}
              className={`flex flex-col items-center text-center gap-1.5 rounded-xl p-3 animate-badge-pop ${
                earned ? '' : 'opacity-40 grayscale'
              }`}
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <div
                className={`h-11 w-11 rounded-full flex items-center justify-center shrink-0 ${
                  hidden ? 'bg-brand-grey-light text-brand-grey-text' : badge.accent
                }`}
              >
                <Icon size={24} />
              </div>
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
