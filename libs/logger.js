const winston = require('winston');
const config = require('../config/index.config');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;

    // Format the message
    let logMessage = `${timestamp} ${level}: ${message}`;

    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      // Remove internal winston properties
      const cleanMeta = Object.keys(meta).reduce((acc, key) => {

        if (!['splat', 'Symbol(level)', 'Symbol(message)'].includes(key)) {
          acc[key] = meta[key];
        }
        return acc;
      }, {});

      if (Object.keys(cleanMeta).length > 0) {
        logMessage += ` ${JSON.stringify(cleanMeta, null, 2)}`;
      }
    }

    return logMessage;
  }),
);

// Define which transports to use
const transports = [
  // Console transport
  new winston.transports.Console({
    format: consoleFormat,
  }),
];

const logger = winston.createLogger({
  level: config.dotEnv.ENV === 'production' ? 'warn' : 'debug',
  levels,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  transports,
  exitOnError: false,
});

logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

module.exports = logger;