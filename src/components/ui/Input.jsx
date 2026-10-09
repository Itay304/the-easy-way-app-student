export default function Input({ label, error, disabled = false, id, name, className = '', ...rest }) {
  const inputId = id || name;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-caption font-semibold text-brand-grey-text mb-1">
          {label}
        </label>
      )}
      <input
        id={inputId}
        name={name}
        disabled={disabled}
        className={`w-full rounded-xl border px-4 py-3 text-body outline-none transition disabled:opacity-60 disabled:bg-brand-grey-light ${
          error
            ? 'border-brand-error-border focus:ring-2 focus:ring-brand-error'
            : 'border-black/10 focus:ring-2 focus:ring-brand-turquoise'
        } ${className}`}
        {...rest}
      />
      {error && <p className="text-caption text-brand-error mt-1">{error}</p>}
    </div>
  );
}
