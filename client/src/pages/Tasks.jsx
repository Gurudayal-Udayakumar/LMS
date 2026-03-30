import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import api from '../services/api';
import { formatDate, statusColor } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function Tasks() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', description: '', instructions: '', dueDate: '', maxScore: 100, status: 'published' });

  useEffect(() => {
    document.getElementById('page-title').textContent = 'Tasks';
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const res = await api.get('/tasks');
      setTasks(res.data.data);
    } catch {} finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) formData.append(k, v); });
      await api.post('/tasks', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Task created!');
      setShowModal(false);
      loadTasks();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.2rem' }}>Tasks</h2>
        {user.role !== 'student' && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)} id="create-task-btn">
            <span className="material-icons-round" style={{ fontSize: 18 }}>add</span> Create Task
          </button>
        )}
      </div>

      {tasks.length === 0 ? (
        <div className="empty-state">
          <span className="material-icons-round">assignment</span>
          <h3>No tasks available</h3>
          <p>{user.role === 'student' ? 'No tasks have been published yet' : 'Create your first task'}</p>
        </div>
      ) : (
        <div className="card-grid">
          {tasks.map(t => {
            const submission = t.submissions?.[0];
            return (
              <div className="card" key={t.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/tasks/${t.id}`)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span className={`badge badge-${statusColor(t.status)}`}>{t.status}</span>
                  {submission && <span className={`badge badge-${statusColor(submission.status)}`}>{submission.status.replace('_', ' ')}</span>}
                </div>
                <h3 style={{ fontSize: '1rem', marginBottom: 8 }}>{t.title}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{t.description}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <span>By {t.creator?.fullName}</span>
                  {t.dueDate && <span>Due: {formatDate(t.dueDate)}</span>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <span>Max Score: {t.maxScore}</span>
                  {user.role !== 'student' && <span>{t._count?.submissions || 0} submissions</span>}
                  {submission?.score != null && <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>Score: {submission.score}/{t.maxScore}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Task</h2>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowModal(false)}><span className="material-icons-round">close</span></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Title</label>
                  <input className="form-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required id="task-title" />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea className="form-textarea" value={form.description} onChange={e => setForm({...form, description: e.target.value})} required id="task-description" />
                </div>
                <div className="form-group">
                  <label>Instructions</label>
                  <textarea className="form-textarea" value={form.instructions} onChange={e => setForm({...form, instructions: e.target.value})} id="task-instructions" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Due Date</label>
                    <input className="form-input" type="datetime-local" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})} id="task-due" />
                  </div>
                  <div className="form-group">
                    <label>Max Score</label>
                    <input className="form-input" type="number" value={form.maxScore} onChange={e => setForm({...form, maxScore: e.target.value})} id="task-score" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select className="form-select" value={form.status} onChange={e => setForm({...form, status: e.target.value})} id="task-status">
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" id="task-submit">Create Task</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
