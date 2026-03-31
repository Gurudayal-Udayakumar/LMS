const express = require('express');
const { z } = require('zod');
const JobPost = require('../../models/JobPost');
const JobApplication = require('../../models/JobApplication');
const User = require('../../models/User');
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
    const { type, page = 1, limit = 20 } = req.query;
    const where = { isActive: true };
    if (type) where.type = type;

    // Admin/mentor can see their own posts
    if (req.user.role !== 'student' && req.query.mine === 'true') {
      where.postedBy = req.user.id;
      delete where.isActive;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const jobs = await JobPost.find(where)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('postedBy', 'fullName avatarUrl')
      .lean();

    // Get application counts
    const jobIds = jobs.map(j => j._id);
    const appCounts = await JobApplication.aggregate([
      { $match: { jobId: { $in: jobIds } } },
      { $group: { _id: '$jobId', count: { $sum: 1 } } },
    ]);
    const appCountMap = {};
    appCounts.forEach(ac => { appCountMap[ac._id.toString()] = ac.count; });

    // Get student applications if student
    let studentApps = {};
    if (req.user.role === 'student') {
      const apps = await JobApplication.find({ jobId: { $in: jobIds }, studentId: req.user.id })
        .select('jobId status')
        .lean();
      apps.forEach(a => { studentApps[a.jobId.toString()] = { id: a._id, status: a.status }; });
    }

    const data = jobs.map(j => {
      const obj = { ...j, id: j._id };
      obj.poster = j.postedBy ? { id: j.postedBy._id, fullName: j.postedBy.fullName, avatarUrl: j.postedBy.avatarUrl } : null;
      obj._count = { applications: appCountMap[j._id.toString()] || 0 };
      if (req.user.role === 'student') {
        const app = studentApps[j._id.toString()];
        obj.applications = app ? [app] : [];
      }
      delete obj.postedBy; delete obj._id; delete obj.__v;
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

// POST /api/jobs
router.post('/', authorize('mentor', 'admin'), async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    const job = await JobPost.create({
      postedBy: req.user.id,
      ...data,
      deadline: data.deadline ? new Date(data.deadline) : null,
      applyUrl: data.applyUrl || null,
    });

    const populated = await JobPost.findById(job._id)
      .populate('postedBy', 'fullName avatarUrl')
      .lean();
    const result = {
      ...populated,
      id: populated._id,
      poster: populated.postedBy ? { id: populated.postedBy._id, fullName: populated.postedBy.fullName, avatarUrl: populated.postedBy.avatarUrl } : null,
    };
    delete result.postedBy; delete result._id; delete result.__v;

    // Notify all students
    const io = req.app.get('io');
    const students = await User.find({ role: 'student', isActive: true }).select('_id email');
    for (const student of students) {
      await createNotification({
        userId: student._id,
        title: 'New Job Posting',
        message: `${job.title} at ${job.company}`,
        type: 'job',
        refId: job.id,
      }, io);
    }

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/jobs/:id
router.get('/:id', async (req, res, next) => {
  try {
    const job = await JobPost.findById(req.params.id)
      .populate('postedBy', 'fullName avatarUrl')
      .lean();
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const appCount = await JobApplication.countDocuments({ jobId: job._id });

    const result = {
      ...job,
      id: job._id,
      poster: job.postedBy ? { id: job.postedBy._id, fullName: job.postedBy.fullName, avatarUrl: job.postedBy.avatarUrl } : null,
      _count: { applications: appCount },
    };
    delete result.postedBy; delete result._id; delete result.__v;

    if (req.user.role === 'student') {
      const app = await JobApplication.findOne({ jobId: job._id, studentId: req.user.id }).select('status').lean();
      result.applications = app ? [{ id: app._id, status: app.status }] : [];
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/jobs/:id/apply
router.post('/:id/apply', authorize('student'), (req, res, next) => { req.uploadSubDir = 'resumes'; next(); }, upload.single('resume'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Resume file is required' });

    const job = await JobPost.findById(req.params.id);
    if (!job || !job.isActive) return res.status(404).json({ error: 'Job not found or no longer active' });

    const existing = await JobApplication.findOne({ jobId: req.params.id, studentId: req.user.id });
    if (existing) return res.status(409).json({ error: 'Already applied' });

    const application = await JobApplication.create({
      jobId: req.params.id,
      studentId: req.user.id,
      resumeUrl: `/uploads/resumes/${req.file.filename}`,
      coverLetter: req.body.coverLetter,
    });

    const io = req.app.get('io');
    await createNotification({
      userId: job.postedBy,
      title: 'New Job Application',
      message: `${req.user.fullName} applied for "${job.title}"`,
      type: 'job',
      refId: job.id,
    }, io);

    res.status(201).json({ ...application.toObject(), id: application._id });
  } catch (err) {
    next(err);
  }
});

// GET /api/jobs/:id/applications
router.get('/:id/applications', authorize('mentor', 'admin'), async (req, res, next) => {
  try {
    const applications = await JobApplication.find({ jobId: req.params.id })
      .sort({ appliedAt: -1 })
      .populate('studentId', 'fullName email avatarUrl phone')
      .lean();

    const data = applications.map(a => ({
      ...a,
      id: a._id,
      student: a.studentId ? { id: a.studentId._id, fullName: a.studentId.fullName, email: a.studentId.email, avatarUrl: a.studentId.avatarUrl, phone: a.studentId.phone } : null,
      studentId: undefined, _id: undefined, __v: undefined,
    }));
    res.json(data);
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
    const job = await JobPost.findByIdAndUpdate(req.params.id, data, { new: true }).lean();
    res.json({ ...job, id: job._id });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
