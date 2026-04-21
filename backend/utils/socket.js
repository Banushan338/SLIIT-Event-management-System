let io = null;

function initSocket(server) {
  // Lazy-require to avoid startup failure before dependency install.
  // eslint-disable-next-line global-require
  const { Server } = require('socket.io');
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST', 'PATCH'],
    },
  });

  io.on('connection', (socket) => {
    socket.on('auth:bind-user', (userId) => {
      if (!userId) return;
      socket.join(`user:${String(userId)}`);
    });
  });

  return io;
}

function getSocket() {
  return io;
}

function emitToUser(userId, eventName, payload) {
  if (!io || !userId) return;
  io.to(`user:${String(userId)}`).emit(eventName, payload);
}

module.exports = {
  initSocket,
  getSocket,
  emitToUser,
};
