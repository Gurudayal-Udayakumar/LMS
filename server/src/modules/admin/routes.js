const express = require('express');
const { z } = require('zod');
const bcrypt = require('bcryptjs');
const User = require('../../models/User');
const Ticket = require('../../models/Ticket');
const Task = require('../../models/Task');
const JobPost = require('../../models/JobPost');
const Appointment = require('../../models/Appointment');
const { authenticate, authorize } = require('../../middleware/auth');

const router = express.Router();
router.use(authenticate);
router.use(authorize('admin'));

// GET /api/admin/users
router.get('/users', async (req, res, next) => {
  try {
    const { role, search, page = 1, limit = 30 } = req.query;
    const where = {};
    if (role) where.role = role;
    if (search) {
      where.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const users = await User.find(where)
      .sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit))
      .select('email fullName role phone isActive createdAt avatarUrl').lean();
    const total = await User.countDocuments(where);
    const data = users.map(u => ({ ...u, id: u._id, _id: undefined, __v: undefined }));
    res.json({ data, total });
  } catch (err) { next(err); }
});

// PATCH /api/admin/users/:id/role
router.patch('/users/:id/role', async (req, res, next) => {
  try {
    const schema = z.object({ role: z.enum(['student', 'mentor', 'admin']) });
    const data = schema.parse(req.body);
    const user = await User.findByIdAndUpdate(req.params.id, { role: data.role }, { new: true })
      .select('email fullName role').lean();
    res.json({ ...user, id: user._id });
  } catch (err) { next(err); }
});

// PATCH /api/admin/users/:id/status
router.patch('/users/:id/status', async (req, res, next) => {
  try {
    const schema = z.object({ isActive: z.boolean() });
    const data = schema.parse(req.body);
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: data.isActive }, { new: true })
      .select('email fullName isActive').lean();
    res.json({ ...user, id: user._id });
  } catch (err) { next(err); }
});

// POST /api/admin/users
router.post('/users', async (req, res, next) => {
  try {
    const schema = z.object({
      email: z.string().email(), password: z.string().min(6),
      fullName: z.string().min(2), role: z.enum(['student', 'mentor', 'admin']),
      phone: z.string().optional(),
    });
    const data = schema.parse(req.body);
    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await User.create({ email: data.email, passwordHash, fullName: data.fullName, role: data.role, phone: data.phone });
    res.status(201).json({ id: user.id, email: user.email, fullName: user.fullName, role: user.role, createdAt: user.createdAt });
  } catch (err) { next(err); }
});

// GET /api/admin/stats
router.get('/stats', async (req, res, next) => {
  try {
    const [userCount, ticketCount, taskCount, jobCount, openTickets, pendingAppointments] = await Promise.all([
      User.countDocuments(), Ticket.countDocuments(), Task.countDocuments(),
      JobPost.countDocuments(), Ticket.countDocuments({ status: 'open' }),
      Appointment.countDocuments({ status: 'pending' }),
    ]);
    const roleBreakdown = await User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]);
    res.json({
      users: userCount, tickets: ticketCount, tasks: taskCount, jobs: jobCount,
      openTickets, pendingAppointments,
      roleBreakdown: roleBreakdown.reduce((acc, r) => ({ ...acc, [r._id]: r.count }), {}),
    });
  } catch (err) { next(err); }
});

module.exports = router;
