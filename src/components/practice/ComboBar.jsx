export default function ComboBar({ combo, justBroke }) {
  if (combo < 2 && !justBroke) return null;

  if (justBroke) {
    return <p className="text-center text-body-sm font-bold text-brand-error animate-shake lg:text-body-lg">הרצף נשבר 💔</p>;
  }

  return (
    <p key={combo} className="text-center text-body-sm font-bold text-amber-500 animate-badge-pop lg:text-body-lg">
      🔥 {combo} ברצף!
    </p>
  );
}
