import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

export default function AuthPage() {
  const [tab, setTab] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', fullName: '', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register, user } = useAuthStore();
  const navigate = useNavigate();

  if (user) { navigate('/dashboard'); return null; }

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'login') {
        await login(form.email, form.password);
        toast.success('Welcome back!');
      } else {
        await register({ email: form.email, password: form.password, fullName: form.fullName, phone: form.phone });
        toast.success('Account created!');
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="logo">L</div>
          <h1>LMS Platform</h1>
          <p>Learning Management System</p>
        </div>

        <div className="auth-tabs">
          <button className={`auth-tab${tab === 'login' ? ' active' : ''}`} onClick={() => setTab('login')} id="login-tab">Login</button>
          <button className={`auth-tab${tab === 'register' ? ' active' : ''}`} onClick={() => setTab('register')} id="register-tab">Register</button>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {tab === 'register' && (
            <div className="form-group">
              <label>Full Name</label>
              <input className="form-input" name="fullName" value={form.fullName} onChange={handleChange} placeholder="Enter your full name" required id="auth-fullname" />
            </div>
          )}
          <div className="form-group">
            <label>Email</label>
            <input className="form-input" name="email" type="email" value={form.email} onChange={handleChange} placeholder="Enter your email" required id="auth-email" />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input className="form-input" name="password" type="password" value={form.password} onChange={handleChange} placeholder="Enter your password" required minLength={6} id="auth-password" />
          </div>
          {tab === 'register' && (
            <div className="form-group">
              <label>Phone (optional)</label>
              <input className="form-input" name="phone" value={form.phone} onChange={handleChange} placeholder="Phone number" id="auth-phone" />
            </div>
          )}
          <button className="btn btn-primary" type="submit" disabled={loading} id="auth-submit">
            {loading ? <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : (tab === 'login' ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        {tab === 'login' && (
          <div style={{ marginTop: 20, padding: '14px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 8 }}>Demo Accounts (password: <strong>password123</strong>)</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--accent-pink)' }}>Admin: admin@lms.com</span>
              <span style={{ color: 'var(--accent-cyan)' }}>Mentor: mentor1@lms.com</span>
              <span style={{ color: 'var(--accent-green)' }}>Student: student1@lms.com</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
