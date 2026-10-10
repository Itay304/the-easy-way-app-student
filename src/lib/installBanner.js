const DISMISSED_KEY = 'easylex_install_banner_dismissed_at';
const DISMISS_DAYS = 3;

export function isInstallBannerDismissed() {
  try {
    const dismissedAt = Number(localStorage.getItem(DISMISSED_KEY));
    return Boolean(dismissedAt) && Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export function dismissInstallBanner() {
  try {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  } catch {
    // localStorage חסום (מצב פרטי וכו') — הבאנר יוצג שוב בפעם הבאה, לא קריטי
  }
}
