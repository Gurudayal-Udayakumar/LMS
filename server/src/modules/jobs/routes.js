const express = require('express');
const { z } = require('zod');
const prisma = require('../../config/database');
const { authenticate, authorize } = require('../../middleware/auth');
const { createNotification } = require('../../utils/notifications');
const { sendEmail, emailTemplates } = require('../../utils/email');
const upload = require('../../middleware/upload');

const router = express.Router();
router.use(authenticate);

const createSchema = z.object({
  title: z.string().min(1),
  company: z.string().min(1),
  location: z.string().optional(),
  type: z.enum(['full_time', 'part_time', 'internship', 'contract']).optional(),
  description: z.string().min(1),
  requirements: z.string().optional(),
  salaryRange: z.string().optional(),
  applyUrl: z.string().url().optional().or(z.literal('')),
  deadline: z.string().optional(),
});

// GET /api/jobs
router.get('/', async (req, res, next) => {
  try {
    const { type, cursor, limit = 20 } = req.query;
    const where = { isActive: true };
    if (type) where.type = type;

    // Admin/mentor can see their own posts
    if (req.user.role !== 'student' && req.query.mine === 'true') {
      where.postedBy = req.user.id;
      delete where.isActive;
    }

    const jobs = await prisma.jobPost.findMany({
      where,
      take: parseInt(limit),
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        poster: { select: { id: true, fullName: true, avatarUrl: true } },
        _count: { select: { applications: true } },
        ...(req.user.role === 'student' ? {
          applications: {
            where: { studentId: req.user.id },
            select: { id: true, status: true },
          },
        } : {}),
      },
    });

    res.json({
      data: jobs,
      nextCursor: jobs.length === parseInt(limit) ? jobs[jobs.length - 1].id : null,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/jobs
router.post('/', authorize('mentor', 'admin'), async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    const job = await prisma.jobPost.create({
      data: {
        postedBy: req.user.id,
        ...data,
        deadline: data.deadline ? new Date(data.deadline) : null,
        applyUrl: data.applyUrl || null,
      },
      include: {
        poster: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    });

    // Notify all students
    const io = req.app.get('io');
    const students = await prisma.user.findMany({ where: { role: 'student', isActive: true }, select: { id: true, email: true } });
    for (const student of students) {
      await createNotification({
        userId: student.id,
        title: 'New Job Posting',
        message: `${job.title} at ${job.company}`,
        type: 'job',
        refId: job.id,
      }, io);
    }

    res.status(201).json(job);
  } catch (err) {
    next(err);
  }
});

// GET /api/jobs/:id
router.get('/:id', async (req, res, next) => {
  try {
    const job = await prisma.jobPost.findUnique({
      where: { id: req.params.id },
      include: {
        poster: { select: { id: true, fullName: true, avatarUrl: true } },
        _count: { select: { applications: true } },
        ...(req.user.role === 'student' ? {
          applications: {
            where: { studentId: req.user.id },
            select: { id: true, status: true },
          },
        } : {}),
      },
    });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (err) {
    next(err);
  }
});

// POST /api/jobs/:id/apply
router.post('/:id/apply', authorize('student'), (req, res, next) => { req.uploadSubDir = 'resumes'; next(); }, upload.single('resume'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Resume file is required' });

    const job = await prisma.jobPost.findUnique({ where: { id: req.params.id } });
    if (!job || !job.isActive) return res.status(404).json({ error: 'Job not found or no longer active' });

    const existing = await prisma.jobApplication.findUnique({
      where: { jobId_studentId: { jobId: req.params.id, studentId: req.user.id } },
    });
    if (existing) return res.status(409).json({ error: 'Already applied' });

    const application = await prisma.jobApplication.create({
      data: {
        jobId: req.params.id,
        studentId: req.user.id,
        resumeUrl: `/uploads/resumes/${req.file.filename}`,
        coverLetter: req.body.coverLetter,
      },
    });

    const io = req.app.get('io');
    await createNotification({
      userId: job.postedBy,
      title: 'New Job Application',
      message: `${req.user.fullName} applied for "${job.title}"`,
      type: 'job',
      refId: job.id,
    }, io);

    res.status(201).json(application);
  } catch (err) {
    next(err);
  }
});

// GET /api/jobs/:id/applications
router.get('/:id/applications', authorize('mentor', 'admin'), async (req, res, next) => {
  try {
    const applications = await prisma.jobApplication.findMany({
      where: { jobId: req.params.id },
      orderBy: { appliedAt: 'desc' },
      include: {
        student: { select: { id: true, fullName: true, email: true, avatarUrl: true, phone: true } },
      },
    });
    res.json(applications);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/jobs/:id
router.patch('/:id', authorize('mentor', 'admin'), async (req, res, next) => {
  try {
    const updateSchema = z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      isActive: z.boolean().optional(),
    });
    const data = updateSchema.parse(req.body);
    const job = await prisma.jobPost.update({
      where: { id: req.params.id },
      data,
    });
    res.json(job);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
