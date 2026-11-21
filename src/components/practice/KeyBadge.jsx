// מספר המקש של התשובה (1–4) על כפתור — רק במחשב (1024px ומעלה), שם התרגול עובד גם מהמקלדת.
// aria-hidden: קורא מסך מקריא את התשובה עצמה, לא את המספר.
export default function KeyBadge({ n }) {
  return (
    <span
      aria-hidden="true"
      className="hidden lg:inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-md border border-black/10 bg-white/70 px-1.5 text-caption font-bold text-brand-grey-text"
    >
      {n}
    </span>
  );
}
