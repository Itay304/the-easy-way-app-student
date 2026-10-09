import Card from './Card.jsx';

const ACCENT_CLASSES = {
  primary: 'bg-brand-turquoise/10 text-brand-turquoise',
  success: 'bg-brand-green/10 text-brand-green',
};

// iconClassName is an escape hatch for states that don't fit primary/success
// (e.g. StreakCard's amber/blue/grey states) without forcing an unrequested
// third accent value — see audit/REPORT.md Stage 3 report.
export default function StatCard({ icon: Icon, value, label, accent = 'primary', iconClassName, className = '' }) {
  return (
    <Card className={`flex items-center gap-3 ${className}`}>
      <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${iconClassName || ACCENT_CLASSES[accent]}`}>
        <Icon size={20} strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="text-h2 font-bold text-brand-text leading-none">{value}</p>
        <p className="text-caption text-brand-grey-text mt-1 truncate">{label}</p>
      </div>
    </Card>
  );
}
