import { io } from 'socket.io-client';

let socket = null;

export const connectSocket = (token) => {
  if (socket?.connected) return socket;

  socket = io('/', {
    auth: { token },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected');
  });

  socket.on('connect_error', (err) => {
    console.error('[Socket] Connection error:', err.message);
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
