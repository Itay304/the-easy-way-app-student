export default function InstallRequired() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 py-12 text-center">
      <img src="/icons/icon-192.png" alt="EasyLex" className="h-16 w-16 rounded-2xl shadow-md mb-6" />
      <h1 className="text-2xl font-bold text-brand-text mb-8">התקן את האפליקציה לחוויה מלאה</h1>

      <div className="w-full max-w-sm space-y-4 text-right">
        <div className="rounded-2xl bg-white shadow-sm border border-black/5 p-5">
          <p className="font-bold text-brand-text mb-1">🤖 אנדרואיד (Chrome)</p>
          <p className="text-brand-grey-text">לחץ על ⋮ ← הוסף למסך הבית</p>
        </div>
        <div className="rounded-2xl bg-white shadow-sm border border-black/5 p-5">
          <p className="font-bold text-brand-text mb-1">🍎 אייפון (Safari)</p>
          <p className="text-brand-grey-text">לחץ על □↑ ← הוסף למסך הבית</p>
        </div>
      </div>
    </div>
  );
}
