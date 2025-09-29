const express = require('express');

// Importar controladores
const telegramController = require('../controllers/telegramController');

// Importar middlewares
const { authenticateApiKey, validateTelegramWebhook, addUserInfo } = require('../middleware/auth');
const { sanitizeInputs, validateBodySize, securityLogging } = require('../middleware/security');

const router = express.Router();

/**
 * POST /api/v1/telegram/webhook
 * Endpoint webhook para recibir updates de Telegram
 * 
 * Este endpoint es llamado por Telegram cuando se envía un mensaje al bot.
 * Procesa automáticamente archivos .docx y crea posts en WordPress.
 * 
 * Headers requeridos:
 * - X-Telegram-Secret o Authorization: Secret del webhook para validación
 * 
 * Body: Update de Telegram (JSON)
 */
router.post('/webhook',
  // Middlewares específicos para webhook de Telegram
  validateTelegramWebhook,
  addUserInfo,
  securityLogging,
  sanitizeInputs,
  validateBodySize(5), // 5MB para updates de Telegram
  
  // Controlador
  telegramController.webhook
);

/**
 * POST /api/v1/telegram/set-webhook
 * Endpoint para configurar el webhook de Telegram
 * 
 * Este endpoint debe ser llamado una vez para configurar el bot de Telegram
 * con la URL del webhook donde recibir los updates.
 * 
 * Headers requeridos:
 * - X-API-KEY: Clave API para autenticación
 * 
 * Body (JSON):
 * - webhook_url: URL del webhook (requerido)
 * - secret_token: Token secreto para validación (opcional)
 * - allowed_updates: Tipos de updates permitidos (opcional)
 */
router.post('/set-webhook',
  // Middlewares de seguridad y autenticación
  authenticateApiKey,
  addUserInfo,
  securityLogging,
  sanitizeInputs,
  validateBodySize(1), // 1MB para configuración
  
  // Controlador
  telegramController.setWebhook
);

/**
 * GET /api/v1/telegram/webhook-info
 * Endpoint para obtener información del webhook de Telegram
 * 
 * Útil para verificar el estado y configuración del webhook configurado.
 * 
 * Headers requeridos:
 * - X-API-KEY: Clave API para autenticación
 */
router.get('/webhook-info',
  // Middlewares de seguridad y autenticación
  authenticateApiKey,
  addUserInfo,
  securityLogging,
  sanitizeInputs,
  
  // Controlador
  telegramController.getWebhookInfo
);

/**
 * Middleware para logging de rutas no encontradas en Telegram
 */
router.use('*', (req, res) => {
  const traceId = req.traceId;
  
  res.status(404).json({
    success: false,
    error: 'Ruta de Telegram no encontrada',
    message: `La ruta ${req.method} ${req.originalUrl} no existe en el módulo de Telegram`,
    availableRoutes: [
      'POST /api/v1/telegram/webhook - Webhook para recibir updates',
      'POST /api/v1/telegram/set-webhook - Configurar webhook',
      'GET /api/v1/telegram/webhook-info - Obtener información del webhook'
    ],
    traceId
  });
});

module.exports = router;

