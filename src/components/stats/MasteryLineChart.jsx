import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function MasteryLineChart({ data }) {
  return (
    <div className="rounded-2xl bg-white shadow-md p-4">
      <h2 className="text-lg font-bold text-brand-text mb-3">מילים שנכבשו לאורך זמן</h2>
      <div className="h-48" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#9ca3af" />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#9ca3af" />
            <Tooltip />
            <Line type="monotone" dataKey="mastered" stroke="#14b8a6" strokeWidth={3} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
