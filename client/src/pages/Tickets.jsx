import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import api from '../services/api';
import { formatDate, statusColor } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function Tickets() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', category: '' });
  const [form, setForm] = useState({ title: '', description: '', category: 'general', priority: 'medium' });

  useEffect(() => {
    document.getElementById('page-title').textContent = 'Support Tickets';
    loadTickets();
  }, [filter]);

  const loadTickets = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.status) params.append('status', filter.status);
      if (filter.category) params.append('category', filter.category);
      const res = await api.get(`/tickets?${params}`);
      setTickets(res.data.data);
    } catch {} finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/tickets', form);
      toast.success('Ticket created!');
      setShowModal(false);
      setForm({ title: '', description: '', category: 'general', priority: 'medium' });
      loadTickets();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: '1.2rem' }}>Support Tickets</h2>
        {user.role === 'student' && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)} id="create-ticket-btn">
            <span className="material-icons-round" style={{ fontSize: 18 }}>add</span> New Ticket
          </button>
        )}
      </div>

      <div className="filter-bar">
        <select className="form-select" value={filter.status} onChange={e => setFilter({...filter, status: e.target.value})} id="ticket-filter-status">
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select className="form-select" value={filter.category} onChange={e => setFilter({...filter, category: e.target.value})} id="ticket-filter-category">
          <option value="">All Categories</option>
          <option value="academic">Academic</option>
          <option value="technical">Technical</option>
          <option value="general">General</option>
        </select>
      </div>

      {tickets.length === 0 ? (
        <div className="empty-state">
          <span className="material-icons-round">confirmation_number</span>
          <h3>No tickets found</h3>
          <p>{user.role === 'student' ? 'Create a ticket to get help from mentors' : 'No tickets assigned to you'}</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Status</th>
                <th>{user.role === 'student' ? 'Assigned To' : 'Student'}</th>
                <th>Replies</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map(t => (
                <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/tickets/${t.id}`)}>
                  <td style={{ fontWeight: 600 }}>{t.title}</td>
                  <td><span className="badge badge-cyan">{t.category}</span></td>
                  <td><span className={`badge badge-${statusColor(t.priority)}`}>{t.priority}</span></td>
                  <td><span className={`badge badge-${statusColor(t.status)}`}>{t.status.replace('_', ' ')}</span></td>
                  <td style={{ color: 'var(--text-secondary)' }}>{user.role === 'student' ? (t.assignee?.fullName || 'Unassigned') : t.student?.fullName}</td>
                  <td>{t._count?.messages || 0}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{formatDate(t.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Ticket</h2>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowModal(false)}><span className="material-icons-round">close</span></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Title</label>
                  <input className="form-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Briefly describe your issue" required id="ticket-title" />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea className="form-textarea" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Provide details about your issue" required id="ticket-description" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Category</label>
                    <select className="form-select" value={form.category} onChange={e => setForm({...form, category: e.target.value})} id="ticket-category">
                      <option value="academic">Academic</option>
                      <option value="technical">Technical</option>
                      <option value="general">General</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Priority</label>
                    <select className="form-select" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} id="ticket-priority">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" id="ticket-submit">Create Ticket</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
