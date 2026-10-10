import { useEffect } from 'react';
import Confetti from './Confetti.jsx';
import { playVictorySound } from '../../lib/sound.js';

const AUTO_DISMISS_MS = 3500;

export default function BadgeUnlockToast({ badge, onDismiss }) {
  useEffect(() => {
    if (!badge) return undefined;
    playVictorySound();
    const t = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [badge, onDismiss]);

  if (!badge) return null;

  const Icon = badge.icon;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 px-6" onClick={onDismiss}>
      <Confetti count={90} durationMs={1800} />
      <div className="rounded-2xl bg-gradient-to-b from-white to-gray-50 shadow-xl p-8 flex flex-col items-center text-center gap-2 animate-badge-pop">
        <div className={`h-20 w-20 rounded-full flex items-center justify-center ${badge.accent}`}>
          <Icon size={48} />
        </div>
        <p className="text-body-sm font-semibold text-brand-turquoise">תג חדש נפתח!</p>
        <p className="text-h2 font-bold text-brand-text">{badge.title}</p>
        <p className="text-body-sm text-brand-grey-text">{badge.description}</p>
      </div>
    </div>
  );
}
