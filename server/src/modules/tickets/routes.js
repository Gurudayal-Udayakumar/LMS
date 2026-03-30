const express = require('express');
const { z } = require('zod');
const prisma = require('../../config/database');
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

// GET /api/tickets
router.get('/', async (req, res, next) => {
  try {
    const { status, category, priority, cursor, limit = 20 } = req.query;
    const where = {};

    if (req.user.role === 'student') {
      where.studentId = req.user.id;
    } else if (req.user.role === 'mentor') {
      where.assignedTo = req.user.id;
    }
    if (status) where.status = status;
    if (category) where.category = category;
    if (priority) where.priority = priority;

    const tickets = await prisma.ticket.findMany({
      where,
      take: parseInt(limit),
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        student: { select: { id: true, fullName: true, avatarUrl: true } },
        assignee: { select: { id: true, fullName: true, avatarUrl: true } },
        _count: { select: { messages: true } },
      },
    });

    res.json({
      data: tickets,
      nextCursor: tickets.length === parseInt(limit) ? tickets[tickets.length - 1].id : null,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/tickets
router.post('/', authorize('student'), async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    const ticket = await prisma.ticket.create({
      data: {
        studentId: req.user.id,
        ...data,
      },
      include: {
        student: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    });

    // Notify all mentors
    const io = req.app.get('io');
    const mentors = await prisma.user.findMany({ where: { role: { in: ['mentor', 'admin'] } }, select: { id: true } });
    for (const mentor of mentors) {
      await createNotification({
        userId: mentor.id,
        title: 'New Support Ticket',
        message: `${req.user.fullName} created ticket: ${data.title}`,
        type: 'ticket',
        refId: ticket.id,
      }, io);
    }

    res.status(201).json(ticket);
  } catch (err) {
    next(err);
  }
});

// GET /api/tickets/:id
router.get('/:id', async (req, res, next) => {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      include: {
        student: { select: { id: true, fullName: true, avatarUrl: true, email: true } },
        assignee: { select: { id: true, fullName: true, avatarUrl: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: { select: { id: true, fullName: true, avatarUrl: true, role: true } },
          },
        },
      },
    });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json(ticket);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/tickets/:id
router.patch('/:id', authorize('mentor', 'admin'), async (req, res, next) => {
  try {
    const updateSchema = z.object({
      status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
      assignedTo: z.string().uuid().optional(),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    });
    const data = updateSchema.parse(req.body);

    const ticket = await prisma.ticket.update({
      where: { id: req.params.id },
      data,
      include: { student: { select: { id: true, fullName: true, email: true } } },
    });

    const io = req.app.get('io');
    await createNotification({
      userId: ticket.studentId,
      title: 'Ticket Updated',
      message: `Your ticket "${ticket.title}" has been updated`,
      type: 'ticket',
      refId: ticket.id,
    }, io);

    res.json(ticket);
  } catch (err) {
    next(err);
  }
});

// POST /api/tickets/:id/messages
router.post('/:id/messages', (req, res, next) => { req.uploadSubDir = 'tickets'; next(); }, upload.single('attachment'), async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const ticketMessage = await prisma.ticketMessage.create({
      data: {
        ticketId: req.params.id,
        senderId: req.user.id,
        message,
        attachmentUrl: req.file ? `/uploads/tickets/${req.file.filename}` : null,
      },
      include: {
        sender: { select: { id: true, fullName: true, avatarUrl: true, role: true } },
      },
    });

    // Auto update ticket status
    if (ticket.status === 'open' && req.user.role !== 'student') {
      await prisma.ticket.update({
        where: { id: req.params.id },
        data: { status: 'in_progress', assignedTo: req.user.id },
      });
    }

    // Notify other party
    const io = req.app.get('io');
    const notifyUserId = req.user.id === ticket.studentId ? ticket.assignedTo : ticket.studentId;
    if (notifyUserId) {
      await createNotification({
        userId: notifyUserId,
        title: 'New Ticket Reply',
        message: `${req.user.fullName} replied to "${ticket.title}"`,
        type: 'ticket',
        refId: ticket.id,
      }, io);
    }

    res.status(201).json(ticketMessage);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
