import { useEffect, useState, useRef } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore, useNotificationStore } from '../../stores/authStore';
import { connectSocket, disconnectSocket, getSocket } from '../../socket';
import { getInitials, timeAgo } from '../../utils/helpers';
import api from '../../services/api';

export default function Layout() {
  const { user, logout } = useAuthStore();
  const { notifications, unreadCount, setNotifications, addNotification, decrementUnread, clearUnread } = useNotificationStore();
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Load notifications
    api.get('/notifications?limit=20').then(res => {
      setNotifications(res.data.data, res.data.unreadCount);
    }).catch(() => {});

    // Connect socket
    const token = localStorage.getItem('token');
    if (token) {
      const socket = connectSocket(token);
      socket.on('notification', (notif) => {
        addNotification(notif);
      });
    }

    return () => disconnectSocket();
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = () => {
    disconnectSocket();
    logout();
    navigate('/login');
  };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      clearUnread();
    } catch {}
  };

  const markRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      decrementUnread();
    } catch {}
  };

  const navItems = [
    { to: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
    { to: '/appointments', icon: 'calendar_month', label: 'Appointments' },
    { to: '/tickets', icon: 'confirmation_number', label: 'Tickets' },
    { to: '/tasks', icon: 'assignment', label: 'Tasks' },
    { to: '/chat', icon: 'chat', label: 'Chat' },
    { to: '/jobs', icon: 'work', label: 'Jobs' },
  ];

  if (user?.role === 'admin') {
    navItems.push({ to: '/admin/users', icon: 'admin_panel_settings', label: 'Admin Panel' });
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="logo">L</div>
          <h2>LMS Platform</h2>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <span className="material-icons-round">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-user">
          <div className="avatar">{getInitials(user?.fullName)}</div>
          <div className="user-info">
            <div className="name">{user?.fullName}</div>
            <div className="role">{user?.role}</div>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="page-header">
          <h1 id="page-title"></h1>
          <div className="header-actions">
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button className="notif-bell" onClick={() => setShowNotifs(!showNotifs)} id="notification-bell">
                <span className="material-icons-round">notifications</span>
                {unreadCount > 0 && <span className="badge-count">{unreadCount > 9 ? '9+' : unreadCount}</span>}
              </button>
              {showNotifs && (
                <div className="notif-dropdown">
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.9rem' }}>Notifications</strong>
                    {unreadCount > 0 && <button className="btn btn-sm btn-secondary" onClick={markAllRead}>Mark all read</button>}
                  </div>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No notifications</div>
                  ) : (
                    notifications.slice(0, 10).map(n => (
                      <div key={n.id} className={`notif-item${!n.isRead ? ' unread' : ''}`} onClick={() => { markRead(n.id); setShowNotifs(false); }}>
                        <div className="notif-title">{n.title}</div>
                        <div className="notif-msg">{n.message}</div>
                        <div className="notif-time">{timeAgo(n.createdAt)}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <NavLink to="/profile" className="btn btn-sm btn-secondary" id="profile-btn">
              <span className="material-icons-round" style={{ fontSize: 18 }}>person</span>
              <span>Profile</span>
            </NavLink>
            <button className="btn btn-sm btn-danger" onClick={handleLogout} id="logout-btn">
              <span className="material-icons-round" style={{ fontSize: 18 }}>logout</span>
              <span>Logout</span>
            </button>
          </div>
        </header>
        <div className="page-body">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
