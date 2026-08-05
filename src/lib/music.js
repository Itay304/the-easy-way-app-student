import { getAudioContext } from './sound.js';
import { isMusicEnabled } from './settings.js';

// לופ אמביינט/lo-fi דל — נגן פנטטוני עדין עם attack/release איטיים,
// בלי קבצי שמע חיצוניים, רק Web Audio API (Oscillator + Gain per note).
const SCALE_HZ = [261.63, 293.66, 329.63, 392.0, 440.0]; // C4 D4 E4 G4 A4
const NOTE_INTERVAL_MS = 3200;
const NOTE_DURATION_SEC = 3.6;
const ATTACK_SEC = 1.2;
const DEFAULT_VOLUME = 0.2;
const OCTAVE_UP_CHANCE = 0.3;

let masterGain = null;
let intervalId = null;
let activeVolume = DEFAULT_VOLUME;

function ensureMasterGain(ctx) {
  if (!masterGain) {
    masterGain = ctx.createGain();
    masterGain.gain.value = activeVolume;
    masterGain.connect(ctx.destination);
  }
  return masterGain;
}

function playNote(ctx) {
  try {
    const gain = ensureMasterGain(ctx);
    const base = SCALE_HZ[Math.floor(Math.random() * SCALE_HZ.length)];
    const freq = Math.random() < OCTAVE_UP_CHANCE ? base * 2 : base;

    const osc = ctx.createOscillator();
    const noteGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;

    const now = ctx.currentTime;
    noteGain.gain.setValueAtTime(0, now);
    noteGain.gain.linearRampToValueAtTime(0.5, now + ATTACK_SEC);
    noteGain.gain.linearRampToValueAtTime(0, now + NOTE_DURATION_SEC);

    osc.connect(noteGain);
    noteGain.connect(gain);
    osc.start(now);
    osc.stop(now + NOTE_DURATION_SEC);
  } catch {
    // Web Audio לא זמין/חסום — מתעלמים בשקט, בדיוק כמו ב-sound.js
  }
}

export function startMusic() {
  if (intervalId || !isMusicEnabled()) return;
  const ctx = getAudioContext();
  ensureMasterGain(ctx);
  playNote(ctx);
  intervalId = setInterval(() => playNote(ctx), NOTE_INTERVAL_MS);
}

export function stopMusic() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

export function setMusicVolume(volume) {
  activeVolume = volume;
  if (masterGain) masterGain.gain.value = volume;
}
