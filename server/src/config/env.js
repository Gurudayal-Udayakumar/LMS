require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  smtp: {
    enabled: process.env.SMTP_ENABLED === 'true',
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || 'LMS <noreply@lms.com>',
  },
  upload: {
    dir: process.env.UPLOAD_DIR || 'uploads',
    maxSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024,
  },
};
