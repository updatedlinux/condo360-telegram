const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const path = require('path');

// Configurar plugins de dayjs para manejo de zona horaria
dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Configuración de Winston para logging con zona horaria GMT-4 (Caracas)
 * Incluye rotación diaria de archivos y formato personalizado
 */
class Logger {
  constructor() {
    this.timezone = process.env.TIMEZONE || 'America/Caracas';
    this.logDir = process.env.LOG_DIR || './logs';
    this.nodeEnv = process.env.NODE_ENV || 'development';
    
    // Crear directorio de logs si no existe
    const fs = require('fs');
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
    
    this.logger = this.createLogger();
  }

  /**
   * Formateador personalizado para timestamps en GMT-4
   */
  customFormat = winston.format.combine(
    winston.format.timestamp({
      format: () => {
        return dayjs().tz(this.timezone).format('YYYY-MM-DD HH:mm:ss.SSS');
      }
    }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      let logMessage = `${timestamp} [${level.toUpperCase()}] ${message}`;
      
      // Agregar metadatos si existen
      if (Object.keys(meta).length > 0) {
        logMessage += ` ${JSON.stringify(meta)}`;
      }
      
      return logMessage;
    })
  );

  /**
   * Crear instancia de Winston con configuración completa
   */
  createLogger() {
    const transports = [
      // Transport para consola
      new winston.transports.Console({
        level: this.nodeEnv === 'development' ? 'debug' : 'info',
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
            return `${timestamp} [${level}] ${message}${metaStr}`;
          })
        )
      })
    ];

    // Transport para archivos con rotación diaria
    const fileTransport = new DailyRotateFile({
      filename: path.join(this.logDir, 'condo360-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d', // Mantener logs por 14 días
      level: 'info',
      format: this.customFormat,
      zippedArchive: true
    });

    // Transport para errores separado
    const errorFileTransport = new DailyRotateFile({
      filename: path.join(this.logDir, 'condo360-error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d', // Mantener logs de error por 30 días
      level: 'error',
      format: this.customFormat,
      zippedArchive: true
    });

    transports.push(fileTransport, errorFileTransport);

    return winston.createLogger({
      level: this.nodeEnv === 'development' ? 'debug' : 'info',
      format: this.customFormat,
      transports,
      exitOnError: false
    });
  }

  /**
   * Métodos de logging con contexto adicional
   */
  info(message, meta = {}) {
    this.logger.info(message, { ...meta, timezone: this.timezone });
  }

  error(message, meta = {}) {
    this.logger.error(message, { ...meta, timezone: this.timezone });
  }

  warn(message, meta = {}) {
    this.logger.warn(message, { ...meta, timezone: this.timezone });
  }

  debug(message, meta = {}) {
    this.logger.debug(message, { ...meta, timezone: this.timezone });
  }

  /**
   * Log con traceId para correlacionar requests
   */
  logWithTrace(traceId, level, message, meta = {}) {
    this.logger[level](message, { ...meta, traceId, timezone: this.timezone });
  }

  /**
   * Log específico para operaciones de WordPress
   */
  logWordPressOperation(operation, wpPostId, status, meta = {}) {
    this.info(`Operación WordPress: ${operation}`, {
      wpPostId,
      status,
      operation,
      ...meta
    });
  }

  /**
   * Log específico para procesamiento de archivos
   */
  logFileProcessing(fileName, status, meta = {}) {
    this.info(`Procesamiento de archivo: ${fileName}`, {
      fileName,
      status,
      ...meta
    });
  }
}

// Crear instancia singleton del logger
const logger = new Logger();

module.exports = logger;

