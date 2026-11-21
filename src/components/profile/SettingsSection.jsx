import { Volume2, VolumeX, Sparkles, Music, Keyboard } from 'lucide-react';
import useSettings from '../../hooks/useSettings.js';
import Card from '../ui/Card.jsx';

function ToggleRow({ icon: Icon, label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="flex items-center gap-2 text-brand-text font-medium">
        <Icon size={16} className="text-brand-grey-text" />
        {label}
      </span>
      <button
        type="button"
        onClick={onChange}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        // כבוי: מסגרת וידית אפורות כהות (ניגודיות 5:1 מול הלבן) — כדי שהמתג ייראה גם כשהוא כבוי
        className={`w-12 h-7 shrink-0 rounded-full relative border-2 transition-colors ${
          checked ? 'bg-brand-turquoise border-brand-turquoise' : 'bg-white border-brand-grey-text'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full shadow transition-all ${
            checked ? 'left-0.5 bg-white' : 'right-0.5 bg-brand-grey-text'
          }`}
        />
      </button>
    </div>
  );
}

// children — פעולה בתחתית הכרטיס (בפרופיל: כפתור ההתנתקות)
export default function SettingsSection({ children }) {
  const {
    soundEnabled,
    animationsEnabled,
    musicEnabled,
    whoAmITypingMode,
    toggleSound,
    toggleAnimations,
    toggleMusic,
    toggleWhoAmITypingMode,
  } = useSettings();

  return (
    <Card padding="p-5" className="divide-y divide-black/5">
      <h2 className="text-body-lg font-bold text-brand-text mb-1">הגדרות</h2>
      <ToggleRow icon={soundEnabled ? Volume2 : VolumeX} label="צלילים" checked={soundEnabled} onChange={toggleSound} />
      <ToggleRow icon={Sparkles} label="אנימציות" checked={animationsEnabled} onChange={toggleAnimations} />
      <ToggleRow icon={Music} label="מוזיקת רקע בתרגול" checked={musicEnabled} onChange={toggleMusic} />
      <ToggleRow
        icon={Keyboard}
        label='הקלדה במקום בחירה ב"מי אני?"'
        checked={whoAmITypingMode}
        onChange={toggleWhoAmITypingMode}
      />
      {children && <div className="pt-4">{children}</div>}
    </Card>
  );
}
