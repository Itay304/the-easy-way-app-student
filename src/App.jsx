import { BrowserRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import useAuthRole from './hooks/useAuthRole.js';
import useBackButtonGuard from './hooks/useBackButtonGuard.js';
import useSettings from './hooks/useSettings.js';
import { AuthProvider } from './context/AuthContext.jsx';
import LoadingSpinner from './components/LoadingSpinner.jsx';
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
  const { status, user, profile } = useAuthRole();
  const { animationsEnabled } = useSettings();
  useBackButtonGuard();

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
