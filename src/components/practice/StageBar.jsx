// פס התקדמות מחולק לשלבים (במקום אחוז). כל קטע = שלב, ובתוכו שתי שכבות:
//   גוון בהיר — מילים שנלמדו (נראו לפחות פעם אחת); צבע מלא — מילים ידועות.
// כך הפס זז כבר מהסבב הראשון, עוד לפני שמילה כלשהי הפכה לידועה.
export default function StageBar({ progress, className = '' }) {
  const { perStage, current } = progress;
  return (
    <div
      role="img"
      aria-label={`שלב ${current + 1} מתוך ${perStage.length}`}
      className={`flex gap-1 ${className}`}
      dir="rtl"
    >
      {perStage.map((s, i) => (
        <div key={i} className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-black/10">
          <div className="absolute inset-y-0 right-0 rounded-full bg-brand-turquoise/40" style={{ width: `${(s.seen / s.total) * 100}%` }} />
          <div className="absolute inset-y-0 right-0 rounded-full bg-brand-turquoise" style={{ width: `${(s.known / s.total) * 100}%` }} />
        </div>
      ))}
    </div>
  );
}
