import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import api from '../services/api';
import { formatDate, statusColor, getInitials } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function JobDetail() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [showApply, setShowApply] = useState(false);

  useEffect(() => {
    document.getElementById('page-title').textContent = 'Job Details';
    loadJob();
  }, [id]);

  const loadJob = async () => {
    try {
      const res = await api.get(`/jobs/${id}`);
      setJob(res.data);
      if (user.role !== 'student') {
        const apps = await api.get(`/jobs/${id}/applications`);
        setApplications(apps.data);
      }
    } catch { navigate('/jobs'); } finally { setLoading(false); }
  };

  const handleApply = async (e) => {
    e.preventDefault();
    if (!file) return toast.error('Resume required');
    const formData = new FormData();
    formData.append('resume', file);
    if (coverLetter) formData.append('coverLetter', coverLetter);
    try {
      await api.post(`/jobs/${id}/apply`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Application submitted!');
      setShowApply(false);
      loadJob();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;
  if (!job) return null;

  const applied = job.applications?.length > 0;

  return (
    <div style={{ maxWidth: 800 }}>
      <button className="btn btn-secondary btn-sm" onClick={() => navigate('/jobs')} style={{ marginBottom: 20 }}>
        <span className="material-icons-round" style={{ fontSize: 18 }}>arrow_back</span> Back to Jobs
      </button>

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <span className={`badge badge-${statusColor(job.type)}`}>{job.type.replace('_', ' ')}</span>
          {applied && <span className="badge badge-green">Applied ✓</span>}
        </div>
        <h2 style={{ fontSize: '1.4rem', marginBottom: 8 }}>{job.title}</h2>
        <p style={{ fontSize: '1.1rem', color: 'var(--accent-cyan)', fontWeight: 600, marginBottom: 16 }}>{job.company}</p>

        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 20, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          {job.location && <span><span className="material-icons-round" style={{ fontSize: 16, verticalAlign: 'middle' }}>location_on</span> {job.location}</span>}
          {job.salaryRange && <span><span className="material-icons-round" style={{ fontSize: 16, verticalAlign: 'middle' }}>payments</span> {job.salaryRange}</span>}
          {job.deadline && <span><span className="material-icons-round" style={{ fontSize: 16, verticalAlign: 'middle' }}>event</span> Deadline: {formatDate(job.deadline)}</span>}
        </div>

        <h3 style={{ fontSize: '1rem', marginBottom: 8 }}>Description</h3>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: 16 }}>{job.description}</p>

        {job.requirements && (
          <>
            <h3 style={{ fontSize: '1rem', marginBottom: 8 }}>Requirements</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: 16 }}>{job.requirements}</p>
          </>
        )}

        {user.role === 'student' && !applied && (
          <button className="btn btn-primary" onClick={() => setShowApply(true)} id="apply-job-btn">
            <span className="material-icons-round" style={{ fontSize: 18 }}>send</span> Apply Now
          </button>
        )}
      </div>

      {/* Mentor/Admin: Applications */}
      {user.role !== 'student' && (
        <div>
          <h3 style={{ fontSize: '1rem', marginBottom: 16 }}>Applications ({applications.length})</h3>
          {applications.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No applications yet</p>
          ) : (
            applications.map(a => (
              <div className="card" key={a.id} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', color: 'var(--accent)' }}>
                      {getInitials(a.student?.fullName)}
                    </div>
                    <div>
                      <p style={{ fontWeight: 600 }}>{a.student?.fullName}</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{a.student?.email} • Applied: {formatDate(a.appliedAt)}</p>
                    </div>
                  </div>
                  <span className={`badge badge-${statusColor(a.status)}`}>{a.status}</span>
                </div>
                {a.coverLetter && <p style={{ marginTop: 12, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{a.coverLetter}</p>}
                <a href={a.resumeUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-secondary" style={{ marginTop: 10 }}>
                  <span className="material-icons-round" style={{ fontSize: 16 }}>download</span> Download Resume
                </a>
              </div>
            ))
          )}
        </div>
      )}

      {showApply && (
        <div className="modal-overlay" onClick={() => setShowApply(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Apply for {job.title}</h2>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowApply(false)}><span className="material-icons-round">close</span></button>
            </div>
            <form onSubmit={handleApply}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Upload Resume</label>
                  <input className="form-input" type="file" onChange={e => setFile(e.target.files[0])} required id="job-resume" />
                </div>
                <div className="form-group">
                  <label>Cover Letter (optional)</label>
                  <textarea className="form-textarea" value={coverLetter} onChange={e => setCoverLetter(e.target.value)} placeholder="Why are you a good fit?" id="job-cover" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowApply(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" id="job-apply-submit">Submit Application</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
