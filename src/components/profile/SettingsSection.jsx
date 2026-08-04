import { Volume2, VolumeX, Sparkles } from 'lucide-react';
import useSettings from '../../hooks/useSettings.js';

function ToggleRow({ icon: Icon, label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="flex items-center gap-2 text-brand-text font-medium">
        <Icon size={18} className="text-brand-grey-text" />
        {label}
      </span>
      <button
        type="button"
        onClick={onChange}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={`w-12 h-7 rounded-full relative transition-colors ${checked ? 'bg-brand-turquoise' : 'bg-brand-grey-light'}`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
            checked ? 'left-1' : 'right-1'
          }`}
        />
      </button>
    </div>
  );
}

export default function SettingsSection() {
  const { soundEnabled, animationsEnabled, toggleSound, toggleAnimations } = useSettings();

  return (
    <div className="rounded-2xl bg-white shadow-md p-5 divide-y divide-black/5">
      <h2 className="text-lg font-bold text-brand-text mb-1">הגדרות</h2>
      <ToggleRow icon={soundEnabled ? Volume2 : VolumeX} label="צלילים" checked={soundEnabled} onChange={toggleSound} />
      <ToggleRow icon={Sparkles} label="אנימציות" checked={animationsEnabled} onChange={toggleAnimations} />
    </div>
  );
}
