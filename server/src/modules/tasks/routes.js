const express = require('express');
const { z } = require('zod');
const Task = require('../../models/Task');
const TaskSubmission = require('../../models/TaskSubmission');
const User = require('../../models/User');
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
    const { status, page = 1, limit = 20 } = req.query;
    const where = {};

    if (req.user.role === 'student') {
      where.status = 'published';
    } else if (req.user.role === 'mentor') {
      where.createdBy = req.user.id;
    }
    if (status && req.user.role !== 'student') where.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const tasks = await Task.find(where)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('createdBy', 'fullName avatarUrl')
      .lean();

    // Get submission counts
    const taskIds = tasks.map(t => t._id);
    const subCounts = await TaskSubmission.aggregate([
      { $match: { taskId: { $in: taskIds } } },
      { $group: { _id: '$taskId', count: { $sum: 1 } } },
    ]);
    const subCountMap = {};
    subCounts.forEach(sc => { subCountMap[sc._id.toString()] = sc.count; });

    // Get student submissions if student
    let studentSubmissions = {};
    if (req.user.role === 'student') {
      const subs = await TaskSubmission.find({ taskId: { $in: taskIds }, studentId: req.user.id })
        .select('taskId status score')
        .lean();
      subs.forEach(s => { studentSubmissions[s.taskId.toString()] = { id: s._id, status: s.status, score: s.score }; });
    }

    const data = tasks.map(t => {
      const obj = { ...t, id: t._id };
      obj.creator = t.createdBy ? { id: t.createdBy._id, fullName: t.createdBy.fullName, avatarUrl: t.createdBy.avatarUrl } : null;
      obj._count = { submissions: subCountMap[t._id.toString()] || 0 };
      if (req.user.role === 'student') {
        const sub = studentSubmissions[t._id.toString()];
        obj.submissions = sub ? [sub] : [];
      }
      delete obj.createdBy; delete obj._id; delete obj.__v;
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

// POST /api/tasks
router.post('/', authorize('mentor', 'admin'), (req, res, next) => { req.uploadSubDir = 'tasks'; next(); }, upload.single('attachment'), async (req, res, next) => {
  try {
    const data = createSchema.parse({
      ...req.body,
      maxScore: req.body.maxScore ? parseInt(req.body.maxScore) : undefined,
    });
    const task = await Task.create({
      createdBy: req.user.id,
      title: data.title,
      description: data.description,
      instructions: data.instructions,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      maxScore: data.maxScore || 100,
      attachmentUrl: req.file ? `/uploads/tasks/${req.file.filename}` : null,
      status: data.status || 'draft',
    });

    const populated = await Task.findById(task._id)
      .populate('createdBy', 'fullName avatarUrl')
      .lean();
    const result = {
      ...populated,
      id: populated._id,
      creator: populated.createdBy ? { id: populated.createdBy._id, fullName: populated.createdBy.fullName, avatarUrl: populated.createdBy.avatarUrl } : null,
    };
    delete result.createdBy; delete result._id; delete result.__v;

    // If published, notify students
    if (task.status === 'published') {
      const io = req.app.get('io');
      const students = await User.find({ role: 'student', isActive: true }).select('_id');
      for (const student of students) {
        await createNotification({
          userId: student._id,
          title: 'New Task',
          message: `New task published: ${task.title}`,
          type: 'task',
          refId: task.id,
        }, io);
      }
    }

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/tasks/:id
router.get('/:id', async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('createdBy', 'fullName avatarUrl')
      .lean();
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const submissionCount = await TaskSubmission.countDocuments({ taskId: task._id });

    const result = {
      ...task,
      id: task._id,
      creator: task.createdBy ? { id: task.createdBy._id, fullName: task.createdBy.fullName, avatarUrl: task.createdBy.avatarUrl } : null,
      _count: { submissions: submissionCount },
    };
    delete result.createdBy; delete result._id; delete result.__v;

    if (req.user.role === 'student') {
      const subs = await TaskSubmission.find({ taskId: task._id, studentId: req.user.id })
        .populate('evaluatedBy', 'fullName')
        .lean();
      result.submissions = subs.map(s => ({
        ...s,
        id: s._id,
        evaluator: s.evaluatedBy ? { id: s.evaluatedBy._id, fullName: s.evaluatedBy.fullName } : null,
        evaluatedBy: undefined, _id: undefined, __v: undefined,
      }));
    }

    res.json(result);
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

    const task = await Task.findByIdAndUpdate(req.params.id, data, { new: true })
      .populate('createdBy', 'fullName')
      .lean();
    const result = {
      ...task,
      id: task._id,
      creator: task.createdBy ? { id: task.createdBy._id, fullName: task.createdBy.fullName } : null,
    };
    delete result.createdBy; delete result._id; delete result.__v;
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/tasks/:id/submit
router.post('/:id/submit', authorize('student'), (req, res, next) => { req.uploadSubDir = 'submissions'; next(); }, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File is required' });

    const task = await Task.findById(req.params.id);
    if (!task || task.status !== 'published') return res.status(404).json({ error: 'Task not found or not accepting submissions' });

    const existing = await TaskSubmission.findOne({ taskId: req.params.id, studentId: req.user.id });
    if (existing) return res.status(409).json({ error: 'You have already submitted this task' });

    const submission = await TaskSubmission.create({
      taskId: req.params.id,
      studentId: req.user.id,
      fileUrl: `/uploads/submissions/${req.file.filename}`,
      notes: req.body.notes,
    });

    const populated = await TaskSubmission.findById(submission._id)
      .populate('studentId', 'fullName avatarUrl')
      .lean();
    const result = {
      ...populated,
      id: populated._id,
      student: populated.studentId ? { id: populated.studentId._id, fullName: populated.studentId.fullName, avatarUrl: populated.studentId.avatarUrl } : null,
    };
    delete result.studentId; delete result._id; delete result.__v;

    const io = req.app.get('io');
    await createNotification({
      userId: task.createdBy,
      title: 'New Submission',
      message: `${req.user.fullName} submitted "${task.title}"`,
      type: 'task',
      refId: task.id,
    }, io);

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/tasks/:id/submissions
router.get('/:id/submissions', authorize('mentor', 'admin'), async (req, res, next) => {
  try {
    const submissions = await TaskSubmission.find({ taskId: req.params.id })
      .sort({ submittedAt: -1 })
      .populate('studentId', 'fullName email avatarUrl')
      .populate('evaluatedBy', 'fullName')
      .lean();

    const data = submissions.map(s => ({
      ...s,
      id: s._id,
      student: s.studentId ? { id: s.studentId._id, fullName: s.studentId.fullName, email: s.studentId.email, avatarUrl: s.studentId.avatarUrl } : null,
      evaluator: s.evaluatedBy ? { id: s.evaluatedBy._id, fullName: s.evaluatedBy.fullName } : null,
      studentId: undefined, evaluatedBy: undefined, _id: undefined, __v: undefined,
    }));
    res.json(data);
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

    const submission = await TaskSubmission.findByIdAndUpdate(req.params.id, {
      ...data,
      evaluatedBy: req.user.id,
      evaluatedAt: new Date(),
    }, { new: true })
      .populate('studentId', 'fullName email')
      .populate('taskId', 'title maxScore')
      .lean();

    const result = {
      ...submission,
      id: submission._id,
      student: submission.studentId ? { id: submission.studentId._id, fullName: submission.studentId.fullName, email: submission.studentId.email } : null,
      task: submission.taskId ? { id: submission.taskId._id, title: submission.taskId.title, maxScore: submission.taskId.maxScore } : null,
    };
    delete result.studentId; delete result._id; delete result.__v;

    const io = req.app.get('io');
    await createNotification({
      userId: result.student?.id,
      title: 'Task Evaluated',
      message: `Your submission for "${result.task?.title}" has been graded: ${data.score}`,
      type: 'task',
      refId: submission.taskId?._id || submission.taskId,
    }, io);

    const emailData = emailTemplates.taskGraded(result.task, result);
    sendEmail({ to: result.student?.email, ...emailData });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
