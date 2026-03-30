require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./src/app');
const config = require('./src/config/env');
const setupSocket = require('./src/socket');

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: config.clientUrl,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Attach io to app for use in routes
app.set('io', io);

// Setup Socket.io handlers
setupSocket(io);

server.listen(config.port, () => {
  console.log(`\n🚀 LMS Server running on http://localhost:${config.port}`);
  console.log(`📡 Socket.io ready`);
  console.log(`🌍 Environment: ${config.nodeEnv}\n`);
});
