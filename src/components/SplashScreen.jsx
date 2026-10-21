import { useEffect, useState } from 'react';

const HOLD_MS = 1000; // אחרי שניה אחת מתחילים fade out
const FADE_OUT_MS = 400;

export default function SplashScreen({ onDone }) {
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    const holdTimer = setTimeout(() => setFadingOut(true), HOLD_MS);
    const doneTimer = setTimeout(onDone, HOLD_MS + FADE_OUT_MS);
    return () => {
      clearTimeout(holdTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center bg-[#E1F3EF] transition-opacity duration-[400ms] ${
        fadingOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <img src="/logo.svg" alt="Easylex" className="w-[240px] h-auto animate-splash-logo" />
    </div>
  );
}
