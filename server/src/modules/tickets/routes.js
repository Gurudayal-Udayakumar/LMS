const express = require('express');
const { z } = require('zod');
const Ticket = require('../../models/Ticket');
const TicketMessage = require('../../models/TicketMessage');
const User = require('../../models/User');
const { authenticate, authorize } = require('../../middleware/auth');
const { createNotification } = require('../../utils/notifications');
const upload = require('../../middleware/upload');

const router = express.Router();
router.use(authenticate);

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.enum(['academic', 'technical', 'general']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
});

// Helper to format ticket for API response
function formatTicket(t) {
  const obj = t.toObject ? t.toObject() : { ...t };
  obj.id = obj._id;
  if (obj.studentId && typeof obj.studentId === 'object') {
    obj.student = { id: obj.studentId._id, fullName: obj.studentId.fullName, avatarUrl: obj.studentId.avatarUrl, email: obj.studentId.email };
  }
  if (obj.assignedTo && typeof obj.assignedTo === 'object') {
    obj.assignee = { id: obj.assignedTo._id, fullName: obj.assignedTo.fullName, avatarUrl: obj.assignedTo.avatarUrl };
  } else {
    obj.assignee = null;
  }
  delete obj.studentId; delete obj.assignedTo; delete obj._id; delete obj.__v;
  return obj;
}

// GET /api/tickets
router.get('/', async (req, res, next) => {
  try {
    const { status, category, priority, page = 1, limit = 20 } = req.query;
    const where = {};

    if (req.user.role === 'student') {
      where.studentId = req.user.id;
    } else if (req.user.role === 'mentor') {
      where.assignedTo = req.user.id;
    }
    if (status) where.status = status;
    if (category) where.category = category;
    if (priority) where.priority = priority;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const tickets = await Ticket.find(where)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('studentId', 'fullName avatarUrl')
      .populate('assignedTo', 'fullName avatarUrl')
      .lean();

    // Get message counts
    const ticketIds = tickets.map(t => t._id);
    const messageCounts = await TicketMessage.aggregate([
      { $match: { ticketId: { $in: ticketIds } } },
      { $group: { _id: '$ticketId', count: { $sum: 1 } } },
    ]);
    const msgCountMap = {};
    messageCounts.forEach(mc => { msgCountMap[mc._id.toString()] = mc.count; });

    const data = tickets.map(t => {
      const obj = { ...t, id: t._id };
      obj.student = t.studentId ? { id: t.studentId._id, fullName: t.studentId.fullName, avatarUrl: t.studentId.avatarUrl } : null;
      obj.assignee = t.assignedTo ? { id: t.assignedTo._id, fullName: t.assignedTo.fullName, avatarUrl: t.assignedTo.avatarUrl } : null;
      obj._count = { messages: msgCountMap[t._id.toString()] || 0 };
      delete obj.studentId; delete obj.assignedTo; delete obj._id; delete obj.__v;
      return obj;
    });

    res.json({
      data,
      nextCursor: data.length === parseInt(limit) ? data[data.length - 1].id : null,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/tickets
router.post('/', authorize('student'), async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    const ticket = await Ticket.create({
      studentId: req.user.id,
      ...data,
    });

    const populated = await Ticket.findById(ticket._id)
      .populate('studentId', 'fullName avatarUrl')
      .lean();
    const result = {
      ...populated,
      id: populated._id,
      student: populated.studentId ? { id: populated.studentId._id, fullName: populated.studentId.fullName, avatarUrl: populated.studentId.avatarUrl } : null,
    };
    delete result.studentId; delete result._id; delete result.__v;

    // Notify all mentors
    const io = req.app.get('io');
    const mentors = await User.find({ role: { $in: ['mentor', 'admin'] } }).select('_id');
    for (const mentor of mentors) {
      await createNotification({
        userId: mentor._id,
        title: 'New Support Ticket',
        message: `${req.user.fullName} created ticket: ${data.title}`,
        type: 'ticket',
        refId: ticket.id,
      }, io);
    }

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/tickets/:id
router.get('/:id', async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('studentId', 'fullName avatarUrl email')
      .populate('assignedTo', 'fullName avatarUrl')
      .lean();
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const messages = await TicketMessage.find({ ticketId: ticket._id })
      .sort({ createdAt: 1 })
      .populate('senderId', 'fullName avatarUrl role')
      .lean();

    const result = {
      ...ticket,
      id: ticket._id,
      student: ticket.studentId ? { id: ticket.studentId._id, fullName: ticket.studentId.fullName, avatarUrl: ticket.studentId.avatarUrl, email: ticket.studentId.email } : null,
      assignee: ticket.assignedTo ? { id: ticket.assignedTo._id, fullName: ticket.assignedTo.fullName, avatarUrl: ticket.assignedTo.avatarUrl } : null,
      messages: messages.map(m => ({
        ...m,
        id: m._id,
        sender: m.senderId ? { id: m.senderId._id, fullName: m.senderId.fullName, avatarUrl: m.senderId.avatarUrl, role: m.senderId.role } : null,
        senderId: undefined, _id: undefined, __v: undefined,
      })),
    };
    delete result.studentId; delete result.assignedTo; delete result._id; delete result.__v;

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/tickets/:id
router.patch('/:id', authorize('mentor', 'admin'), async (req, res, next) => {
  try {
    const updateSchema = z.object({
      status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
      assignedTo: z.string().optional(),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    });
    const data = updateSchema.parse(req.body);

    const ticket = await Ticket.findByIdAndUpdate(req.params.id, data, { new: true })
      .populate('studentId', 'fullName email')
      .lean();

    const result = {
      ...ticket,
      id: ticket._id,
      student: ticket.studentId ? { id: ticket.studentId._id, fullName: ticket.studentId.fullName, email: ticket.studentId.email } : null,
    };
    delete result.studentId; delete result._id; delete result.__v;

    const io = req.app.get('io');
    await createNotification({
      userId: ticket.studentId?._id || ticket.studentId,
      title: 'Ticket Updated',
      message: `Your ticket "${ticket.title}" has been updated`,
      type: 'ticket',
      refId: result.id,
    }, io);

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/tickets/:id/messages
router.post('/:id/messages', (req, res, next) => { req.uploadSubDir = 'tickets'; next(); }, upload.single('attachment'), async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const ticketMessage = await TicketMessage.create({
      ticketId: req.params.id,
      senderId: req.user.id,
      message,
      attachmentUrl: req.file ? `/uploads/tickets/${req.file.filename}` : null,
    });

    const populated = await TicketMessage.findById(ticketMessage._id)
      .populate('senderId', 'fullName avatarUrl role')
      .lean();

    const result = {
      ...populated,
      id: populated._id,
      sender: populated.senderId ? { id: populated.senderId._id, fullName: populated.senderId.fullName, avatarUrl: populated.senderId.avatarUrl, role: populated.senderId.role } : null,
    };
    delete result.senderId; delete result._id; delete result.__v;

    // Auto update ticket status
    if (ticket.status === 'open' && req.user.role !== 'student') {
      await Ticket.findByIdAndUpdate(req.params.id, { status: 'in_progress', assignedTo: req.user.id });
    }

    // Notify other party
    const io = req.app.get('io');
    const notifyUserId = req.user.id.toString() === ticket.studentId.toString() ? ticket.assignedTo : ticket.studentId;
    if (notifyUserId) {
      await createNotification({
        userId: notifyUserId,
        title: 'New Ticket Reply',
        message: `${req.user.fullName} replied to "${ticket.title}"`,
        type: 'ticket',
        refId: ticket.id,
      }, io);
    }

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
