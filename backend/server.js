const http = require('http');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { logger } = require('./utils/logger');
const { createApp } = require('./app');
const { initSocket } = require('./utils/socket');

dotenv.config();

const app = createApp();
const server = http.createServer(app);

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

initSocket(server);

server.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});
