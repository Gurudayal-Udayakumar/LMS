const express = require('express');
const Notification = require('../../models/Notification');
const { authenticate } = require('../../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/notifications
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean();
    const unreadCount = await Notification.countDocuments({ userId: req.user.id, isRead: false });
    const data = notifications.map(n => ({ ...n, id: n._id, _id: undefined, __v: undefined }));
    res.json({ data, unreadCount });
  } catch (err) { next(err); }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', async (req, res, next) => {
  try {
    await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { isRead: true });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', async (req, res, next) => {
  try {
    await Notification.updateMany({ userId: req.user.id, isRead: false }, { isRead: true });
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
