export default function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
      {Icon && (
        <div className="h-14 w-14 rounded-full bg-brand-turquoise/10 text-brand-turquoise flex items-center justify-center mb-4">
          <Icon size={26} strokeWidth={2} />
        </div>
      )}
      <p className="font-semibold text-brand-text">{title}</p>
      {subtitle && <p className="text-sm text-brand-grey-text mt-1">{subtitle}</p>}
    </div>
  );
}
