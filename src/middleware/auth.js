const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');
const config = require('../config');

/**
 * Middleware de autenticación usando API Key
 * Valida el header X-API-KEY contra la clave configurada
 */
const authenticateApiKey = (req, res, next) => {
  const traceId = uuidv4();
  req.traceId = traceId;

  try {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      logger.logWithTrace(traceId, 'warn', 'Intento de acceso sin API Key', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path
      });

      return res.status(401).json({
        success: false,
        error: 'API Key requerida',
        message: 'Debe proporcionar una API Key válida en el header X-API-KEY',
        traceId
      });
    }

    if (apiKey !== config.security.adminApiKey) {
      logger.logWithTrace(traceId, 'warn', 'Intento de acceso con API Key inválida', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        providedKey: apiKey.substring(0, 8) + '...' // Solo mostrar primeros 8 caracteres por seguridad
      });

      return res.status(403).json({
        success: false,
        error: 'API Key inválida',
        message: 'La API Key proporcionada no es válida',
        traceId
      });
    }

    logger.logWithTrace(traceId, 'info', 'Autenticación exitosa con API Key', {
      ip: req.ip,
      path: req.path
    });

    next();

  } catch (error) {
    logger.logWithTrace(traceId, 'error', 'Error en middleware de autenticación', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Error interno del servidor en autenticación',
      message: error.message,
      traceId
    });
  }
};

/**
 * Middleware para validar webhook de Telegram
 * Valida la firma del webhook usando el secret configurado
 */
const validateTelegramWebhook = (req, res, next) => {
  const traceId = uuidv4();
  req.traceId = traceId;

  try {
    // Solo validar si Telegram está configurado
    if (!config.telegram.enabled) {
      logger.logWithTrace(traceId, 'warn', 'Intento de acceso a webhook de Telegram sin configuración');
      return res.status(403).json({
        success: false,
        error: 'Webhook de Telegram no configurado',
        traceId
      });
    }

    const telegramSecret = req.headers['x-telegram-secret'] || req.headers['authorization'];
    
    if (!telegramSecret) {
      logger.logWithTrace(traceId, 'warn', 'Intento de acceso a webhook sin secret de Telegram', {
        ip: req.ip,
        path: req.path
      });

      return res.status(401).json({
        success: false,
        error: 'Secret de Telegram requerido',
        message: 'Debe proporcionar el secret de Telegram en el header X-Telegram-Secret o Authorization',
        traceId
      });
    }

    // Limpiar el secret si viene con "Bearer " prefix
    const cleanSecret = telegramSecret.replace(/^Bearer\s+/i, '');

    if (cleanSecret !== config.telegram.webhookSecret) {
      logger.logWithTrace(traceId, 'warn', 'Intento de acceso con secret de Telegram inválido', {
        ip: req.ip,
        path: req.path
      });

      return res.status(403).json({
        success: false,
        error: 'Secret de Telegram inválido',
        message: 'El secret de Telegram proporcionado no es válido',
        traceId
      });
    }

    logger.logWithTrace(traceId, 'info', 'Webhook de Telegram validado exitosamente', {
      ip: req.ip,
      path: req.path
    });

    next();

  } catch (error) {
    logger.logWithTrace(traceId, 'error', 'Error en validación de webhook de Telegram', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Error interno del servidor en validación de webhook',
      message: error.message,
      traceId
    });
  }
};

/**
 * Middleware para endpoints públicos (sin autenticación)
 * Solo registra el acceso pero no requiere autenticación
 */
const publicEndpoint = (req, res, next) => {
  const traceId = uuidv4();
  req.traceId = traceId;

  logger.logWithTrace(traceId, 'info', 'Acceso a endpoint público', {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    path: req.path,
    method: req.method
  });

  next();
};

/**
 * Middleware para agregar información de usuario a la request
 * Extrae información del usuario desde headers o body
 */
const addUserInfo = (req, res, next) => {
  try {
    // Intentar obtener información del usuario desde diferentes fuentes
    req.userInfo = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      createdBy: req.body?.created_by || req.headers['x-user-id'] || 'api_user',
      telegramUserId: req.body?.telegram_user_id || req.headers['x-telegram-user-id'],
      telegramChatId: req.body?.telegram_chat_id || req.headers['x-telegram-chat-id'],
      telegramMessageId: req.body?.telegram_message_id || req.headers['x-telegram-message-id']
    };

    logger.logWithTrace(req.traceId, 'debug', 'Información de usuario agregada', {
      userInfo: req.userInfo
    });

    next();

  } catch (error) {
    logger.logWithTrace(req.traceId, 'error', 'Error al agregar información de usuario', {
      error: error.message
    });
    next(); // Continuar aunque falle
  }
};

module.exports = {
  authenticateApiKey,
  validateTelegramWebhook,
  publicEndpoint,
  addUserInfo
};

