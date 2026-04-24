const levels = ['error', 'warn', 'info', 'http', 'debug'];

const createLogger = (serviceName = 'backend') => {
  const formatMessage = (level, message, meta) => {
    const timestamp = new Date().toISOString();
    const metaString =
      meta && Object.keys(meta).length > 0 ? ` | ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${serviceName}] [${level.toUpperCase()}] ${message}${metaString}`;
  };

  const buildLogger = (level) => {
    return (message, meta = {}) => {
      const formatted = formatMessage(level, message, meta);
      if (level === 'error') {
        console.error(formatted);
      } else if (level === 'warn') {
        console.warn(formatted);
      } else {
        console.log(formatted);
      }
    };
  };

  const logger = {};
  levels.forEach((level) => {
    logger[level] = buildLogger(level);
  });

  logger.log = (level, message, meta = {}) => {
    if (!levels.includes(level)) {
      throw new Error(`Invalid log level: ${level}`);
    }
    logger[level](message, meta);
  };

  return logger;
};

const logger = createLogger('event-management-backend');

const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.http('HTTP Request', {
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      durationMs: duration,
      ip: req.ip,
    });
  });

  next();
};

module.exports = {
  logger,
  requestLogger,
  createLogger,
};

