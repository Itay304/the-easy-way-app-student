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

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 px-6" onClick={onDismiss}>
      <Confetti count={90} durationMs={1800} />
      <div className="rounded-2xl bg-gradient-to-b from-white to-gray-50 shadow-xl p-8 flex flex-col items-center text-center gap-2 animate-badge-pop">
        <span className="text-6xl">{badge.icon}</span>
        <p className="text-sm font-semibold text-brand-turquoise">תג חדש נפתח!</p>
        <p className="text-xl font-bold text-brand-text">{badge.title}</p>
        <p className="text-sm text-brand-grey-text">{badge.description}</p>
      </div>
    </div>
  );
}
