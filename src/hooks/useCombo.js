import { useCallback, useRef, useState } from 'react';
import { playComboSound } from '../lib/sound.js';

const COMBO_MILESTONE = 5;
const BREAK_FLASH_MS = 500;

/**
 * רצף הצלחות בתוך סשן תרגול בודד. combo מתאפס בטעות; כל 5 נכונות ברצף
 * מנגן צליל קומבו עולה בגובה. comboRef/maxComboRef מתעדכנים באופן
 * סינכרוני (לא בתוך updater של setState) — כדי ש-getMaxCombo() שנקרא
 * מיד אחרי registerAnswer() (למשל בשאלה האחרונה של סשן, לפני onFinish)
 * תמיד ישקף את התשובה שזה עתה נרשמה, בלי תלות בתזמון batching של React.
 */
export default function useCombo() {
  const [combo, setCombo] = useState(0);
  const [justBroke, setJustBroke] = useState(false);
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);

  const registerAnswer = useCallback((isCorrect) => {
    if (isCorrect) {
      const next = comboRef.current + 1;
      comboRef.current = next;
      if (next > maxComboRef.current) maxComboRef.current = next;
      if (next % COMBO_MILESTONE === 0) playComboSound(next / COMBO_MILESTONE);
      setCombo(next);
    } else {
      const hadCombo = comboRef.current > 0;
      comboRef.current = 0;
      setCombo(0);
      if (hadCombo) {
        setJustBroke(true);
        setTimeout(() => setJustBroke(false), BREAK_FLASH_MS);
      }
    }
  }, []);

  const getMaxCombo = useCallback(() => maxComboRef.current, []);

  return { combo, justBroke, registerAnswer, getMaxCombo };
}
