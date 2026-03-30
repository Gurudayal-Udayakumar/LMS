import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import api from '../services/api';
import { formatDateTime, statusColor, getInitials } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function TaskDetail() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState(null);
  const [notes, setNotes] = useState('');
  const [evalForm, setEvalForm] = useState({ score: '', feedback: '' });
  const [evalTarget, setEvalTarget] = useState(null);

  useEffect(() => {
    document.getElementById('page-title').textContent = 'Task Detail';
    loadTask();
  }, [id]);

  const loadTask = async () => {
    try {
      const res = await api.get(`/tasks/${id}`);
      setTask(res.data);
      if (user.role !== 'student') {
        const subs = await api.get(`/tasks/${id}/submissions`);
        setSubmissions(subs.data);
      }
    } catch { navigate('/tasks'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return toast.error('Please select a file');
    const formData = new FormData();
    formData.append('file', file);
    if (notes) formData.append('notes', notes);
    try {
      await api.post(`/tasks/${id}/submit`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Submitted!');
      setFile(null);
      setNotes('');
      loadTask();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handleEvaluate = async (subId) => {
    try {
      await api.patch(`/tasks/submissions/${subId}/evaluate`, {
        score: parseInt(evalForm.score),
        feedback: evalForm.feedback,
        status: 'evaluated',
      });
      toast.success('Evaluated!');
      setEvalTarget(null);
      setEvalForm({ score: '', feedback: '' });
      loadTask();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;
  if (!task) return null;

  const mySubmission = task.submissions?.[0];

  return (
    <div style={{ maxWidth: 900 }}>
      <button className="btn btn-secondary btn-sm" onClick={() => navigate('/tasks')} style={{ marginBottom: 20 }}>
        <span className="material-icons-round" style={{ fontSize: 18 }}>arrow_back</span> Back to Tasks
      </button>

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <span className={`badge badge-${statusColor(task.status)}`}>{task.status}</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Max Score: {task.maxScore}</span>
        </div>
        <h2 style={{ fontSize: '1.3rem', marginBottom: 12 }}>{task.title}</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.7 }}>{task.description}</p>
        {task.instructions && (
          <div style={{ background: 'var(--bg-input)', padding: 16, borderRadius: 'var(--radius-md)', marginBottom: 12, whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
            <strong style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>Instructions:</strong>
            {task.instructions}
          </div>
        )}
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          By {task.creator?.fullName} {task.dueDate && `• Due: ${formatDateTime(task.dueDate)}`}
        </div>
      </div>

      {/* Student Submission */}
      {user.role === 'student' && !mySubmission && task.status === 'published' && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: '1rem', marginBottom: 16 }}>Submit Your Work</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Upload File</label>
              <input className="form-input" type="file" onChange={e => setFile(e.target.files[0])} required id="task-file-upload" />
            </div>
            <div className="form-group">
              <label>Notes (optional)</label>
              <textarea className="form-textarea" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any comments about your submission" />
            </div>
            <button className="btn btn-primary" type="submit" id="task-submit-btn">
              <span className="material-icons-round" style={{ fontSize: 18 }}>upload</span> Submit
            </button>
          </form>
        </div>
      )}

      {user.role === 'student' && mySubmission && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: '1rem', marginBottom: 16 }}>Your Submission</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span className={`badge badge-${statusColor(mySubmission.status)}`}>{mySubmission.status.replace('_', ' ')}</span>
            {mySubmission.score != null && <span style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--accent-green)' }}>{mySubmission.score}/{task.maxScore}</span>}
          </div>
          <a href={mySubmission.fileUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-secondary">
            <span className="material-icons-round" style={{ fontSize: 16 }}>download</span> View Submission
          </a>
          {mySubmission.feedback && (
            <div style={{ marginTop: 12, background: 'var(--bg-input)', padding: 14, borderRadius: 'var(--radius-md)' }}>
              <strong style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Feedback:</strong>
              <p style={{ fontSize: '0.9rem', marginTop: 4 }}>{mySubmission.feedback}</p>
            </div>
          )}
        </div>
      )}

      {/* Mentor: Submissions List */}
      {user.role !== 'student' && (
        <div>
          <h3 style={{ fontSize: '1rem', marginBottom: 16 }}>Submissions ({submissions.length})</h3>
          {submissions.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No submissions yet</p>
          ) : (
            submissions.map(s => (
              <div className="card" key={s.id} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="avatar" style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', color: 'var(--accent)' }}>
                      {getInitials(s.student?.fullName)}
                    </div>
                    <div>
                      <p style={{ fontWeight: 600 }}>{s.student?.fullName}</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Submitted: {formatDateTime(s.submittedAt)}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className={`badge badge-${statusColor(s.status)}`}>{s.status.replace('_', ' ')}</span>
                    {s.score != null && <span style={{ fontWeight: 700, color: 'var(--accent-green)' }}>{s.score}/{task.maxScore}</span>}
                  </div>
                </div>
                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                  <a href={s.fileUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-secondary">
                    <span className="material-icons-round" style={{ fontSize: 16 }}>download</span> Download
                  </a>
                  {s.status !== 'evaluated' && (
                    <button className="btn btn-sm btn-primary" onClick={() => { setEvalTarget(s.id); setEvalForm({ score: '', feedback: '' }); }}>Evaluate</button>
                  )}
                </div>

                {evalTarget === s.id && (
                  <div style={{ marginTop: 16, padding: 16, background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Score (out of {task.maxScore})</label>
                        <input className="form-input" type="number" min="0" max={task.maxScore} value={evalForm.score} onChange={e => setEvalForm({...evalForm, score: e.target.value})} required />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Feedback</label>
                      <textarea className="form-textarea" value={evalForm.feedback} onChange={e => setEvalForm({...evalForm, feedback: e.target.value})} />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-primary btn-sm" onClick={() => handleEvaluate(s.id)}>Save Evaluation</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => setEvalTarget(null)}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
