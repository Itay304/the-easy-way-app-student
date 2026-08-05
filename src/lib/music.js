import { isMusicEnabled } from './settings.js';

// לופ מוזיקת רקע — קובץ MP3 מקומי (public/music/background.mp3, נטען
// כ-'/music/background.mp3'), לא Web Audio סינתטי ולא CDN חיצוני.
// אלמנט <audio> יחיד ב-module scope (singleton), נוצר lazy רק בהפעלה
// הראשונה, בדיוק כמו ה-AudioContext ב-sound.js.
const MUSIC_URL = '/music/background.mp3';
const DEFAULT_VOLUME = 0.2;

let audioEl = null;
let activeVolume = DEFAULT_VOLUME;

function ensureAudio() {
  if (!audioEl) {
    audioEl = new Audio(MUSIC_URL);
    audioEl.loop = true;
    audioEl.preload = 'auto';
    audioEl.volume = activeVolume;
  }
  return audioEl;
}

export function startMusic() {
  if (!isMusicEnabled()) return;
  const audio = ensureAudio();
  audio.volume = activeVolume;
  audio.play().catch(() => {
    // מדיניות autoplay של הדפדפן חסמה השמעה (למשל לפני אינטראקציית משתמש
    // ראשונה בעמוד) — מתעלמים בשקט, בדיוק כמו ב-sound.js.
  });
}

export function stopMusic() {
  if (audioEl) audioEl.pause();
}

export function setMusicVolume(volume) {
  activeVolume = volume;
  if (audioEl) audioEl.volume = volume;
}
