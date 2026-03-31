const jwt = require('jsonwebtoken');
const config = require('../config/env');
const User = require('../models/User');
const ChatRoomMember = require('../models/ChatRoomMember');
const ChatMessage = require('../models/ChatMessage');

function setupSocket(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication required'));
      const decoded = jwt.verify(token, config.jwt.secret);
      const user = await User.findById(decoded.userId).select('fullName role avatarUrl');
      if (!user) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch (err) { next(new Error('Invalid token')); }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] ${socket.user.fullName} connected`);
    socket.join(`user:${socket.user.id}`);

    socket.on('joinRoom', async (roomId) => {
      try {
        const member = await ChatRoomMember.findOne({ roomId, userId: socket.user.id });
        if (member) { socket.join(`room:${roomId}`); socket.emit('joinedRoom', roomId); }
      } catch (err) { socket.emit('error', 'Failed to join room'); }
    });

    socket.on('leaveRoom', (roomId) => { socket.leave(`room:${roomId}`); });

    socket.on('sendMessage', async (data) => {
      try {
        const { roomId, content, type = 'text', fileUrl } = data;
        const member = await ChatRoomMember.findOne({ roomId, userId: socket.user.id });
        if (!member) return socket.emit('error', 'Not a member of this room');

        const message = await ChatMessage.create({ roomId, senderId: socket.user.id, content, type, fileUrl });
        const populated = await ChatMessage.findById(message._id)
          .populate('senderId', 'fullName avatarUrl role').lean();
        const result = {
          ...populated, id: populated._id,
          sender: populated.senderId ? { id: populated.senderId._id, fullName: populated.senderId.fullName, avatarUrl: populated.senderId.avatarUrl, role: populated.senderId.role } : null,
        };
        delete result.senderId; delete result._id; delete result.__v;

        io.to(`room:${roomId}`).emit('newMessage', result);

        const members = await ChatRoomMember.find({ roomId, userId: { $ne: socket.user.id } }).select('userId');
        for (const m of members) {
          io.to(`user:${m.userId}`).emit('chatNotification', {
            roomId, message: `${socket.user.fullName}: ${content.substring(0, 50)}`,
          });
        }
      } catch (err) { socket.emit('error', 'Failed to send message'); }
    });

    socket.on('typing', (roomId) => {
      socket.to(`room:${roomId}`).emit('userTyping', { userId: socket.user.id, fullName: socket.user.fullName });
    });
    socket.on('stopTyping', (roomId) => {
      socket.to(`room:${roomId}`).emit('userStoppedTyping', { userId: socket.user.id });
    });
    socket.on('disconnect', () => { console.log(`[Socket] ${socket.user.fullName} disconnected`); });
  });
}

module.exports = setupSocket;
