const express = require('express');
const { z } = require('zod');
const bcrypt = require('bcryptjs');
const prisma = require('../../config/database');
const { authenticate, authorize } = require('../../middleware/auth');

const router = express.Router();
router.use(authenticate);
router.use(authorize('admin'));

// GET /api/admin/users
router.get('/users', async (req, res, next) => {
  try {
    const { role, search, cursor, limit = 30 } = req.query;
    const where = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      take: parseInt(limit),
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, email: true, fullName: true, role: true,
        phone: true, isActive: true, createdAt: true, avatarUrl: true,
      },
    });

    const total = await prisma.user.count({ where });
    res.json({ data: users, total });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/users/:id/role
router.patch('/users/:id/role', async (req, res, next) => {
  try {
    const schema = z.object({ role: z.enum(['student', 'mentor', 'admin']) });
    const data = schema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role: data.role },
      select: { id: true, email: true, fullName: true, role: true },
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/users/:id/status
router.patch('/users/:id/status', async (req, res, next) => {
  try {
    const schema = z.object({ isActive: z.boolean() });
    const data = schema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: data.isActive },
      select: { id: true, email: true, fullName: true, isActive: true },
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/users — Create user with specific role
router.post('/users', async (req, res, next) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(6),
      fullName: z.string().min(2),
      role: z.enum(['student', 'mentor', 'admin']),
      phone: z.string().optional(),
    });
    const data = schema.parse(req.body);
    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        fullName: data.fullName,
        role: data.role,
        phone: data.phone,
      },
      select: { id: true, email: true, fullName: true, role: true, createdAt: true },
    });
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/stats — Dashboard statistics
router.get('/stats', async (req, res, next) => {
  try {
    const [userCount, ticketCount, taskCount, jobCount, openTickets, pendingAppointments] = await Promise.all([
      prisma.user.count(),
      prisma.ticket.count(),
      prisma.task.count(),
      prisma.jobPost.count(),
      prisma.ticket.count({ where: { status: 'open' } }),
      prisma.appointment.count({ where: { status: 'pending' } }),
    ]);

    const roleBreakdown = await prisma.user.groupBy({
      by: ['role'],
      _count: { id: true },
    });

    res.json({
      users: userCount,
      tickets: ticketCount,
      tasks: taskCount,
      jobs: jobCount,
      openTickets,
      pendingAppointments,
      roleBreakdown: roleBreakdown.reduce((acc, r) => ({ ...acc, [r.role]: r._count.id }), {}),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
