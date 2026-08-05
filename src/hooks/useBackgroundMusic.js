import { useEffect } from 'react';
import { startMusic, stopMusic } from '../lib/music.js';
import { isMusicEnabled, SETTINGS_EVENT } from '../lib/settings.js';

/** מוזיקת רקע פועלת רק כל עוד הקומפוננטה שקוראת ל-hook הזה (מסך תרגול)
 * מורכבת — כלומר "בזמן תרגול, לא בניווט". מגיבה גם לשינוי הגדרה חי. */
export default function useBackgroundMusic() {
  useEffect(() => {
    function sync() {
      if (isMusicEnabled()) startMusic();
      else stopMusic();
    }
    sync();
    window.addEventListener(SETTINGS_EVENT, sync);
    return () => {
      window.removeEventListener(SETTINGS_EVENT, sync);
      stopMusic();
    };
  }, []);
}
