import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { TABS } from '../lib/tabs.js';

// ניווט צד במחשב (1024px ומעלה) — מחליף את BottomNav. בצד ימין (RTL): לוגו, ארבעת הטאבים
// (אותם TABS בדיוק), ובתחתית שם התלמיד. מתחת ל-1024px מוסתר; שם מוצג BottomNav כמו תמיד.
export default function SideNav() {
  const { profile } = useAuth();
  const name = profile?.displayName || '';

  return (
    <aside className="hidden lg:flex fixed inset-y-0 right-0 z-40 w-64 flex-col bg-white border-l border-black/5 shadow-[-2px_0_12px_rgba(0,0,0,0.04)]">
      <div className="px-6 pt-8 pb-6">
        <img src="/logo.svg" alt="Easylex" className="h-14 w-auto" />
      </div>

      <nav aria-label="ניווט ראשי" className="flex-1 px-3 space-y-1">
        {TABS.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            end={tab.end}
            replace
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-4 py-3 text-body-lg font-semibold transition ${
                isActive
                  ? 'bg-brand-turquoise/10 text-turquoise-800'
                  : 'text-brand-grey-text hover:bg-brand-grey-light hover:text-brand-text'
              }`
            }
          >
            <tab.icon size={22} strokeWidth={2} aria-hidden="true" />
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <NavLink
        to="/profile"
        replace
        className="m-3 flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-brand-grey-light transition"
      >
        <span
          aria-hidden="true"
          className="h-10 w-10 shrink-0 rounded-full bg-brand-turquoise text-white flex items-center justify-center font-bold text-body-lg"
        >
          {(name || '?')[0]}
        </span>
        <span className="min-w-0">
          <span className="block font-semibold text-brand-text truncate">{name}</span>
          <span className="block text-caption text-brand-grey-text">הפרופיל שלי</span>
        </span>
      </NavLink>
    </aside>
  );
}
