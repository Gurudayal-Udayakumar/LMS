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
  description: z.string().min(1),
  instructions: z.string().optional(),
  dueDate: z.string().optional(),
  maxScore: z.number().int().min(1).max(1000).optional(),
  status: z.enum(['draft', 'published']).optional(),
});

// GET /api/tasks
router.get('/', async (req, res, next) => {
  try {
    const { status, cursor, limit = 20 } = req.query;
    const where = {};

    if (req.user.role === 'student') {
      where.status = 'published';
    } else if (req.user.role === 'mentor') {
      where.createdBy = req.user.id;
    }
    if (status && req.user.role !== 'student') where.status = status;

    const tasks = await prisma.task.findMany({
      where,
      take: parseInt(limit),
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        creator: { select: { id: true, fullName: true, avatarUrl: true } },
        _count: { select: { submissions: true } },
        ...(req.user.role === 'student' ? {
          submissions: {
            where: { studentId: req.user.id },
            select: { id: true, status: true, score: true },
          },
        } : {}),
      },
    });

    res.json({
      data: tasks,
      nextCursor: tasks.length === parseInt(limit) ? tasks[tasks.length - 1].id : null,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/tasks
router.post('/', authorize('mentor', 'admin'), (req, res, next) => { req.uploadSubDir = 'tasks'; next(); }, upload.single('attachment'), async (req, res, next) => {
  try {
    const data = createSchema.parse({
      ...req.body,
      maxScore: req.body.maxScore ? parseInt(req.body.maxScore) : undefined,
    });
    const task = await prisma.task.create({
      data: {
        createdBy: req.user.id,
        title: data.title,
        description: data.description,
        instructions: data.instructions,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        maxScore: data.maxScore || 100,
        attachmentUrl: req.file ? `/uploads/tasks/${req.file.filename}` : null,
        status: data.status || 'draft',
      },
      include: {
        creator: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    });

    // If published, notify students
    if (task.status === 'published') {
      const io = req.app.get('io');
      const students = await prisma.user.findMany({ where: { role: 'student', isActive: true }, select: { id: true } });
      for (const student of students) {
        await createNotification({
          userId: student.id,
          title: 'New Task',
          message: `New task published: ${task.title}`,
          type: 'task',
          refId: task.id,
        }, io);
      }
    }

    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
});

// GET /api/tasks/:id
router.get('/:id', async (req, res, next) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: {
        creator: { select: { id: true, fullName: true, avatarUrl: true } },
        _count: { select: { submissions: true } },
        ...(req.user.role === 'student' ? {
          submissions: {
            where: { studentId: req.user.id },
            include: { evaluator: { select: { id: true, fullName: true } } },
          },
        } : {}),
      },
    });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/tasks/:id
router.patch('/:id', authorize('mentor', 'admin'), async (req, res, next) => {
  try {
    const updateSchema = z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      instructions: z.string().optional(),
      dueDate: z.string().optional(),
      maxScore: z.number().int().optional(),
      status: z.enum(['draft', 'published', 'archived']).optional(),
    });
    const data = updateSchema.parse(req.body);
    if (data.dueDate) data.dueDate = new Date(data.dueDate);

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data,
      include: { creator: { select: { id: true, fullName: true } } },
    });
    res.json(task);
  } catch (err) {
    next(err);
  }
});

// POST /api/tasks/:id/submit
router.post('/:id/submit', authorize('student'), (req, res, next) => { req.uploadSubDir = 'submissions'; next(); }, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File is required' });

    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task || task.status !== 'published') return res.status(404).json({ error: 'Task not found or not accepting submissions' });

    const existing = await prisma.taskSubmission.findUnique({
      where: { taskId_studentId: { taskId: req.params.id, studentId: req.user.id } },
    });
    if (existing) return res.status(409).json({ error: 'You have already submitted this task' });

    const submission = await prisma.taskSubmission.create({
      data: {
        taskId: req.params.id,
        studentId: req.user.id,
        fileUrl: `/uploads/submissions/${req.file.filename}`,
        notes: req.body.notes,
      },
      include: {
        student: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    });

    const io = req.app.get('io');
    await createNotification({
      userId: task.createdBy,
      title: 'New Submission',
      message: `${req.user.fullName} submitted "${task.title}"`,
      type: 'task',
      refId: task.id,
    }, io);

    res.status(201).json(submission);
  } catch (err) {
    next(err);
  }
});

// GET /api/tasks/:id/submissions
router.get('/:id/submissions', authorize('mentor', 'admin'), async (req, res, next) => {
  try {
    const submissions = await prisma.taskSubmission.findMany({
      where: { taskId: req.params.id },
      orderBy: { submittedAt: 'desc' },
      include: {
        student: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
        evaluator: { select: { id: true, fullName: true } },
      },
    });
    res.json(submissions);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/submissions/:id/evaluate
router.patch('/submissions/:id/evaluate', authorize('mentor', 'admin'), async (req, res, next) => {
  try {
    const evalSchema = z.object({
      score: z.number().int().min(0),
      feedback: z.string().optional(),
      status: z.enum(['evaluated', 'returned']),
    });
    const data = evalSchema.parse(req.body);

    const submission = await prisma.taskSubmission.update({
      where: { id: req.params.id },
      data: {
        ...data,
        evaluatedBy: req.user.id,
        evaluatedAt: new Date(),
      },
      include: {
        student: { select: { id: true, fullName: true, email: true } },
        task: { select: { id: true, title: true, maxScore: true } },
      },
    });

    const io = req.app.get('io');
    await createNotification({
      userId: submission.studentId,
      title: 'Task Evaluated',
      message: `Your submission for "${submission.task.title}" has been graded: ${data.score}`,
      type: 'task',
      refId: submission.taskId,
    }, io);

    const emailData = emailTemplates.taskGraded(submission.task, submission);
    sendEmail({ to: submission.student.email, ...emailData });

    res.json(submission);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
