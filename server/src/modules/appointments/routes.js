const express = require('express');
const { z } = require('zod');
const prisma = require('../../config/database');
const { authenticate, authorize } = require('../../middleware/auth');
const { createNotification } = require('../../utils/notifications');
const { sendEmail, emailTemplates } = require('../../utils/email');

const router = express.Router();
router.use(authenticate);

const createSchema = z.object({
  mentorId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  scheduledAt: z.string().datetime(),
  durationMin: z.number().int().min(15).max(120).optional(),
  meetingLink: z.string().url().optional().or(z.literal('')),
});

// GET /api/appointments
router.get('/', async (req, res, next) => {
  try {
    const { status, cursor, limit = 20 } = req.query;
    const where = {};

    if (req.user.role === 'student') {
      where.studentId = req.user.id;
    } else if (req.user.role === 'mentor') {
      where.mentorId = req.user.id;
    }
    if (status) where.status = status;

    const appointments = await prisma.appointment.findMany({
      where,
      take: parseInt(limit),
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { scheduledAt: 'asc' },
      include: {
        student: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
        mentor: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
      },
    });

    res.json({
      data: appointments,
      nextCursor: appointments.length === parseInt(limit) ? appointments[appointments.length - 1].id : null,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/appointments
router.post('/', authorize('student'), async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    const mentor = await prisma.user.findFirst({
      where: { id: data.mentorId, role: 'mentor', isActive: true },
    });
    if (!mentor) return res.status(404).json({ error: 'Mentor not found' });

    const appointment = await prisma.appointment.create({
      data: {
        studentId: req.user.id,
        mentorId: data.mentorId,
        title: data.title,
        description: data.description,
        scheduledAt: new Date(data.scheduledAt),
        durationMin: data.durationMin || 30,
        meetingLink: data.meetingLink || null,
      },
      include: {
        student: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
        mentor: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
      },
    });

    const io = req.app.get('io');
    await createNotification({
      userId: data.mentorId,
      title: 'New Appointment',
      message: `${req.user.fullName} booked an appointment: ${data.title}`,
      type: 'appointment',
      refId: appointment.id,
    }, io);

    const emailData = emailTemplates.appointmentBooked(appointment, mentor);
    sendEmail({ to: req.user.email, ...emailData });

    res.status(201).json(appointment);
  } catch (err) {
    next(err);
  }
});

// GET /api/appointments/:id
router.get('/:id', async (req, res, next) => {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: req.params.id },
      include: {
        student: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
        mentor: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
      },
    });
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
    res.json(appointment);
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

    const appointment = await prisma.appointment.update({
      where: { id: req.params.id },
      data,
      include: {
        student: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
        mentor: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
      },
    });

    if (data.status) {
      const io = req.app.get('io');
      const notifyUserId = req.user.id === appointment.studentId ? appointment.mentorId : appointment.studentId;
      await createNotification({
        userId: notifyUserId,
        title: 'Appointment Updated',
        message: `Appointment "${appointment.title}" is now ${data.status}`,
        type: 'appointment',
        refId: appointment.id,
      }, io);
    }

    res.json(appointment);
  } catch (err) {
    next(err);
  }
});

// GET /api/appointments/mentors/available
router.get('/mentors/available', async (req, res, next) => {
  try {
    const mentors = await prisma.user.findMany({
      where: { role: 'mentor', isActive: true },
      select: { id: true, fullName: true, email: true, avatarUrl: true, bio: true },
    });
    res.json(mentors);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
