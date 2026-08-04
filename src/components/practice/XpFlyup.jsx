export default function XpFlyup({ amount, flyKey }) {
  if (!amount) return null;

  return (
    <div
      key={flyKey}
      className="pointer-events-none fixed left-1/2 top-1/3 -translate-x-1/2 z-[110] text-2xl font-extrabold text-brand-turquoise animate-xp-flyup"
      aria-hidden="true"
    >
      +{amount} XP
    </div>
  );
}
