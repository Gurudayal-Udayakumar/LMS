import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Layout from './components/layout/Layout';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import Appointments from './pages/Appointments';
import Tickets from './pages/Tickets';
import TicketDetail from './pages/TicketDetail';
import Tasks from './pages/Tasks';
import TaskDetail from './pages/TaskDetail';
import Chat from './pages/Chat';
import Jobs from './pages/Jobs';
import JobDetail from './pages/JobDetail';
import AdminUsers from './pages/AdminUsers';
import Profile from './pages/Profile';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuthStore();
  if (loading) return <div className="page-loading"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" />;
  return children;
}

export default function App() {
  const { loadUser, loading } = useAuthStore();

  useEffect(() => { loadUser(); }, []);

  if (loading) {
    return <div className="page-loading" style={{ minHeight: '100vh' }}><div className="spinner" /></div>;
  }

  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="appointments" element={<Appointments />} />
        <Route path="tickets" element={<Tickets />} />
        <Route path="tickets/:id" element={<TicketDetail />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="tasks/:id" element={<TaskDetail />} />
        <Route path="chat" element={<Chat />} />
        <Route path="jobs" element={<Jobs />} />
        <Route path="jobs/:id" element={<JobDetail />} />
        <Route path="admin/users" element={<AdminUsers />} />
        <Route path="profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}
