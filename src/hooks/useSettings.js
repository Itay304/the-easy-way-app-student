import { useEffect, useState } from 'react';
import {
  isSoundEnabled,
  isAnimationsEnabled,
  setSoundEnabled,
  setAnimationsEnabled,
  SETTINGS_EVENT,
} from '../lib/settings.js';

export default function useSettings() {
  const [soundEnabled, setSound] = useState(isSoundEnabled());
  const [animationsEnabled, setAnimations] = useState(isAnimationsEnabled());

  useEffect(() => {
    function sync() {
      setSound(isSoundEnabled());
      setAnimations(isAnimationsEnabled());
    }
    window.addEventListener(SETTINGS_EVENT, sync);
    return () => window.removeEventListener(SETTINGS_EVENT, sync);
  }, []);

  return {
    soundEnabled,
    animationsEnabled,
    toggleSound: () => setSoundEnabled(!soundEnabled),
    toggleAnimations: () => setAnimationsEnabled(!animationsEnabled),
  };
}
