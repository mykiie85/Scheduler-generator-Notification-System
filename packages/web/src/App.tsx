import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import StaffDatabase from './pages/StaffDatabase';
import RosterGenerator from './pages/RosterGenerator';
import WeeklyAllocation from './pages/WeeklyAllocation';
import HolidayScheduler from './pages/HolidayScheduler';
import EventGenerator from './pages/EventGenerator';
import Announcements from './pages/Announcements';
import AnnualLeave from './pages/AnnualLeave';
import UserManagement from './pages/UserManagement';
import Profile from './pages/Profile';

function ProtectedPage({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  return (
    <ProtectedRoute roles={roles}>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<ProtectedPage><Dashboard /></ProtectedPage>} />
        <Route path="/staff" element={<ProtectedPage><StaffDatabase /></ProtectedPage>} />
        <Route path="/roster" element={<ProtectedPage><RosterGenerator /></ProtectedPage>} />
        <Route path="/weekly-allocation" element={<ProtectedPage><WeeklyAllocation /></ProtectedPage>} />
        <Route path="/holiday-scheduler" element={<ProtectedPage><HolidayScheduler /></ProtectedPage>} />
        <Route path="/events" element={<ProtectedPage><EventGenerator /></ProtectedPage>} />
        <Route path="/announcements" element={<ProtectedPage><Announcements /></ProtectedPage>} />
        <Route path="/leave" element={<ProtectedPage><AnnualLeave /></ProtectedPage>} />
        <Route path="/users" element={<ProtectedPage roles={['ADMIN']}><UserManagement /></ProtectedPage>} />
        <Route path="/profile" element={<ProtectedPage><Profile /></ProtectedPage>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}
