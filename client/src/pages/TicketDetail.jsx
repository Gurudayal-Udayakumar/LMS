import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import api from '../services/api';
import { formatDateTime, statusColor, getInitials } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function TicketDetail() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.getElementById('page-title').textContent = 'Ticket Detail';
    loadTicket();
  }, [id]);

  const loadTicket = async () => {
    try {
      const res = await api.get(`/tickets/${id}`);
      setTicket(res.data);
    } catch { navigate('/tickets'); } finally { setLoading(false); }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    try {
      await api.post(`/tickets/${id}/messages`, { message });
      setMessage('');
      toast.success('Reply sent');
      loadTicket();
    } catch (err) { toast.error('Failed to send'); }
  };

  const updateStatus = async (status) => {
    try {
      await api.patch(`/tickets/${id}`, { status });
      toast.success(`Ticket ${status.replace('_', ' ')}`);
      loadTicket();
    } catch {}
  };

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;
  if (!ticket) return null;

  return (
    <div style={{ maxWidth: 800 }}>
      <button className="btn btn-secondary btn-sm" onClick={() => navigate('/tickets')} style={{ marginBottom: 20 }}>
        <span className="material-icons-round" style={{ fontSize: 18 }}>arrow_back</span> Back to Tickets
      </button>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', marginBottom: 8 }}>{ticket.title}</h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span className={`badge badge-${statusColor(ticket.status)}`}>{ticket.status.replace('_', ' ')}</span>
              <span className={`badge badge-${statusColor(ticket.priority)}`}>{ticket.priority}</span>
              <span className="badge badge-cyan">{ticket.category}</span>
            </div>
          </div>
          {user.role !== 'student' && (
            <div style={{ display: 'flex', gap: 8 }}>
              {ticket.status !== 'resolved' && <button className="btn btn-sm btn-primary" onClick={() => updateStatus('resolved')}>Resolve</button>}
              {ticket.status !== 'closed' && <button className="btn btn-sm btn-secondary" onClick={() => updateStatus('closed')}>Close</button>}
            </div>
          )}
        </div>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>{ticket.description}</p>
        <div style={{ marginTop: 12, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Created by {ticket.student?.fullName} • {formatDateTime(ticket.createdAt)}
          {ticket.assignee && ` • Assigned to ${ticket.assignee.fullName}`}
        </div>
      </div>

      <h3 style={{ fontSize: '1rem', marginBottom: 16 }}>Conversation ({ticket.messages?.length || 0})</h3>

      <div className="ticket-thread">
        {ticket.messages?.map(m => (
          <div className="thread-message" key={m.id}>
            <div className="avatar" style={{ width: 36, height: 36, borderRadius: '50%', background: m.sender?.role !== 'student' ? 'linear-gradient(135deg, var(--accent), var(--accent-cyan))' : 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', color: m.sender?.role !== 'student' ? 'white' : 'var(--accent)', flexShrink: 0 }}>
              {getInitials(m.sender?.fullName)}
            </div>
            <div className="msg-content">
              <div className="msg-header">
                <span className="author">{m.sender?.fullName}</span>
                <span className={`badge badge-${m.sender?.role === 'student' ? 'green' : 'purple'} role-badge`}>{m.sender?.role}</span>
                <span className="time">{formatDateTime(m.createdAt)}</span>
              </div>
              <div className="msg-body">{m.message}</div>
              {m.attachmentUrl && (
                <a href={m.attachmentUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-secondary" style={{ marginTop: 8 }}>
                  <span className="material-icons-round" style={{ fontSize: 16 }}>attachment</span> View Attachment
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {ticket.status !== 'closed' && (
        <form onSubmit={sendMessage} style={{ marginTop: 20 }}>
          <div className="form-group">
            <textarea className="form-textarea" value={message} onChange={e => setMessage(e.target.value)} placeholder="Type your reply..." required id="ticket-reply-input" />
          </div>
          <button className="btn btn-primary" type="submit" id="ticket-reply-submit">
            <span className="material-icons-round" style={{ fontSize: 18 }}>send</span> Send Reply
          </button>
        </form>
      )}
    </div>
  );
}
