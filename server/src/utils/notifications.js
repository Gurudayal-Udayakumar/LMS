const Notification = require('../models/Notification');

const createNotification = async ({ userId, title, message, type, refId }, io) => {
  const notification = await Notification.create({ userId, title, message, type, refId });
  if (io) {
    io.to(`user:${userId}`).emit('notification', { ...notification.toObject(), id: notification._id });
  }
  return notification;
};

module.exports = { createNotification };
