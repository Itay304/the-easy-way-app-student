import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import useAuthRole from './hooks/useAuthRole.js';
import useBackButtonGuard from './hooks/useBackButtonGuard.js';
import useSettings from './hooks/useSettings.js';
import useInstallGate from './hooks/useInstallGate.js';
import { requestPushPermissionAndSaveToken } from './lib/push.js';
import { AuthProvider } from './context/AuthContext.jsx';
import LoadingSpinner from './components/LoadingSpinner.jsx';
import InstallRequired from './components/InstallRequired.jsx';
import SplashScreen from './components/SplashScreen.jsx';
import BottomNav from './components/BottomNav.jsx';
import Login from './pages/Login.jsx';
import NoInstitution from './pages/NoInstitution.jsx';
import Home from './pages/Home.jsx';
import Practice from './pages/Practice.jsx';
import PracticePicker from './pages/PracticePicker.jsx';
import PracticeSession from './pages/PracticeSession.jsx';
import SprintSession from './pages/SprintSession.jsx';
import Statistics from './pages/Statistics.jsx';
import Profile from './pages/Profile.jsx';

function Layout() {
  return (
    <div className="min-h-dvh flex flex-col">
      <main className="flex-1 max-w-3xl w-full mx-auto pb-24">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const { requiresInstall } = useInstallGate();
  const { status, user, profile } = useAuthRole();
  const { animationsEnabled } = useSettings();
  useBackButtonGuard();

  // בקשת הרשאת Push לאחר login — מוגן ב-flag לכל uid בתוך
  // requestPushPermissionAndSaveToken עצמה, כך שלא מציקים בכל טעינה.
  useEffect(() => {
    if (user) requestPushPermissionAndSaveToken(user.uid);
  }, [user]);

  // מוצג רק בטעינה ראשונה — App לא נטען מחדש בניווט בתוך ה-app (React
  // Router client-side), רק ב-reload/כניסה מחדש, כך ש-state רגיל מספיק
  // ואין צורך ב-sessionStorage.
  if (showSplash) {
    return <SplashScreen onDone={() => setShowSplash(false)} />;
  }

  if (requiresInstall) {
    return <InstallRequired />;
  }

  if (status === 'loading') {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (status === 'signed-out') return <Login />;
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
