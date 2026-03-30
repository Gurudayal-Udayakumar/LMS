import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import api from '../services/api';
import { getSocket, connectSocket } from '../socket';
import { getInitials, formatTime } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function Chat() {
  const { user } = useAuthStore();
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [users, setUsers] = useState([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    document.getElementById('page-title').textContent = 'Chat';
    loadRooms();
    loadUsers();

    const token = localStorage.getItem('token');
    const socket = connectSocket(token);

    socket.on('newMessage', (msg) => {
      setMessages(prev => [...prev, msg]);
      scrollToBottom();
    });

    socket.on('chatNotification', (data) => {
      toast(data.message, { icon: '💬' });
    });

    return () => {
      socket.off('newMessage');
      socket.off('chatNotification');
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const loadRooms = async () => {
    try {
      const res = await api.get('/chat/rooms');
      setRooms(res.data);
    } catch {}
  };

  const loadUsers = async () => {
    try {
      const res = await api.get('/admin/users').catch(() => null);
      if (res) setUsers(res.data.data || []);
    } catch {}
  };

  const joinRoom = async (room) => {
    const socket = getSocket();
    if (activeRoom) socket?.emit('leaveRoom', activeRoom.id);

    setActiveRoom(room);
    socket?.emit('joinRoom', room.id);

    try {
      const res = await api.get(`/chat/rooms/${room.id}/messages`);
      setMessages(res.data.data);
      scrollToBottom();
    } catch {}
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim() || !activeRoom) return;

    const socket = getSocket();
    socket?.emit('sendMessage', {
      roomId: activeRoom.id,
      content: input.trim(),
    });
    setInput('');
  };

  const createDirectChat = async (userId) => {
    try {
      const res = await api.post('/chat/rooms', { memberIds: [userId] });
      setShowNewChat(false);
      loadRooms();
      joinRoom(res.data);
    } catch (err) { toast.error('Failed to create chat'); }
  };

  const getRoomName = (room) => {
    if (room.name) return room.name;
    const other = room.members?.find(m => m.user.id !== user.id);
    return other?.user?.fullName || 'Chat';
  };

  const getRoomInitials = (room) => {
    if (room.name) return room.name[0].toUpperCase();
    const other = room.members?.find(m => m.user.id !== user.id);
    return getInitials(other?.user?.fullName);
  };

  return (
    <div className="chat-layout">
      <div className="chat-sidebar">
        <div className="chat-sidebar-header">
          <strong style={{ fontSize: '0.95rem' }}>Messages</strong>
          <button className="btn btn-sm btn-primary" onClick={() => setShowNewChat(true)} id="new-chat-btn">
            <span className="material-icons-round" style={{ fontSize: 16 }}>add</span>
          </button>
        </div>
        <div className="chat-room-list">
          {rooms.map(room => (
            <div key={room.id} className={`chat-room-item${activeRoom?.id === room.id ? ' active' : ''}`} onClick={() => joinRoom(room)}>
              <div className="room-avatar">{getRoomInitials(room)}</div>
              <div className="room-info">
                <div className="room-name">{getRoomName(room)}</div>
                <div className="room-last-msg">
                  {room.lastMessage ? `${room.lastMessage.sender?.fullName}: ${room.lastMessage.content}` : 'No messages yet'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="chat-main">
        {activeRoom ? (
          <>
            <div className="chat-main-header">
              <div className="room-avatar" style={{ width: 36, height: 36, fontSize: '0.8rem', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--accent-cyan))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'white' }}>
                {getRoomInitials(activeRoom)}
              </div>
              <div>
                <h3 style={{ fontSize: '1rem' }}>{getRoomName(activeRoom)}</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{activeRoom.type === 'group' ? `${activeRoom.members?.length} members` : 'Direct message'}</p>
              </div>
            </div>
            <div className="chat-messages">
              {messages.map(m => (
                <div key={m.id} className={`chat-message${m.sender?.id === user.id ? ' own' : ''}`}>
                  <div className="msg-avatar">{getInitials(m.sender?.fullName)}</div>
                  <div className="msg-bubble">
                    {m.sender?.id !== user.id && <div className="msg-sender">{m.sender?.fullName}</div>}
                    <div className="msg-text">{m.content}</div>
                    <div className="msg-time">{formatTime(m.createdAt)}</div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <form className="chat-input-bar" onSubmit={sendMessage}>
              <input value={input} onChange={e => setInput(e.target.value)} placeholder="Type a message..." id="chat-message-input" />
              <button className="btn btn-primary" type="submit" id="chat-send-btn">
                <span className="material-icons-round" style={{ fontSize: 20 }}>send</span>
              </button>
            </form>
          </>
        ) : (
          <div className="chat-empty">
            <span className="material-icons-round">forum</span>
            <h3>Select a conversation</h3>
            <p>Choose a chat from the sidebar or start a new one</p>
          </div>
        )}
      </div>

      {showNewChat && (
        <div className="modal-overlay" onClick={() => setShowNewChat(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Conversation</h2>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowNewChat(false)}><span className="material-icons-round">close</span></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>Select a user to start a conversation:</p>
              {users.filter(u => u.id !== user.id).map(u => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => createDirectChat(u.id)}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', color: 'var(--accent)' }}>
                    {getInitials(u.fullName)}
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{u.fullName}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.role} • {u.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
