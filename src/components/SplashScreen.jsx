import { useEffect, useRef, useState } from 'react';
import SplashLogo from './SplashLogo.jsx';

const ANIM_MS = 1200; // אורך אנימציית הלוגו (ראו .splash-logo ב-index.css)
const FADE_OUT_MS = 300;

// ready = האפליקציה סיימה לטעון (סטטוס ההתחברות ידוע). אם זה קורה לפני סוף האנימציה —
// קופצים ישר ללוגו הסופי ומתחילים fade out, כך שהאנימציה לא מעכבת את הכניסה.
export default function SplashScreen({ ready = false, onDone }) {
  const [fadingOut, setFadingOut] = useState(false);
  const [skipped, setSkipped] = useState(false);
  // onDone מגיע כפונקציה חדשה בכל רינדור של App — שומרים ב-ref כדי לא לאפס את הטיימרים
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const animTimer = setTimeout(() => setFadingOut(true), ANIM_MS);
    return () => clearTimeout(animTimer);
  }, []);

  useEffect(() => {
    if (ready && !fadingOut) {
      setSkipped(true);
      setFadingOut(true);
    }
  }, [ready, fadingOut]);

  useEffect(() => {
    if (!fadingOut) return undefined;
    const doneTimer = setTimeout(() => onDoneRef.current(), FADE_OUT_MS);
    return () => clearTimeout(doneTimer);
  }, [fadingOut]);

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center bg-[#E1F3EF] transition-opacity duration-[300ms] ${
        fadingOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <SplashLogo className={`w-[240px] h-auto ${skipped ? 'is-skipped' : ''}`} />
    </div>
  );
}
