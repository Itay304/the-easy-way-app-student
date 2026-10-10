import { useEffect, useState } from 'react';
import { Smartphone, Share, X } from 'lucide-react';
import useInstallGate from '../hooks/useInstallGate.js';
import { dismissInstallBanner, isInstallBannerDismissed } from '../lib/installBanner.js';
import { hasInstallPrompt, onInstallPromptReady, triggerInstallPrompt } from '../lib/installPrompt.js';
import Button from './ui/Button.jsx';

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

export default function InstallBanner() {
  const { isMobile, isStandalone } = useInstallGate();
  const [dismissed, setDismissed] = useState(isInstallBannerDismissed);
  const [promptReady, setPromptReady] = useState(hasInstallPrompt);

  useEffect(() => onInstallPromptReady(() => setPromptReady(true)), []);

  if (!isMobile || isStandalone || dismissed) return null;

  function close() {
    dismissInstallBanner();
    setDismissed(true);
  }

  async function install() {
    await triggerInstallPrompt();
    setPromptReady(hasInstallPrompt());
  }

  return (
    <div className="w-full rounded-2xl bg-brand-turquoise/10 border border-brand-turquoise/20 p-4 flex items-start gap-3">
      <Smartphone size={20} className="text-brand-turquoise shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0 space-y-2">
        <p className="text-brand-text">התקן את EasyLex כדי לשמור על הרצף ולקבל תזכורות</p>
        {isIOS ? (
          <p className="text-caption text-brand-grey-text flex items-center gap-1.5">
            <Share size={14} className="shrink-0" />
            לחץ על שיתוף ← הוסף למסך הבית
          </p>
        ) : promptReady ? (
          <Button size="sm" onClick={install}>
            התקן
          </Button>
        ) : (
          <p className="text-caption text-brand-grey-text">לחץ על ⋮ ← הוסף למסך הבית</p>
        )}
      </div>
      <button onClick={close} className="text-brand-grey-text hover:text-brand-text shrink-0">
        <X size={16} />
      </button>
    </div>
  );
}
