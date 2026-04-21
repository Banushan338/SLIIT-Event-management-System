const path = require('path');
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { logger, requestLogger } = require('./utils/logger');
const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const eventRoutes = require('./routes/event.routes');
const facultyRoutes = require('./routes/faculty.routes');
const userRoutes = require('./routes/user.routes');
const notificationRoutes = require('./routes/notification.routes');
const feedbackRoutes = require('./routes/feedback.routes');
const reviewRoutes = require('./routes/review.routes');
const commentRoutes = require('./routes/comment.routes');
const {
  authenticate,
  requireAdmin,
  requireFacultyCoordinator,
} = require('./middleware/auth.middleware');
const { initSocket } = require('./utils/socket');

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());
app.use(requestLogger);

/** Profile images and other local uploads */
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/users', authenticate, userRoutes);
app.use('/api/notifications', authenticate, notificationRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/reviews', authenticate, reviewRoutes);
app.use('/api/comments', authenticate, commentRoutes);
app.use('/api/admin', authenticate, requireAdmin, adminRoutes);
app.use('/api/events', authenticate, eventRoutes);
app.use(
  '/api/faculty',
  authenticate,
  requireFacultyCoordinator,
  facultyRoutes
);

const PORT = process.env.PORT || 5000;
const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/event_management';

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    logger.info('Connected to MongoDB');
  })
  .catch((err) => {
    logger.error('Error connecting to MongoDB', { message: err.message });
    process.exit(1);
  });

app.get('/', (req, res) => {
  res.json({ message: 'Event Management backend is running' });
});

initSocket(server);

server.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});

