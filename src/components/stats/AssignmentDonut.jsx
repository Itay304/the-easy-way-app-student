import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import Card from '../ui/Card.jsx';

export default function AssignmentDonut({ title, mastered, total }) {
  const pct = total > 0 ? Math.round((mastered / total) * 100) : 0;
  const data = [
    { name: 'mastered', value: mastered },
    { name: 'remaining', value: Math.max(total - mastered, 0) },
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
        <span className="absolute inset-0 flex items-center justify-center text-caption font-bold text-brand-text">
          {pct}%
        </span>
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-brand-text truncate">{title}</p>
        <p className="text-body-sm text-brand-grey-text mt-0.5">
          {mastered} מתוך {total} מילים נכבשו
        </p>
      </div>
    </Card>
  );
}
