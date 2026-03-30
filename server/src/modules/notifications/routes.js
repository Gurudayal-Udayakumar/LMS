const express = require('express');
const prisma = require('../../config/database');
const { authenticate } = require('../../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/notifications
router.get('/', async (req, res, next) => {
  try {
    const { cursor, limit = 20 } = req.query;
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      take: parseInt(limit),
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: 'desc' },
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: req.user.id, isRead: false },
    });

    res.json({ data: notifications, unreadCount });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', async (req, res, next) => {
  try {
    await prisma.notification.update({
      where: { id: req.params.id, userId: req.user.id },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
