import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Loader2 } from 'lucide-react';
import { AuthProvider } from './providers/AuthProvider';
import { useAuth } from './hooks/useAuth';
import { Login } from './pages/Login';
import { l10n } from './lib/l10n';

// Lazy load page components
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const PatientList = lazy(() => import('./pages/PatientList').then(m => ({ default: m.PatientList })));
const PatientProfile = lazy(() => import('./pages/PatientProfile').then(m => ({ default: m.PatientProfile })));
const Chat = lazy(() => import('./pages/Chat').then(m => ({ default: m.Chat })));
const Library = lazy(() => import('./pages/Library').then(m => ({ default: m.Library })));
const Schedule = lazy(() => import('./pages/Schedule').then(m => ({ default: m.Schedule })));
const Finance = lazy(() => import('./pages/Finance').then(m => ({ default: m.Finance })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const UserManagement = lazy(() => import('./pages/UserManagement').then(m => ({ default: m.UserManagement })));
const Support = lazy(() => import('./pages/Support').then(m => ({ default: m.Support })));
const ReportForm = lazy(() => import('./pages/ReportForm').then(m => ({ default: m.ReportForm })));
const NotificationSettings = lazy(() => import('./pages/NotificationSettings').then(m => ({ default: m.NotificationSettings })));

const PageLoader = () => (
  <div className="flex h-full w-full items-center justify-center bg-gray-50 dark:bg-gray-950">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const AppContent = () => {
  const { user, loading, isStaff, logout } = useAuth();

  if (loading) return <PageLoader />;

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="patients" element={<PatientList />} />
          <Route path="patients/:id" element={<PatientProfile />} />
          <Route path="patients/:id/report" element={<ReportForm />} />
          <Route path="chat" element={<Chat />} />
          <Route path="chat/:id" element={<Chat />} />
          <Route path="library" element={<Library />} />
          <Route path="schedule" element={<Schedule />} />
          <Route path="finance" element={<Finance />} />
          <Route path="profile" element={<Profile />} />
          <Route path="notifications/settings" element={<NotificationSettings />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="support" element={<Support />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
