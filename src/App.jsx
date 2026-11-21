import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Outlet, Navigate, useLocation } from 'react-router-dom';
import useAuthRole from './hooks/useAuthRole.js';
import useBackButtonGuard from './hooks/useBackButtonGuard.js';
import useSettings from './hooks/useSettings.js';
import { requestPushPermissionAndSaveToken } from './lib/push.js';
import { AuthProvider } from './context/AuthContext.jsx';
import LoadingSpinner from './components/LoadingSpinner.jsx';
import SplashScreen from './components/SplashScreen.jsx';
import BottomNav from './components/BottomNav.jsx';
import SideNav from './components/SideNav.jsx';
import KeyboardHint from './components/practice/KeyboardHint.jsx';
import Login from './pages/Login.jsx';
import ConsentGate from './components/consent/ConsentGate.jsx';
import NoInstitution from './pages/NoInstitution.jsx';
import Home from './pages/Home.jsx';
import Practice from './pages/Practice.jsx';
import PracticePicker from './pages/PracticePicker.jsx';
import PracticeSession from './pages/PracticeSession.jsx';
import SprintSession from './pages/SprintSession.jsx';
import Statistics from './pages/Statistics.jsx';
import Profile from './pages/Profile.jsx';

// פריסה לפי רוחב המסך:
// • טלפון (עד 767px): עמודה של 480px וסרגל טאבים תחתון — בדיוק כמו קודם (מחלקות הבסיס לא השתנו).
// • טאבלט (768–1023px): אותו כרטיס לבן וסרגל תחתון, אבל רחב יותר (768px) — העמודים עוברים לשתי
//   עמודות היכן שזה מתאים (md:).
// • מחשב (1024px ומעלה): ניווט צד מימין (SideNav) במקום הסרגל התחתון; התוכן עד 1200px, ממורכז
//   בשטח שנשאר. מסכי תרגול (סשן מודול/ספרינט + סיכום) — עמודה ממורכזת של 720px.
const PRACTICE_SESSION_ROUTE = /^\/(practice\/[^/]+\/[^/]+|sprint)\/?$/;

function Layout() {
  const { pathname } = useLocation();
  const practiceSession = PRACTICE_SESSION_ROUTE.test(pathname);
  return (
    <div className="min-h-dvh flex flex-col md:bg-gradient-to-b md:from-brand-grey-light md:to-white lg:bg-none lg:pr-64">
      <SideNav />
      <main
        className={`flex-1 max-w-[480px] w-full mx-auto pb-24 md:py-6 md:max-w-3xl lg:pb-12 lg:pt-4 lg:px-6 ${
          practiceSession ? 'lg:max-w-[720px] lg:px-0' : 'lg:max-w-[1200px]'
        }`}
      >
        <div className="md:rounded-3xl md:bg-white md:shadow-lg md:min-h-[calc(100dvh-3rem)] lg:rounded-none lg:bg-transparent lg:shadow-none lg:min-h-0">
          {/* כותרת לקוראי מסך בלבד (לא נראית בשום רוחב) — לכל עמוד יש h1 */}
          {practiceSession && <h1 className="sr-only">תרגול</h1>}
          {practiceSession && <KeyboardHint />}
          <Outlet />
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const { status, user, profile } = useAuthRole();
  const { animationsEnabled } = useSettings();
  useBackButtonGuard();

  // בקשת הרשאת Push לאחר login — מוגן ב-flag לכל uid בתוך
  // requestPushPermissionAndSaveToken עצמה, כך שלא מציקים בכל טעינה.
  useEffect(() => {
    if (user) {
      console.log('FCM: App.jsx effect firing, user.uid = ' + user.uid);
      requestPushPermissionAndSaveToken(user.uid);
    } else {
      console.log('FCM: App.jsx effect firing, but user is null/undefined — skipping');
    }
  }, [user]);

  // מוצג רק בטעינה ראשונה — App לא נטען מחדש בניווט בתוך ה-app (React
  // Router client-side), רק ב-reload/כניסה מחדש, כך ש-state רגיל מספיק
  // ואין צורך ב-sessionStorage.
  if (showSplash) {
    return <SplashScreen ready={status !== 'loading'} onDone={() => setShowSplash(false)} />;
  }

  if (status === 'loading') {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (status === 'signed-out') return <Login />;
  // משתמש קיים שעוד לא אישר תקנון ומדיניות פרטיות — מסך הסכמה חד-פעמי לפני כל דבר אחר
  if (profile?.needsConsent) return <ConsentGate uid={user.uid} />;
  if (status === 'no-institution') return <NoInstitution />;

  return (
    <AuthProvider user={user} profile={profile}>
      <div className={animationsEnabled ? '' : 'no-animations'}>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/practice" element={<Practice />} />
              <Route path="/practice/:assignmentId" element={<PracticePicker />} />
              <Route path="/practice/:assignmentId/:module" element={<PracticeSession />} />
              <Route path="/sprint" element={<SprintSession />} />
              <Route path="/stats" element={<Statistics />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </div>
    </AuthProvider>
  );
}
