import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import api from '../services/api';
import { formatDateTime, statusColor } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function Appointments() {
  const { user } = useAuthStore();
  const [appointments, setAppointments] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ mentorId: '', title: '', description: '', scheduledAt: '', durationMin: 30, meetingLink: '' });

  useEffect(() => {
    document.getElementById('page-title').textContent = 'Appointments';
    loadAppointments();
    if (user.role === 'student') loadMentors();
  }, []);

  const loadAppointments = async () => {
    try {
      const res = await api.get('/appointments');
      setAppointments(res.data.data);
    } catch {} finally { setLoading(false); }
  };

  const loadMentors = async () => {
    try {
      const res = await api.get('/appointments/mentors/available');
      setMentors(res.data);
    } catch {}
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/appointments', { ...form, durationMin: parseInt(form.durationMin), scheduledAt: new Date(form.scheduledAt).toISOString() });
      toast.success('Appointment booked!');
      setShowModal(false);
      setForm({ mentorId: '', title: '', description: '', scheduledAt: '', durationMin: 30, meetingLink: '' });
      loadAppointments();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to book'); }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/appointments/${id}`, { status });
      toast.success(`Appointment ${status}`);
      loadAppointments();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.2rem' }}>Your Appointments</h2>
        {user.role === 'student' && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)} id="book-appointment-btn">
            <span className="material-icons-round" style={{ fontSize: 18 }}>add</span> Book Appointment
          </button>
        )}
      </div>

      {appointments.length === 0 ? (
        <div className="empty-state">
          <span className="material-icons-round">calendar_month</span>
          <h3>No appointments yet</h3>
          <p>{user.role === 'student' ? 'Book your first appointment with a mentor' : 'No appointments scheduled'}</p>
        </div>
      ) : (
        <div className="card-grid">
          {appointments.map(a => (
            <div className="card" key={a.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span className={`badge badge-${statusColor(a.status)}`}>{a.status}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{a.durationMin}min</span>
              </div>
              <h3 style={{ fontSize: '1rem', marginBottom: 8 }}>{a.title}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
                {user.role === 'student' ? `Mentor: ${a.mentor?.fullName}` : `Student: ${a.student?.fullName}`}
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                <span className="material-icons-round" style={{ fontSize: 16, verticalAlign: 'middle' }}>schedule</span> {formatDateTime(a.scheduledAt)}
              </p>
              {a.meetingLink && (
                <a href={a.meetingLink} target="_blank" rel="noreferrer" className="btn btn-sm btn-secondary" style={{ marginBottom: 8 }}>
                  <span className="material-icons-round" style={{ fontSize: 16 }}>videocam</span> Join Meeting
                </a>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                {a.status === 'pending' && user.role === 'mentor' && (
                  <button className="btn btn-sm btn-primary" onClick={() => updateStatus(a.id, 'confirmed')}>Confirm</button>
                )}
                {(a.status === 'pending' || a.status === 'confirmed') && (
                  <button className="btn btn-sm btn-danger" onClick={() => updateStatus(a.id, 'cancelled')}>Cancel</button>
                )}
                {a.status === 'confirmed' && (
                  <button className="btn btn-sm btn-secondary" onClick={() => updateStatus(a.id, 'completed')}>Complete</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Book Appointment</h2>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowModal(false)}>
                <span className="material-icons-round">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Mentor</label>
                  <select className="form-select" value={form.mentorId} onChange={e => setForm({...form, mentorId: e.target.value})} required id="appt-mentor">
                    <option value="">Select a mentor</option>
                    {mentors.map(m => <option key={m.id} value={m.id}>{m.fullName}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Title</label>
                  <input className="form-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. React Hooks Review" required id="appt-title" />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea className="form-textarea" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="What would you like to discuss?" id="appt-description" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Date & Time</label>
                    <input className="form-input" type="datetime-local" value={form.scheduledAt} onChange={e => setForm({...form, scheduledAt: e.target.value})} required id="appt-date" />
                  </div>
                  <div className="form-group">
                    <label>Duration (min)</label>
                    <select className="form-select" value={form.durationMin} onChange={e => setForm({...form, durationMin: e.target.value})} id="appt-duration">
                      <option value={15}>15 min</option>
                      <option value={30}>30 min</option>
                      <option value={45}>45 min</option>
                      <option value={60}>60 min</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Meeting Link (optional)</label>
                  <input className="form-input" value={form.meetingLink} onChange={e => setForm({...form, meetingLink: e.target.value})} placeholder="https://meet.google.com/..." id="appt-link" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" id="appt-submit">Book Appointment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
