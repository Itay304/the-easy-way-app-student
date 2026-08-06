import { isSoundEnabled } from './settings.js';

// אפקטי קול — Web Audio API בלבד, בלי קבצי שמע חיצוניים. כל צליל בנוי
// מ-FM synthesis אמיתי (אוסילטור נשא + אוסילטור מודולטור שמזין את
// carrier.frequency דרך GainNode) — הרמוניות עשירות בהרבה מטון סינוס
// טהור, בלי לדגום/לטעון שום דבר. שגיאה נשמעת דרך BiquadFilterNode
// (lowpass) כדי לרכך sawtooth חד; קומבו/ניצחון עוברים גם דרך "רברב"
// מסונתז (ConvolverNode עם אימפולס רעש-לבן-דועך, לא קובץ IR).

let audioCtx = null;
let reverbNode = null;

function getAudioContext() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audioCtx = new Ctx();
  }
  return audioCtx;
}

function getReverb(ctx) {
  if (!reverbNode) {
    const duration = 1.2;
    const decay = 2.5;
    const rate = ctx.sampleRate;
    const length = Math.floor(rate * duration);
    const impulse = ctx.createBuffer(2, length, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** decay;
      }
    }
    reverbNode = ctx.createConvolver();
    reverbNode.buffer = impulse;
    reverbNode.connect(ctx.destination);
  }
  return reverbNode;
}

/** מעטפת ADSR על GainNode. attack/decay/release קובעים משך כל שלב;
 * sustain הוא יחס (0-1) מה-peak שנשמר בין decay ל-release. אם
 * attack+decay חורגים מ-duration-release, ה-release פשוט מתחיל מיד
 * אחרי שה-decay מסתיים (לא קורס, רק הצליל מעט ארוך יותר מהנומינלי). */
function applyEnvelope(ctx, destination, peak, startTime, duration, { attack = 0.01, decay = 0.08, sustain = 0.6, release = 0.05 } = {}) {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(peak, startTime + attack);
  gain.gain.linearRampToValueAtTime(peak * sustain, startTime + attack + decay);
  const releaseStart = Math.max(startTime + attack + decay, startTime + duration - release);
  gain.gain.setValueAtTime(peak * sustain, releaseStart);
  gain.gain.linearRampToValueAtTime(0, releaseStart + release);
  gain.connect(destination);
  return gain;
}

/** קול FM דו-אופרטורי (carrier מנוגן, modulator מזין את תדר ה-carrier
 * דרך GainNode) — זו ה-FM synthesis האמיתית. wet={node, amount} שולח
 * עותק (אחרי המעטפת, כדי שהרברב יעקוב אחרי הדעיכה) לבאס רברב משותף. */
function fmNote(ctx, destination, { freq, type = 'sine', modRatio = 2, modDepth = 10, startTime, duration, peak = 0.2, envelope, wet }) {
  const carrier = ctx.createOscillator();
  carrier.type = type;
  carrier.frequency.setValueAtTime(freq, startTime);

  const modulator = ctx.createOscillator();
  modulator.frequency.setValueAtTime(freq * modRatio, startTime);
  const modGain = ctx.createGain();
  modGain.gain.setValueAtTime(modDepth, startTime);
  modulator.connect(modGain);
  modGain.connect(carrier.frequency);

  const env = applyEnvelope(ctx, destination, peak, startTime, duration, envelope);
  carrier.connect(env);

  if (wet) {
    const wetGain = ctx.createGain();
    wetGain.gain.setValueAtTime(wet.amount, startTime);
    env.connect(wetGain);
    wetGain.connect(wet.node);
  }

  const stopTime = startTime + duration + 0.05;
  carrier.start(startTime);
  carrier.stop(stopTime);
  modulator.start(startTime);
  modulator.stop(stopTime);
}

/** שתי קולות FM (sine+triangle) על אותו תדר, לצליל מלא/חם יותר מגל
 * בודד — "sine + triangle ביחד" כמבוקש, לתשובה נכונה ולניצחון. */
function layeredNote(ctx, destination, { freq, startTime, duration, peak = 0.2, modRatio = 2, modDepth = 10, envelope, wet }) {
  fmNote(ctx, destination, { freq, type: 'sine', startTime, duration, peak: peak * 0.65, modRatio, modDepth, envelope, wet });
  fmNote(ctx, destination, { freq, type: 'triangle', startTime, duration, peak: peak * 0.5, modRatio, modDepth: modDepth * 0.6, envelope, wet });
}

/** תשובה נכונה — שני טונים עולים C5→E5, 0.15 שניות כל אחד, חופפים מעט
 * לתחושת "בלינג-בלינג" מהירה. */
export function playSuccessSound() {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const envelope = { attack: 0.01, decay: 0.1, sustain: 0.6, release: 0.05 };
    layeredNote(ctx, ctx.destination, { freq: 523.25, startTime: now, duration: 0.15, peak: 0.22, modDepth: 8, envelope }); // C5
    layeredNote(ctx, ctx.destination, { freq: 659.25, startTime: now + 0.13, duration: 0.15, peak: 0.22, modDepth: 8, envelope }); // E5
  } catch {
    // Web Audio לא זמין/חסום (למשל לפני אינטראקציית משתמש ראשונה) — מתעלמים בשקט
  }
}

/** תשובה שגויה — טון יורד E3→C3 (sawtooth דרך lowpass, Q נמוך כדי
 * שיישמע רך ולא מפחיד), 0.3 שניות. */
export function playErrorSound() {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const duration = 0.3;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(164.81, now); // E3
    osc.frequency.exponentialRampToValueAtTime(130.81, now + duration); // C3

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 0.7;
    filter.frequency.setValueAtTime(900, now);
    filter.frequency.exponentialRampToValueAtTime(500, now + duration);
    filter.connect(ctx.destination);

    const env = applyEnvelope(ctx, filter, 0.16, now, duration, { attack: 0.015, decay: 0.1, sustain: 0.5, release: 0.1 });
    osc.connect(env);

    const stopTime = now + duration + 0.05;
    osc.start(now);
    osc.stop(stopTime);
  } catch {
    // ר' הערה למעלה
  }
}

/** קומבו — מתנגן כל 5 תשובות נכונות ברצף. 3 טונים עולים מהיר
 * C5→E5→G5, 0.1 שניות כל אחד, sine + רברב קל. tier מזיז מעט את הגובה
 * כלפי מעלה בכל מדרגה (combo/5) כדי שהרצף ירגיש הולך ומתעצם. */
export function playComboSound(tier = 1) {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const reverb = getReverb(ctx);
    const shift = 2 ** (((tier - 1) % 4) / 12);
    const envelope = { attack: 0.005, decay: 0.05, sustain: 0.5, release: 0.03 };
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      fmNote(ctx, ctx.destination, {
        freq: freq * shift,
        type: 'sine',
        startTime: now + i * 0.09,
        duration: 0.1,
        peak: 0.2,
        modDepth: 6,
        envelope,
        wet: { node: reverb, amount: 0.35 },
      });
    });
  } catch {
    // ר' הערה למעלה
  }
}

/** ניצחון — C5→E5→G5→C6, 0.2 שניות כל טון, sine+triangle ורברב קל,
 * fade out ארוך על הטון האחרון. */
export function playVictorySound() {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const reverb = getReverb(ctx);
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      const isLast = i === notes.length - 1;
      layeredNote(ctx, ctx.destination, {
        freq,
        startTime: now + i * 0.18,
        duration: isLast ? 0.5 : 0.2,
        peak: 0.2,
        modDepth: 8,
        envelope: isLast
          ? { attack: 0.01, decay: 0.08, sustain: 0.5, release: 0.35 }
          : { attack: 0.01, decay: 0.08, sustain: 0.6, release: 0.06 },
        wet: { node: reverb, amount: 0.25 },
      });
    });
  } catch {
    // ר' הערה למעלה
  }
}
