const VARIANT_CLASSES = {
  primary: 'bg-gradient-to-r from-turquoise-400 to-turquoise-600 text-white hover:opacity-90',
  secondary: 'bg-white border border-black/10 text-brand-text hover:bg-black/5',
  ghost: 'bg-transparent text-brand-turquoise hover:bg-brand-turquoise/10',
  danger: 'bg-brand-error-light text-brand-error hover:bg-brand-error-border',
};

const SIZE_CLASSES = {
  sm: 'px-3 text-body',
  md: 'px-4 py-3 text-body-lg',
  lg: 'w-full py-4 text-body-lg',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  type = 'button',
  onClick,
  className = '',
  children,
  ...rest
}) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={isDisabled ? undefined : onClick}
      className={`inline-flex items-center justify-center gap-2 min-h-11 rounded-xl font-bold transition disabled:opacity-60 disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...rest}
    >
      {loading && <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />}
      {children}
    </button>
  );
}
