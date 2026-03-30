import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import api from '../services/api';
import { formatDateTime, statusColor } from '../utils/helpers';

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentItems, setRecentItems] = useState({ appointments: [], tickets: [], tasks: [] });

  useEffect(() => {
    document.getElementById('page-title').textContent = 'Dashboard';
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [appts, tickets, tasks] = await Promise.all([
        api.get('/appointments?limit=5'),
        api.get('/tickets?limit=5'),
        api.get('/tasks?limit=5'),
      ]);
      setRecentItems({
        appointments: appts.data.data,
        tickets: tickets.data.data,
        tasks: tasks.data.data,
      });

      if (user.role === 'admin') {
        const s = await api.get('/admin/stats');
        setStats(s.data);
      }
    } catch {}
  };

  const statCards = user.role === 'admin' && stats ? [
    { icon: 'people', label: 'Total Users', value: stats.users, color: 'purple' },
    { icon: 'confirmation_number', label: 'Open Tickets', value: stats.openTickets, color: 'yellow' },
    { icon: 'assignment', label: 'Total Tasks', value: stats.tasks, color: 'cyan' },
    { icon: 'work', label: 'Job Posts', value: stats.jobs, color: 'green' },
    { icon: 'calendar_month', label: 'Pending Appointments', value: stats.pendingAppointments, color: 'pink' },
  ] : null;

  const quickLinks = [
    { icon: 'calendar_month', label: 'Book Appointment', path: '/appointments', color: 'purple', roles: ['student'] },
    { icon: 'confirmation_number', label: 'Raise Ticket', path: '/tickets', color: 'yellow', roles: ['student'] },
    { icon: 'assignment', label: 'View Tasks', path: '/tasks', color: 'cyan', roles: ['student', 'mentor', 'admin'] },
    { icon: 'chat', label: 'Open Chat', path: '/chat', color: 'green', roles: ['student', 'mentor', 'admin'] },
    { icon: 'work', label: 'Browse Jobs', path: '/jobs', color: 'pink', roles: ['student'] },
    { icon: 'add_task', label: 'Create Task', path: '/tasks', color: 'cyan', roles: ['mentor'] },
    { icon: 'post_add', label: 'Post Job', path: '/jobs', color: 'green', roles: ['mentor', 'admin'] },
    { icon: 'admin_panel_settings', label: 'Manage Users', path: '/admin/users', color: 'red', roles: ['admin'] },
  ].filter(l => l.roles.includes(user.role));

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: '1.4rem', marginBottom: 4 }}>Welcome back, {user.fullName}! 👋</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Here's what's happening on your LMS platform.</p>
      </div>

      {statCards && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
          {statCards.map((s, i) => (
            <div className="stat-card" key={i}>
              <div className={`stat-icon ${s.color}`}><span className="material-icons-round">{s.icon}</span></div>
              <div className="stat-info"><h3>{s.value}</h3><p>{s.label}</p></div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 32 }}>
        {quickLinks.map((l, i) => (
          <div key={i} className="card" style={{ cursor: 'pointer', textAlign: 'center', padding: 20 }} onClick={() => navigate(l.path)}>
            <div className={`stat-icon ${l.color}`} style={{ width: 44, height: 44, margin: '0 auto 10px', borderRadius: 12 }}>
              <span className="material-icons-round">{l.icon}</span>
            </div>
            <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>{l.label}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card">
          <h3 style={{ fontSize: '1rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-icons-round" style={{ color: 'var(--accent)', fontSize: 20 }}>calendar_month</span>
            Upcoming Appointments
          </h3>
          {recentItems.appointments.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No upcoming appointments</p>
          ) : (
            recentItems.appointments.map(a => (
              <div key={a.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{a.title}</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatDateTime(a.scheduledAt)}</p>
                </div>
                <span className={`badge badge-${statusColor(a.status)}`}>{a.status}</span>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <h3 style={{ fontSize: '1rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-icons-round" style={{ color: 'var(--accent-yellow)', fontSize: 20 }}>confirmation_number</span>
            Recent Tickets
          </h3>
          {recentItems.tickets.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No tickets</p>
          ) : (
            recentItems.tickets.map(t => (
              <div key={t.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => navigate(`/tickets/${t.id}`)}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t.title}</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t.category} • {t._count?.messages || 0} replies</p>
                </div>
                <span className={`badge badge-${statusColor(t.status)}`}>{t.status.replace('_', ' ')}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
