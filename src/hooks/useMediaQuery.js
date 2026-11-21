import { useEffect, useState } from 'react';

// true כשה-media query מתקיים (למשל '(min-width: 768px)'), ומתעדכן בשינוי גודל החלון.
// משמש רק להחלטה אם לטעון תוכן שמוצג במסך רחב בלבד (בטלפון — בלי קריאות נוספות).
export default function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}
