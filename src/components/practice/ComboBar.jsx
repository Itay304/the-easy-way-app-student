export default function ComboBar({ combo, justBroke }) {
  if (combo < 2 && !justBroke) return null;

  if (justBroke) {
    return <p className="text-center text-sm font-bold text-red-500 animate-shake">הרצף נשבר 💔</p>;
  }

  return (
    <p key={combo} className="text-center text-sm font-bold text-amber-500 animate-badge-pop">
      🔥 {combo} ברצף!
    </p>
  );
}
