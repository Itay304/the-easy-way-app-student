export default function LoadingSpinner({ label = 'טוען...' }) {
  return (
    <div className="flex items-center justify-center py-16 text-brand-grey-text gap-3">
      <span className="h-5 w-5 rounded-full border-2 border-brand-turquoise border-t-transparent animate-spin" />
      <span>{label}</span>
    </div>
  );
}
