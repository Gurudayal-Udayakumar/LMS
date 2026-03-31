const express = require('express');
const { z } = require('zod');
const Appointment = require('../../models/Appointment');
const User = require('../../models/User');
const { authenticate, authorize } = require('../../middleware/auth');
const { createNotification } = require('../../utils/notifications');
const { sendEmail, emailTemplates } = require('../../utils/email');

const router = express.Router();
router.use(authenticate);

const createSchema = z.object({
  mentorId: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  scheduledAt: z.string().datetime(),
  durationMin: z.number().int().min(15).max(120).optional(),
  meetingLink: z.string().url().optional().or(z.literal('')),
});

// GET /api/appointments
router.get('/', async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const where = {};

    if (req.user.role === 'student') {
      where.studentId = req.user.id;
    } else if (req.user.role === 'mentor') {
      where.mentorId = req.user.id;
    }
    if (status) where.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const appointments = await Appointment.find(where)
      .sort({ scheduledAt: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('studentId', 'fullName email avatarUrl')
      .populate('mentorId', 'fullName email avatarUrl')
      .lean();

    // Map populated fields to match expected API shape
    const data = appointments.map(a => ({
      ...a,
      id: a._id,
      student: a.studentId ? { id: a.studentId._id, fullName: a.studentId.fullName, email: a.studentId.email, avatarUrl: a.studentId.avatarUrl } : null,
      mentor: a.mentorId ? { id: a.mentorId._id, fullName: a.mentorId.fullName, email: a.mentorId.email, avatarUrl: a.mentorId.avatarUrl } : null,
    }));
    // Remove raw populated refs
    data.forEach(d => { delete d.studentId; delete d.mentorId; delete d._id; delete d.__v; });

    res.json({
      data,
      nextCursor: data.length === parseInt(limit) ? data[data.length - 1].id : null,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/appointments
router.post('/', authorize('student'), async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    const mentor = await User.findOne({ _id: data.mentorId, role: 'mentor', isActive: true });
    if (!mentor) return res.status(404).json({ error: 'Mentor not found' });

    const appointment = await Appointment.create({
      studentId: req.user.id,
      mentorId: data.mentorId,
      title: data.title,
      description: data.description,
      scheduledAt: new Date(data.scheduledAt),
      durationMin: data.durationMin || 30,
      meetingLink: data.meetingLink || null,
    });

    const populated = await Appointment.findById(appointment._id)
      .populate('studentId', 'fullName email avatarUrl')
      .populate('mentorId', 'fullName email avatarUrl')
      .lean();

    const result = {
      ...populated,
      id: populated._id,
      student: populated.studentId ? { id: populated.studentId._id, fullName: populated.studentId.fullName, email: populated.studentId.email, avatarUrl: populated.studentId.avatarUrl } : null,
      mentor: populated.mentorId ? { id: populated.mentorId._id, fullName: populated.mentorId.fullName, email: populated.mentorId.email, avatarUrl: populated.mentorId.avatarUrl } : null,
    };
    delete result.studentId; delete result.mentorId; delete result._id; delete result.__v;

    const io = req.app.get('io');
    await createNotification({
      userId: data.mentorId,
      title: 'New Appointment',
      message: `${req.user.fullName} booked an appointment: ${data.title}`,
      type: 'appointment',
      refId: appointment.id,
    }, io);

    const emailData = emailTemplates.appointmentBooked(result, mentor);
    sendEmail({ to: req.user.email, ...emailData });

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/appointments/:id
router.get('/:id', async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('studentId', 'fullName email avatarUrl')
      .populate('mentorId', 'fullName email avatarUrl')
      .lean();
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

    const result = {
      ...appointment,
      id: appointment._id,
      student: appointment.studentId ? { id: appointment.studentId._id, fullName: appointment.studentId.fullName, email: appointment.studentId.email, avatarUrl: appointment.studentId.avatarUrl } : null,
      mentor: appointment.mentorId ? { id: appointment.mentorId._id, fullName: appointment.mentorId.fullName, email: appointment.mentorId.email, avatarUrl: appointment.mentorId.avatarUrl } : null,
    };
    delete result.studentId; delete result.mentorId; delete result._id; delete result.__v;

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/appointments/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const updateSchema = z.object({
      status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']).optional(),
      meetingLink: z.string().optional(),
      notes: z.string().optional(),
    });
    const data = updateSchema.parse(req.body);

    const appointment = await Appointment.findByIdAndUpdate(req.params.id, data, { new: true })
      .populate('studentId', 'fullName email avatarUrl')
      .populate('mentorId', 'fullName email avatarUrl')
      .lean();

    const result = {
      ...appointment,
      id: appointment._id,
      student: appointment.studentId ? { id: appointment.studentId._id, fullName: appointment.studentId.fullName, email: appointment.studentId.email, avatarUrl: appointment.studentId.avatarUrl } : null,
      mentor: appointment.mentorId ? { id: appointment.mentorId._id, fullName: appointment.mentorId.fullName, email: appointment.mentorId.email, avatarUrl: appointment.mentorId.avatarUrl } : null,
    };
    delete result.studentId; delete result.mentorId; delete result._id; delete result.__v;

    if (data.status) {
      const io = req.app.get('io');
      const notifyUserId = req.user.id.toString() === result.student?.id?.toString() ? result.mentor?.id : result.student?.id;
      await createNotification({
        userId: notifyUserId,
        title: 'Appointment Updated',
        message: `Appointment "${result.title}" is now ${data.status}`,
        type: 'appointment',
        refId: result.id,
      }, io);
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/appointments/mentors/available
router.get('/mentors/available', async (req, res, next) => {
  try {
    const mentors = await User.find({ role: 'mentor', isActive: true })
      .select('fullName email avatarUrl bio')
      .lean();
    const data = mentors.map(m => ({ id: m._id, fullName: m.fullName, email: m.email, avatarUrl: m.avatarUrl, bio: m.bio }));
    res.json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
