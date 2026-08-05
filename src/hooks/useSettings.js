import { useEffect, useState } from 'react';
import {
  isSoundEnabled,
  isAnimationsEnabled,
  isMusicEnabled,
  isWhoAmITypingMode,
  setSoundEnabled,
  setAnimationsEnabled,
  setMusicEnabled,
  setWhoAmITypingMode,
  SETTINGS_EVENT,
} from '../lib/settings.js';

export default function useSettings() {
  const [soundEnabled, setSound] = useState(isSoundEnabled());
  const [animationsEnabled, setAnimations] = useState(isAnimationsEnabled());
  const [musicEnabled, setMusic] = useState(isMusicEnabled());
  const [whoAmITypingMode, setWhoAmITyping] = useState(isWhoAmITypingMode());

  useEffect(() => {
    function sync() {
      setSound(isSoundEnabled());
      setAnimations(isAnimationsEnabled());
      setMusic(isMusicEnabled());
      setWhoAmITyping(isWhoAmITypingMode());
    }
    window.addEventListener(SETTINGS_EVENT, sync);
    return () => window.removeEventListener(SETTINGS_EVENT, sync);
  }, []);

  return {
    soundEnabled,
    animationsEnabled,
    musicEnabled,
    whoAmITypingMode,
    toggleSound: () => setSoundEnabled(!soundEnabled),
    toggleAnimations: () => setAnimationsEnabled(!animationsEnabled),
    toggleMusic: () => setMusicEnabled(!musicEnabled),
    toggleWhoAmITypingMode: () => setWhoAmITypingMode(!whoAmITypingMode),
  };
}
