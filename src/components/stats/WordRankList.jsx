export default function WordRankList({ title, icon: Icon, iconClass, items, valueLabel }) {
  return (
    <div className="rounded-2xl bg-gradient-to-b from-white to-gray-50 shadow-lg p-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-brand-text mb-3">
        <Icon size={20} className={iconClass} />
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-brand-grey-text py-2">אין עדיין מספיק נתונים</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={item.englishWord} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 min-w-0">
                <span className="text-brand-grey-text w-5 shrink-0">{i + 1}.</span>
                <span className="font-semibold text-brand-text truncate" dir="ltr">
                  {item.englishWord}
                </span>
              </span>
              <span className="text-brand-grey-text shrink-0">{valueLabel(item)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
