const SOUND_KEY = 'easylex_sound_enabled';
const ANIMATIONS_KEY = 'easylex_animations_enabled';
const MUSIC_KEY = 'easylex_music_enabled';
const WHOAMI_TYPING_KEY = 'easylex_whoami_typing_mode';
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

// מוזיקת רקע — ברירת מחדל כבויה (בשונה מצלילים/אנימציות): נגינת שמע
// רציפה היא פולשנית יותר מצליל קצר בודד, ראוי הצטרפות מפורשת (opt-in).
export function isMusicEnabled() {
  return localStorage.getItem(MUSIC_KEY) === '1';
}

export function setMusicEnabled(enabled) {
  localStorage.setItem(MUSIC_KEY, enabled ? '1' : '0');
  window.dispatchEvent(new Event(SETTINGS_EVENT));
}

// מצב הקלדה במודול "מי אני?" — ברירת מחדל: בחירה מתוך 4 אפשרויות
// (מהיר וידידותי יותר כברירת מחדל; הקלדה היא אפשרות מתקדמת).
export function isWhoAmITypingMode() {
  return localStorage.getItem(WHOAMI_TYPING_KEY) === '1';
}

export function setWhoAmITypingMode(enabled) {
  localStorage.setItem(WHOAMI_TYPING_KEY, enabled ? '1' : '0');
  window.dispatchEvent(new Event(SETTINGS_EVENT));
}
