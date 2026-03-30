import { useEffect, useState } from 'react';
import api from '../services/api';
import { formatDate, getInitials } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', fullName: '', role: 'student', phone: '' });

  useEffect(() => {
    document.getElementById('page-title').textContent = 'User Management';
    loadUsers();
  }, [search, roleFilter]);

  const loadUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (roleFilter) params.append('role', roleFilter);
      const res = await api.get(`/admin/users?${params}`);
      setUsers(res.data.data);
    } catch {} finally { setLoading(false); }
  };

  const updateRole = async (userId, role) => {
    try {
      await api.patch(`/admin/users/${userId}/role`, { role });
      toast.success('Role updated');
      loadUsers();
    } catch (err) { toast.error('Failed'); }
  };

  const toggleActive = async (userId, isActive) => {
    try {
      await api.patch(`/admin/users/${userId}/status`, { isActive: !isActive });
      toast.success(isActive ? 'User deactivated' : 'User activated');
      loadUsers();
    } catch {}
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/users', form);
      toast.success('User created');
      setShowCreate(false);
      setForm({ email: '', password: '', fullName: '', role: 'student', phone: '' });
      loadUsers();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: '1.2rem' }}>User Management</h2>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)} id="create-user-btn">
          <span className="material-icons-round" style={{ fontSize: 18 }}>person_add</span> Create User
        </button>
      </div>

      <div className="filter-bar">
        <input className="form-input" style={{ width: 250 }} placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} id="admin-search" />
        <select className="form-select" value={roleFilter} onChange={e => setRoleFilter(e.target.value)} id="admin-role-filter">
          <option value="">All Roles</option>
          <option value="student">Student</option>
          <option value="mentor">Mentor</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.7rem', color: 'var(--accent)' }}>
                      {getInitials(u.fullName)}
                    </div>
                    <span style={{ fontWeight: 600 }}>{u.fullName}</span>
                  </div>
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                <td>
                  <select className="form-select" style={{ width: 110, padding: '4px 8px', fontSize: '0.8rem' }} value={u.role} onChange={e => updateRole(u.id, e.target.value)}>
                    <option value="student">Student</option>
                    <option value="mentor">Mentor</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td>
                  <span className={`badge ${u.isActive ? 'badge-green' : 'badge-red'}`}>{u.isActive ? 'Active' : 'Inactive'}</span>
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{formatDate(u.createdAt)}</td>
                <td>
                  <button className={`btn btn-sm ${u.isActive ? 'btn-danger' : 'btn-primary'}`} onClick={() => toggleActive(u.id, u.isActive)}>
                    {u.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create User</h2>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowCreate(false)}><span className="material-icons-round">close</span></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group"><label>Full Name</label><input className="form-input" value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} required id="admin-create-name" /></div>
                <div className="form-group"><label>Email</label><input className="form-input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required id="admin-create-email" /></div>
                <div className="form-group"><label>Password</label><input className="form-input" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required minLength={6} id="admin-create-password" /></div>
                <div className="form-row">
                  <div className="form-group"><label>Role</label>
                    <select className="form-select" value={form.role} onChange={e => setForm({...form, role: e.target.value})} id="admin-create-role">
                      <option value="student">Student</option><option value="mentor">Mentor</option><option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="form-group"><label>Phone</label><input className="form-input" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} id="admin-create-phone" /></div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" id="admin-create-submit">Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
