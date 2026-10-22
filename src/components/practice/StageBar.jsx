// פס התקדמות מחולק לשלבים (במקום אחוז). כל קטע = שלב:
//   כהה — כל מילות השלב ידועות; טורקיז — כל המילים נראו; חלקי — השלב הנוכחי (כמה מילים נראו); אפור — טרם נפתח.
export default function StageBar({ progress, className = '' }) {
  const { perStage, current } = progress;
  return (
    <div
      role="img"
      aria-label={`שלב ${current + 1} מתוך ${perStage.length}`}
      className={`flex gap-1 ${className}`}
      dir="rtl"
    >
      {perStage.map((s, i) => {
        const done = s.known === s.total;
        const seenAll = s.seen === s.total;
        const fill = done || seenAll ? 100 : i === current ? Math.round((s.seen / s.total) * 100) : 0;
        return (
          <div key={i} className="h-2.5 flex-1 overflow-hidden rounded-full bg-black/10">
            <div
              className={`h-full rounded-full ${done ? 'bg-brand-turquoise-dark' : 'bg-brand-turquoise'}`}
              style={{ width: `${fill}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}
