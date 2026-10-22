import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import Card from '../ui/Card.jsx';

// משימה בסטטיסטיקה: עיגול של מילים ידועות מתוך כל מילות המשימה — במרכז מספר המילים הידועות,
// לא אחוז. progress מ-stageProgress (lib/stages.js).
export default function AssignmentDonut({ title, progress }) {
  const { knownWords, totalWords, current, perStage, complete } = progress;
  const data = [
    { name: 'known', value: knownWords },
    { name: 'remaining', value: Math.max(totalWords - knownWords, 0) },
  ];

  return (
    <Card padding="p-4" className="flex items-center gap-4">
      <div className="h-20 w-20 shrink-0 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={26} outerRadius={38} startAngle={90} endAngle={-270} stroke="none">
              <Cell fill="#14b8a6" />
              <Cell fill="#e5e7eb" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <span className="absolute inset-0 flex items-center justify-center text-body-sm font-bold text-brand-text">
          {knownWords}
        </span>
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-brand-text truncate">{title}</p>
        <p className="text-body-sm text-brand-grey-text mt-0.5">
          {knownWords} מילים ידועות מתוך {totalWords}
        </p>
        <p className="text-caption text-brand-grey-text">
          {complete ? 'כל המילים ידועות! 🎉' : `שלב ${current + 1} מתוך ${perStage.length}`}
        </p>
      </div>
    </Card>
  );
}
