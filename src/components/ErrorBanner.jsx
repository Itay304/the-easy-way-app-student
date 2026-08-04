export default function ErrorBanner({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 flex items-center justify-between gap-3">
      <span className="text-sm">{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="text-sm font-semibold underline shrink-0">
          נסה שוב
        </button>
      )}
    </div>
  );
}
