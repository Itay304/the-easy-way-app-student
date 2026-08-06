import { NavLink } from 'react-router-dom';
import { TABS } from '../lib/tabs.js';

export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 bg-white/80 backdrop-blur-lg border-t border-black/5 shadow-[0_-2px_8px_rgba(0,0,0,0.06)] grid grid-cols-4 pb-[env(safe-area-inset-bottom)]">
      {TABS.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          end
          replace
          aria-label={tab.label}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 py-3 transition ${
              isActive ? 'text-brand-turquoise' : 'text-brand-grey-text'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <tab.icon size={24} strokeWidth={2.25} />
              {isActive && <span className="text-[11px] font-medium">{tab.label}</span>}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
