const jwt = require('jsonwebtoken');
const config = require('../config/env');
const prisma = require('../config/database');

function setupSocket(io) {
  // Auth middleware for socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, config.jwt.secret);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, fullName: true, role: true, avatarUrl: true },
      });
      if (!user) return next(new Error('User not found'));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] ${socket.user.fullName} connected`);

    // Join personal notification channel
    socket.join(`user:${socket.user.id}`);

    // Join a chat room
    socket.on('joinRoom', async (roomId) => {
      try {
        const member = await prisma.chatRoomMember.findUnique({
          where: { roomId_userId: { roomId, userId: socket.user.id } },
        });
        if (member) {
          socket.join(`room:${roomId}`);
          socket.emit('joinedRoom', roomId);
        }
      } catch (err) {
        socket.emit('error', 'Failed to join room');
      }
    });

    // Leave a chat room
    socket.on('leaveRoom', (roomId) => {
      socket.leave(`room:${roomId}`);
    });

    // Send a chat message
    socket.on('sendMessage', async (data) => {
      try {
        const { roomId, content, type = 'text', fileUrl } = data;

        // Verify membership
        const member = await prisma.chatRoomMember.findUnique({
          where: { roomId_userId: { roomId, userId: socket.user.id } },
        });
        if (!member) return socket.emit('error', 'Not a member of this room');

        const message = await prisma.chatMessage.create({
          data: {
            roomId,
            senderId: socket.user.id,
            content,
            type,
            fileUrl,
          },
          include: {
            sender: { select: { id: true, fullName: true, avatarUrl: true, role: true } },
          },
        });

        io.to(`room:${roomId}`).emit('newMessage', message);

        // Notify other members who are not in the room
        const members = await prisma.chatRoomMember.findMany({
          where: { roomId, userId: { not: socket.user.id } },
          select: { userId: true },
        });
        for (const m of members) {
          io.to(`user:${m.userId}`).emit('chatNotification', {
            roomId,
            message: `${socket.user.fullName}: ${content.substring(0, 50)}`,
          });
        }
      } catch (err) {
        socket.emit('error', 'Failed to send message');
      }
    });

    // Typing indicators
    socket.on('typing', (roomId) => {
      socket.to(`room:${roomId}`).emit('userTyping', {
        userId: socket.user.id,
        fullName: socket.user.fullName,
      });
    });

    socket.on('stopTyping', (roomId) => {
      socket.to(`room:${roomId}`).emit('userStoppedTyping', {
        userId: socket.user.id,
      });
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] ${socket.user.fullName} disconnected`);
    });
  });
}

module.exports = setupSocket;
