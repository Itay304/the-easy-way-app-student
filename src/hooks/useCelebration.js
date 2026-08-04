import { useCallback, useState } from 'react';
import { playSuccessSound, playErrorSound } from '../lib/sound.js';

const CONFETTI_DURATION_MS = 1500;

export default function useCelebration() {
  const [confettiKey, setConfettiKey] = useState(null);
  const [xpFlyup, setXpFlyup] = useState(null); // { amount, key }
  const [shaking, setShaking] = useState(false);

  const celebrate = useCallback((xpAmount = 10) => {
    playSuccessSound();
    const key = Date.now();
    setConfettiKey(key);
    setXpFlyup({ amount: xpAmount, key: key + 1 });
    setTimeout(() => setConfettiKey((k) => (k === key ? null : k)), CONFETTI_DURATION_MS);
  }, []);

  const shake = useCallback(() => {
    playErrorSound();
    setShaking(true);
  }, []);

  const stopShake = useCallback(() => setShaking(false), []);

  return { confettiKey, xpFlyup, shaking, celebrate, shake, stopShake };
}
