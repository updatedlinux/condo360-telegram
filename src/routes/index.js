const express = require('express');
const logger = require('../config/logger');

// Importar rutas específicas
const docxRoutes = require('./docxRoutes');
const healthRoutes = require('./healthRoutes');
const telegramRoutes = require('./telegramRoutes');

const router = express.Router();

/**
 * Middleware para logging de todas las rutas de la API
 */
router.use((req, res, next) => {
  const traceId = req.traceId;
  
  logger.logWithTrace(traceId, 'info', 'Acceso a API', {
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentType: req.get('Content-Type')
  });

  next();
});

/**
 * Rutas de la API v1
 */
router.use('/v1', (req, res, next) => {
  // Agregar información de versión a la request
  req.apiVersion = 'v1';
  
  logger.logWithTrace(req.traceId, 'debug', 'Acceso a API v1', {
    path: req.path,
    method: req.method
  });

  next();
});

// Registrar rutas específicas
router.use('/v1/docx', docxRoutes);
router.use('/v1/telegram', telegramRoutes);
router.use('/v1', healthRoutes);

/**
 * GET /api/v1
 * Endpoint de información de la API
 */
router.get('/v1', (req, res) => {
  const traceId = req.traceId;
  
  logger.logWithTrace(traceId, 'info', 'Acceso a endpoint de información de API');

  res.json({
    success: true,
    message: 'Condo360 WordPress API v1',
    data: {
      version: '1.0.0',
      description: 'API para automatizar creación y eliminación de posts en WordPress desde archivos .docx',
      endpoints: {
        docx: {
          upload: {
            method: 'POST',
            path: '/api/v1/docx/upload',
            description: 'Subir archivo .docx y crear post en WordPress',
            authentication: 'X-API-KEY header requerido'
          }
        },
        posts: {
          delete: {
            method: 'DELETE',
            path: '/api/v1/posts/:wp_post_id',
            description: 'Eliminar post de WordPress y opcionalmente sus medios asociados',
            authentication: 'X-API-KEY header requerido'
          },
          history: {
            method: 'GET',
            path: '/api/v1/posts/history/:history_id',
            description: 'Obtener registro específico del historial de procesamiento',
            authentication: 'X-API-KEY header requerido'
          },
          search: {
            method: 'GET',
            path: '/api/v1/posts/history',
            description: 'Buscar registros del historial con filtros',
            authentication: 'X-API-KEY header requerido'
          }
        },
        telegram: {
          webhook: {
            method: 'POST',
            path: '/api/v1/telegram/webhook',
            description: 'Webhook para recibir updates de Telegram',
            authentication: 'X-Telegram-Secret header requerido'
          },
          setWebhook: {
            method: 'POST',
            path: '/api/v1/telegram/set-webhook',
            description: 'Configurar webhook de Telegram',
            authentication: 'X-API-KEY header requerido'
          },
          webhookInfo: {
            method: 'GET',
            path: '/api/v1/telegram/webhook-info',
            description: 'Obtener información del webhook de Telegram',
            authentication: 'X-API-KEY header requerido'
          }
        },
        health: {
          check: {
            method: 'GET',
            path: '/api/v1/health',
            description: 'Verificar estado de salud del sistema',
            authentication: 'No requerida'
          },
          simple: {
            method: 'GET',
            path: '/api/v1/health/simple',
            description: 'Verificación simple de salud para load balancers',
            authentication: 'No requerida'
          }
        }
      },
      documentation: '/api-docs',
      timezone: 'America/Caracas (GMT-4)',
      timestamp: new Date().toISOString()
    },
    traceId
  });
});

/**
 * Middleware para manejar rutas no encontradas en la API
 */
router.use('*', (req, res) => {
  const traceId = req.traceId;
  
  logger.logWithTrace(traceId, 'warn', 'Ruta de API no encontrada', {
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(404).json({
    success: false,
    error: 'Endpoint no encontrado',
    message: `La ruta ${req.method} ${req.originalUrl} no existe en la API`,
    availableEndpoints: [
      'GET /api/v1 - Información de la API',
      'POST /api/v1/docx/upload - Subir archivo .docx',
      'DELETE /api/v1/posts/:wp_post_id - Eliminar post',
      'GET /api/v1/posts/history/:history_id - Obtener historial por ID',
      'GET /api/v1/posts/history - Buscar historial',
      'POST /api/v1/telegram/webhook - Webhook de Telegram',
      'POST /api/v1/telegram/set-webhook - Configurar webhook de Telegram',
      'GET /api/v1/telegram/webhook-info - Información del webhook',
      'GET /api/v1/health - Verificar salud del sistema',
      'GET /api/v1/health/simple - Verificación simple de salud'
    ],
    documentation: '/api-docs',
    traceId
  });
});

module.exports = router;
