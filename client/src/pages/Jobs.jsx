import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import api from '../services/api';
import { formatDate, statusColor } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function Jobs() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', company: '', location: '', type: 'full_time', description: '', requirements: '', salaryRange: '', deadline: '' });

  useEffect(() => {
    document.getElementById('page-title').textContent = 'Job Board';
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try { const res = await api.get('/jobs'); setJobs(res.data.data); }
    catch {} finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/jobs', { ...form, deadline: form.deadline ? new Date(form.deadline).toISOString() : undefined });
      toast.success('Job posted!');
      setShowModal(false);
      setForm({ title: '', company: '', location: '', type: 'full_time', description: '', requirements: '', salaryRange: '', deadline: '' });
      loadJobs();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const typeIcons = { full_time: '💼', part_time: '⏰', internship: '🎓', contract: '📋' };

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.2rem' }}>Job Board</h2>
        {user.role !== 'student' && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)} id="post-job-btn">
            <span className="material-icons-round" style={{ fontSize: 18 }}>add</span> Post Job
          </button>
        )}
      </div>

      {jobs.length === 0 ? (
        <div className="empty-state">
          <span className="material-icons-round">work</span>
          <h3>No jobs posted yet</h3>
        </div>
      ) : (
        <div className="card-grid">
          {jobs.map(j => {
            const applied = j.applications?.length > 0;
            return (
              <div className="card" key={j.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/jobs/${j.id}`)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span className={`badge badge-${statusColor(j.type)}`}>{typeIcons[j.type]} {j.type.replace('_', ' ')}</span>
                  {applied && <span className="badge badge-green">Applied ✓</span>}
                </div>
                <h3 style={{ fontSize: '1.05rem', marginBottom: 6 }}>{j.title}</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--accent-cyan)', fontWeight: 600, marginBottom: 8 }}>{j.company}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {j.location && <span><span className="material-icons-round" style={{ fontSize: 14, verticalAlign: 'middle' }}>location_on</span> {j.location}</span>}
                  {j.salaryRange && <span><span className="material-icons-round" style={{ fontSize: 14, verticalAlign: 'middle' }}>payments</span> {j.salaryRange}</span>}
                  {j.deadline && <span><span className="material-icons-round" style={{ fontSize: 14, verticalAlign: 'middle' }}>event</span> Deadline: {formatDate(j.deadline)}</span>}
                </div>
                {user.role !== 'student' && (
                  <p style={{ marginTop: 8, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{j._count?.applications || 0} applications</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h2>Post a Job</h2>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowModal(false)}><span className="material-icons-round">close</span></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group"><label>Title</label><input className="form-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required id="job-title" /></div>
                  <div className="form-group"><label>Company</label><input className="form-input" value={form.company} onChange={e => setForm({...form, company: e.target.value})} required id="job-company" /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Location</label><input className="form-input" value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="e.g. Remote" id="job-location" /></div>
                  <div className="form-group"><label>Type</label>
                    <select className="form-select" value={form.type} onChange={e => setForm({...form, type: e.target.value})} id="job-type">
                      <option value="full_time">Full Time</option><option value="part_time">Part Time</option>
                      <option value="internship">Internship</option><option value="contract">Contract</option>
                    </select>
                  </div>
                </div>
                <div className="form-group"><label>Description</label><textarea className="form-textarea" value={form.description} onChange={e => setForm({...form, description: e.target.value})} required id="job-description" /></div>
                <div className="form-group"><label>Requirements</label><textarea className="form-textarea" value={form.requirements} onChange={e => setForm({...form, requirements: e.target.value})} id="job-requirements" /></div>
                <div className="form-row">
                  <div className="form-group"><label>Salary Range</label><input className="form-input" value={form.salaryRange} onChange={e => setForm({...form, salaryRange: e.target.value})} placeholder="e.g. ₹4L - ₹8L" id="job-salary" /></div>
                  <div className="form-group"><label>Deadline</label><input className="form-input" type="date" value={form.deadline} onChange={e => setForm({...form, deadline: e.target.value})} id="job-deadline" /></div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" id="job-submit">Post Job</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
