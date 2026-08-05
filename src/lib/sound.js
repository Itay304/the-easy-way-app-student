import { isSoundEnabled } from './settings.js';

let audioCtx = null;

export function getAudioContext() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audioCtx = new Ctx();
  }
  return audioCtx;
}

function tone(frequency, durationSec, { gain = 0.15, type = 'sine', delaySec = 0 } = {}) {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    const startTime = ctx.currentTime + delaySec;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gainNode.gain.setValueAtTime(gain, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSec);
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + durationSec);
  } catch {
    // Web Audio לא זמין/חסום (למשל לפני אינטראקציית משתמש ראשונה) — מתעלמים בשקט
  }
}

export function playSuccessSound() {
  tone(523.25, 0.15); // C5
}

export function playErrorSound() {
  tone(196, 0.2, { gain: 0.1 }); // G3, עדין יותר מהצליל החיובי
}

/** צליל קומבו — מתנגן כל 5 תשובות נכונות ברצף. ארפג'ו עולה C5→E5→G5,
 * וכל "מדרגה" (tier=combo/5) מתחיל מעט גבוה יותר, כך שהקומבו מרגיש
 * הולך ומתעצם ככל שהרצף גדל. */
export function playComboSound(tier = 1) {
  const shift = 2 ** (((tier - 1) % 4) / 6); // עלייה עדינה בגובה בכל 4 מדרגות
  const notes = [523.25, 659.25, 783.99];
  notes.forEach((freq, i) => tone(freq * shift, 0.12, { gain: 0.12, delaySec: i * 0.08 }));
}

/** צליל תג סודי — פנפייר קצר ונדיר, שונה מכל שאר הצלילים באפליקציה. */
export function playSecretBadgeSound() {
  const notes = [783.99, 987.77, 1318.51]; // G5, B5, E6
  notes.forEach((freq, i) => tone(freq, 0.35, { gain: 0.14, delaySec: i * 0.12, type: 'triangle' }));
}
