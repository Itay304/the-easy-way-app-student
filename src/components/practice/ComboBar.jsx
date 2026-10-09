export default function ComboBar({ combo, justBroke }) {
  if (combo < 2 && !justBroke) return null;

  if (justBroke) {
    return <p className="text-center text-body-sm font-bold text-brand-error animate-shake">הרצף נשבר 💔</p>;
  }

  return (
    <p key={combo} className="text-center text-body-sm font-bold text-amber-500 animate-badge-pop">
      🔥 {combo} ברצף!
    </p>
  );
}
