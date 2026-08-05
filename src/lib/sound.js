import { isSoundEnabled } from './settings.js';

// אפקטי קול — קבצי MP3 מקצועיים (public/sounds/), לא Web Audio סינתטי.
// כל צליל: אלמנט <audio> יחיד ב-module scope (cache), עם currentTime=0
// לפני כל play() כדי לתמוך בהפעלות חוזרות ומהירות (רצף תשובות מהיר).
const SOUND_FILES = {
  correct: '/sounds/correct.mp3',
  wrong: '/sounds/wrong.mp3',
  combo: '/sounds/combo.mp3',
  victory: '/sounds/victory.mp3',
};

const audioCache = {};

function getAudio(name) {
  if (!audioCache[name]) {
    audioCache[name] = new Audio(SOUND_FILES[name]);
  }
  return audioCache[name];
}

function play(name, { playbackRate = 1 } = {}) {
  if (!isSoundEnabled()) return;
  try {
    const audio = getAudio(name);
    audio.currentTime = 0;
    audio.playbackRate = playbackRate;
    audio.play().catch(() => {
      // מדיניות autoplay של הדפדפן חסמה השמעה (למשל לפני אינטראקציית משתמש
      // ראשונה בעמוד) — מתעלמים בשקט, בדיוק כמו ב-music.js.
    });
  } catch {
    // ר' הערה למעלה
  }
}

export function playSuccessSound() {
  play('correct');
}

export function playErrorSound() {
  play('wrong');
}

/** צליל קומבו — מתנגן כל 5 תשובות נכונות ברצף. playbackRate עולה מעט
 * בכל מדרגה (tier=combo/5) כדי שהקומבו ירגיש הולך ומתעצם. */
export function playComboSound(tier = 1) {
  const rate = 1 + ((tier - 1) % 4) * 0.08;
  play('combo', { playbackRate: rate });
}

/** צליל ניצחון — הישג נדיר/מיוחד (למשל פתיחת תג סודי). */
export function playVictorySound() {
  play('victory');
}
