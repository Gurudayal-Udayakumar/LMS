import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import api from '../services/api';
import { getInitials, formatDate } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user, setAuth } = useAuthStore();
  const [form, setForm] = useState({ fullName: '', phone: '', bio: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.getElementById('page-title').textContent = 'Profile';
    if (user) {
      setForm({ fullName: user.fullName || '', phone: user.phone || '', bio: user.bio || '' });
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.patch('/auth/profile', form);
      setAuth(res.data, localStorage.getItem('token'));
      toast.success('Profile updated!');
    } catch (err) { toast.error('Failed to update'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ maxWidth: 600 }}>
      <div className="card" style={{ marginBottom: 24, textAlign: 'center', padding: 32 }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--accent-pink))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800, color: 'white', margin: '0 auto 16px' }}>
          {getInitials(user?.fullName)}
        </div>
        <h2 style={{ fontSize: '1.3rem', marginBottom: 4 }}>{user?.fullName}</h2>
        <p style={{ color: 'var(--text-muted)', textTransform: 'capitalize', marginBottom: 4 }}>{user?.role}</p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{user?.email}</p>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>Member since {formatDate(user?.createdAt)}</p>
      </div>

      <div className="card">
        <h3 style={{ fontSize: '1rem', marginBottom: 20 }}>Edit Profile</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input className="form-input" value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} required id="profile-name" />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input className="form-input" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} id="profile-phone" />
          </div>
          <div className="form-group">
            <label>Bio</label>
            <textarea className="form-textarea" value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} placeholder="Tell us about yourself" id="profile-bio" />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} id="profile-save">
            {loading ? <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
