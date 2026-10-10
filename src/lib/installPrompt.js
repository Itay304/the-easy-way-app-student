// לוכד את beforeinstallprompt (אנדרואיד/כרום) כבר בעלית האפליקציה
// (מיובא מ-main.jsx) — האירוע עלול להתרחש לפני ש-InstallBanner נטען,
// ו-preventDefault חוסם את ההתקנה האוטומטית כדי שנפעיל אותה ביוזמתנו.
let deferredEvent = null;
const listeners = new Set();

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredEvent = e;
  listeners.forEach((fn) => fn());
});

export function hasInstallPrompt() {
  return deferredEvent !== null;
}

export function onInstallPromptReady(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function triggerInstallPrompt() {
  if (!deferredEvent) return null;
  deferredEvent.prompt();
  const choice = await deferredEvent.userChoice;
  deferredEvent = null;
  return choice;
}
