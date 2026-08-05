import { isMusicEnabled } from './settings.js';

// לופ מוזיקת רקע — קובץ MP3 חיצוני (Pixabay, CC0, ללא צורך בקרדיט),
// לא Web Audio סינתטי. אלמנט <audio> יחיד ב-module scope (singleton),
// נוצר lazy רק בהפעלה הראשונה, בדיוק כמו ה-AudioContext ב-sound.js.
const MUSIC_URL = 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3';
const DEFAULT_VOLUME = 0.3;

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
