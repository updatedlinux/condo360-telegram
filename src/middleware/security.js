const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const logger = require('../config/logger');
const config = require('../config');

/**
 * Configuración de rate limiting para prevenir abuso
 */
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: 'Demasiadas solicitudes',
      message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Rate limit excedido', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        traceId: req.traceId
      });

      res.status(429).json({
        success: false,
        error: 'Demasiadas solicitudes',
        message,
        retryAfter: Math.ceil(windowMs / 1000),
        traceId: req.traceId
      });
    }
  });
};

// Rate limit para endpoints de upload (más restrictivo)
const uploadRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutos
  10, // máximo 10 uploads por ventana
  'Demasiados uploads. Intente nuevamente en unos minutos.'
);

// Rate limit para endpoints generales
const generalRateLimit = createRateLimit(
  config.security.rateLimitWindowMs,
  config.security.rateLimitMax,
  'Demasiadas solicitudes. Intente nuevamente en unos minutos.'
);

// Rate limit para endpoints de eliminación (muy restrictivo)
const deleteRateLimit = createRateLimit(
  60 * 60 * 1000, // 1 hora
  5, // máximo 5 eliminaciones por hora
  'Demasiadas solicitudes de eliminación. Intente nuevamente más tarde.'
);

/**
 * Configuración de Helmet para seguridad HTTP
 */
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false, // Deshabilitado para compatibilidad con WordPress
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

/**
 * Middleware para sanitizar inputs y prevenir inyecciones
 */
const sanitizeInputs = (req, res, next) => {
  const traceId = req.traceId;

  try {
    // Sanitizar strings en body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }

    // Sanitizar strings en query
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }

    // Sanitizar strings en params
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params);
    }

    logger.logWithTrace(traceId, 'debug', 'Inputs sanitizados exitosamente');

    next();

  } catch (error) {
    logger.logWithTrace(traceId, 'error', 'Error en sanitización de inputs', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Error interno del servidor en sanitización',
      message: error.message,
      traceId
    });
  }
};

/**
 * Función recursiva para sanitizar objetos
 */
const sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = sanitizeObject(value);
  }

  return sanitized;
};

/**
 * Sanitizar strings individuales
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') {
    return str;
  }

  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remover scripts
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remover iframes
    .replace(/javascript:/gi, '') // Remover javascript: URLs
    .replace(/on\w+\s*=/gi, '') // Remover event handlers
    .trim();
};

/**
 * Middleware para validar tamaño de request body
 */
const validateBodySize = (maxSizeMB = 5) => {
  return (req, res, next) => {
    const traceId = req.traceId;
    const contentLength = parseInt(req.get('content-length') || '0');
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    if (contentLength > maxSizeBytes) {
      logger.logWithTrace(traceId, 'warn', 'Request body demasiado grande', {
        contentLength,
        maxSizeBytes,
        path: req.path
      });

      return res.status(413).json({
        success: false,
        error: 'Request demasiado grande',
        message: `El tamaño del request excede el límite de ${maxSizeMB}MB`,
        traceId
      });
    }

    next();
  };
};

/**
 * Middleware para logging de seguridad
 */
const securityLogging = (req, res, next) => {
  const traceId = req.traceId;

  // Log de acceso
  logger.logWithTrace(traceId, 'info', 'Acceso a endpoint', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length')
  });

  // Interceptar response para logging
  const originalSend = res.send;
  res.send = function(data) {
    logger.logWithTrace(traceId, 'info', 'Respuesta enviada', {
      statusCode: res.statusCode,
      responseSize: data ? data.length : 0
    });
    
    return originalSend.call(this, data);
  };

  next();
};

/**
 * Middleware para prevenir ataques de timing
 */
const preventTimingAttacks = (req, res, next) => {
  const startTime = Date.now();

  // Interceptar response para agregar delay mínimo
  const originalSend = res.send;
  res.send = function(data) {
    const processingTime = Date.now() - startTime;
    const minDelay = 100; // 100ms delay mínimo

    if (processingTime < minDelay) {
      setTimeout(() => {
        originalSend.call(this, data);
      }, minDelay - processingTime);
    } else {
      originalSend.call(this, data);
    }
  };

  next();
};

/**
 * Middleware para validar headers requeridos
 */
const validateRequiredHeaders = (requiredHeaders) => {
  return (req, res, next) => {
    const traceId = req.traceId;
    const missingHeaders = [];

    for (const header of requiredHeaders) {
      if (!req.get(header)) {
        missingHeaders.push(header);
      }
    }

    if (missingHeaders.length > 0) {
      logger.logWithTrace(traceId, 'warn', 'Headers requeridos faltantes', {
        missingHeaders,
        path: req.path,
        ip: req.ip
      });

      return res.status(400).json({
        success: false,
        error: 'Headers requeridos faltantes',
        message: `Los siguientes headers son requeridos: ${missingHeaders.join(', ')}`,
        missingHeaders,
        traceId
      });
    }

    next();
  };
};

/**
 * Middleware para validar User-Agent
 */
const validateUserAgent = (req, res, next) => {
  const traceId = req.traceId;
  const userAgent = req.get('User-Agent');

  // Lista de User-Agents sospechosos o bloqueados
  const blockedUserAgents = [
    'curl', // Bloquear curl para endpoints sensibles
    'wget',
    'python-requests',
    'bot',
    'crawler',
    'spider'
  ];

  if (userAgent) {
    const isBlocked = blockedUserAgents.some(blocked => 
      userAgent.toLowerCase().includes(blocked.toLowerCase())
    );

    if (isBlocked) {
      logger.logWithTrace(traceId, 'warn', 'User-Agent bloqueado detectado', {
        userAgent,
        ip: req.ip,
        path: req.path
      });

      return res.status(403).json({
        success: false,
        error: 'User-Agent no permitido',
        message: 'El User-Agent utilizado no está permitido para este endpoint',
        traceId
      });
    }
  }

  next();
};

module.exports = {
  uploadRateLimit,
  generalRateLimit,
  deleteRateLimit,
  helmetConfig,
  sanitizeInputs,
  validateBodySize,
  securityLogging,
  preventTimingAttacks,
  validateRequiredHeaders,
  validateUserAgent
};

