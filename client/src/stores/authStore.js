import { create } from 'zustand';
import api from '../services/api';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  loading: true,

  setAuth: (user, token) => set({ user, token, loading: false }),
  logout: () => {
    set({ user: null, token: null, loading: false });
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  },

  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { user, accessToken, refreshToken } = res.data;
    localStorage.setItem('token', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    set({ user, token: accessToken, loading: false });
    return user;
  },

  register: async (data) => {
    const res = await api.post('/auth/register', data);
    const { user, accessToken, refreshToken } = res.data;
    localStorage.setItem('token', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    set({ user, token: accessToken, loading: false });
    return user;
  },

  loadUser: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ loading: false });
      return;
    }
    try {
      const res = await api.get('/auth/me');
      set({ user: res.data, token, loading: false });
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      set({ user: null, token: null, loading: false });
    }
  },
}));

export const useNotificationStore = create((set) => ({
  notifications: [],
  unreadCount: 0,

  setNotifications: (data, count) => set({ notifications: data, unreadCount: count }),
  addNotification: (notif) => set((s) => ({
    notifications: [notif, ...s.notifications],
    unreadCount: s.unreadCount + 1,
  })),
  decrementUnread: () => set((s) => ({ unreadCount: Math.max(0, s.unreadCount - 1) })),
  clearUnread: () => set({ unreadCount: 0 }),
}));
