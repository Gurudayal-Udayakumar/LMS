const prisma = require('../config/database');

const createNotification = async ({ userId, title, message, type, refId }, io) => {
  const notification = await prisma.notification.create({
    data: { userId, title, message, type, refId },
  });

  // Push real-time notification via Socket.io
  if (io) {
    io.to(`user:${userId}`).emit('notification', notification);
  }

  return notification;
};

module.exports = { createNotification };
