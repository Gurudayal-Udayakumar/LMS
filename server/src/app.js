const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const config = require('./config/env');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./modules/auth/routes');
const appointmentRoutes = require('./modules/appointments/routes');
const ticketRoutes = require('./modules/tickets/routes');
const taskRoutes = require('./modules/tasks/routes');
const chatRoutes = require('./modules/chat/routes');
const jobRoutes = require('./modules/jobs/routes');
const notificationRoutes = require('./modules/notifications/routes');
const adminRoutes = require('./modules/admin/routes');

const app = express();

// Middleware
app.use(cors({
  origin: config.clientUrl,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: { error: 'Too many requests, please try again later' },
});
app.use('/api/', limiter);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

// Error handler
app.use(errorHandler);

module.exports = app;
