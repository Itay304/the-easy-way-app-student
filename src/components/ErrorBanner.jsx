export default function ErrorBanner({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="rounded-xl bg-brand-error-light border border-brand-error-border text-brand-error-dark px-4 py-3 flex items-center justify-between gap-3">
      <span className="text-body-sm">{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="text-body-sm font-semibold underline shrink-0">
          נסה שוב
        </button>
      )}
    </div>
  );
}
