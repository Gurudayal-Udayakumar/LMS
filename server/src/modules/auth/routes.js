const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const User = require('../../models/User');
const config = require('../../config/env');
const { authenticate } = require('../../middleware/auth');

const router = express.Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(2),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function generateTokens(userId, role) {
  const accessToken = jwt.sign({ userId, role }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
  const refreshToken = jwt.sign({ userId, role }, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshExpiresIn });
  return { accessToken, refreshToken };
}

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const existing = await User.findOne({ email: data.email });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await User.create({
      email: data.email,
      passwordHash,
      fullName: data.fullName,
      phone: data.phone,
    });

    const userObj = { id: user.id, email: user.email, fullName: user.fullName, role: user.role, avatarUrl: user.avatarUrl };
    const tokens = generateTokens(user.id, user.role);
    res.status(201).json({ user: userObj, ...tokens });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const user = await User.findOne({ email: data.email });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const tokens = generateTokens(user.id, user.role);
    res.json({
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, avatarUrl: user.avatarUrl },
      ...tokens,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
    const user = await User.findById(decoded.userId).select('id role isActive');
    if (!user || !user.isActive) return res.status(401).json({ error: 'Invalid token' });

    const tokens = generateTokens(user.id, user.role);
    res.json(tokens);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('email fullName role avatarUrl phone bio createdAt');
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/auth/profile
router.patch('/profile', authenticate, async (req, res, next) => {
  try {
    const updateSchema = z.object({
      fullName: z.string().min(2).optional(),
      phone: z.string().optional(),
      bio: z.string().optional(),
    });
    const data = updateSchema.parse(req.body);
    const user = await User.findByIdAndUpdate(req.user.id, data, { new: true })
      .select('email fullName role avatarUrl phone bio');
    res.json(user);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
