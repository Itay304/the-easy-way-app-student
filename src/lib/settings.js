const SOUND_KEY = 'easylex_sound_enabled';
const ANIMATIONS_KEY = 'easylex_animations_enabled';
export const SETTINGS_EVENT = 'easylex:settings-changed';

export function isSoundEnabled() {
  return localStorage.getItem(SOUND_KEY) !== '0';
}

export function setSoundEnabled(enabled) {
  localStorage.setItem(SOUND_KEY, enabled ? '1' : '0');
  window.dispatchEvent(new Event(SETTINGS_EVENT));
}

export function isAnimationsEnabled() {
  return localStorage.getItem(ANIMATIONS_KEY) !== '0';
}

export function setAnimationsEnabled(enabled) {
  localStorage.setItem(ANIMATIONS_KEY, enabled ? '1' : '0');
  window.dispatchEvent(new Event(SETTINGS_EVENT));
}
