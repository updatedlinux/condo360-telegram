const logger = require('../config/logger');
const telegramService = require('../services/telegramService');
const config = require('../config');

/**
 * Controlador para manejo de webhooks de Telegram
 */
class TelegramController {

  /**
   * @swagger
   * /api/v1/telegram/webhook:
   *   post:
   *     tags:
   *       - Telegram
   *     summary: Webhook para recibir updates de Telegram
   *     description: |
   *       Endpoint webhook para recibir updates del bot de Telegram.
   *       Procesa mensajes y archivos .docx enviados al bot.
   *       
   *       **Características:**
   *       - Valida firma del webhook para seguridad
   *       - Procesa archivos .docx automáticamente
   *       - Crea posts en WordPress desde documentos
   *       - Responde al usuario con estado del procesamiento
   *       - Registra toda la actividad en la base de datos
   *     security:
   *       - TelegramWebhookAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             description: Update de Telegram
   *             properties:
   *               update_id:
   *                 type: integer
   *                 description: ID único del update
   *                 example: 123456789
   *               message:
   *                 type: object
   *                 description: Mensaje recibido
   *                 properties:
   *                   message_id:
   *                     type: integer
   *                     example: 987654321
   *                   from:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: integer
   *                         example: 123456789
   *                       username:
   *                         type: string
   *                         example: "usuario123"
   *                       first_name:
   *                         type: string
   *                         example: "Juan"
   *                   chat:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: integer
   *                         example: 123456789
   *                       type:
   *                         type: string
   *                         example: "private"
   *                   text:
   *                     type: string
   *                     description: Texto del mensaje (si es mensaje de texto)
   *                     example: "/help"
   *                   document:
   *                     type: object
   *                     description: Documento adjunto (si es archivo)
   *                     properties:
   *                       file_id:
   *                         type: string
   *                         example: "BAADBAADrwADBREAAYagBgABXwABXwAB"
   *                       file_name:
   *                         type: string
   *                         example: "documento.docx"
   *                       file_size:
   *                         type: integer
   *                         example: 1024000
   *                       mime_type:
   *                         type: string
   *                         example: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
   *           examples:
   *             mensaje_texto:
   *               summary: Mensaje de texto con comando
   *               value:
   *                 update_id: 123456789
   *                 message:
   *                   message_id: 987654321
   *                   from:
   *                     id: 123456789
   *                     username: "usuario123"
   *                     first_name: "Juan"
   *                   chat:
   *                     id: 123456789
   *                     type: "private"
   *                   text: "/help"
   *             documento_docx:
   *               summary: Mensaje con documento .docx
   *               value:
   *                 update_id: 123456790
   *                 message:
   *                   message_id: 987654322
   *                   from:
   *                     id: 123456789
   *                     username: "usuario123"
   *                     first_name: "Juan"
   *                   chat:
   *                     id: 123456789
   *                     type: "private"
   *                   document:
   *                     file_id: "BAADBAADrwADBREAAYagBgABXwABXwAB"
   *                     file_name: "mi_documento.docx"
   *                     file_size: 1024000
   *                     mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
   *     responses:
   *       200:
   *         description: Update procesado exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Update procesado exitosamente"
   *                 data:
   *                   type: object
   *                   description: Datos del procesamiento
   *                 traceId:
   *                   type: string
   *                   format: uuid
   *                   example: "550e8400-e29b-41d4-a716-446655440000"
   *             examples:
   *               documento_procesado:
   *                 summary: Documento procesado exitosamente
   *                 value:
   *                   success: true
   *                   message: "Documento procesado exitosamente"
   *                   data:
   *                     history_id: 123
   *                     wp_post_id: 456
   *                     title: "mi_documento"
   *                     link: "https://tudominio.com/2024/01/15/mi-documento/"
   *                     images_count: 3
   *                   traceId: "550e8400-e29b-41d4-a716-446655440000"
   *               comando_procesado:
   *                 summary: Comando procesado exitosamente
   *                 value:
   *                   success: true
   *                   message: "Comando /help procesado"
   *                   traceId: "550e8400-e29b-41d4-a716-446655440000"
   *       400:
   *         description: Error en la validación del webhook
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             examples:
   *               webhook_no_configurado:
   *                 summary: Webhook no configurado
   *                 value:
   *                   success: false
   *                   error: "Webhook de Telegram no configurado"
   *                   message: "El servicio de Telegram no está habilitado"
   *                   traceId: "550e8400-e29b-41d4-a716-446655440000"
   *               firma_invalida:
   *                 summary: Firma de webhook inválida
   *                 value:
   *                   success: false
   *                   error: "Secret de Telegram inválido"
   *                   message: "El secret de Telegram proporcionado no es válido"
   *                   traceId: "550e8400-e29b-41d4-a716-446655440000"
   *       401:
   *         description: Secret de Telegram no proporcionado
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             example:
   *               success: false
   *               error: "Secret de Telegram requerido"
   *               message: "Debe proporcionar el secret de Telegram en el header X-Telegram-Secret o Authorization"
   *               traceId: "550e8400-e29b-41d4-a716-446655440000"
   *       500:
   *         description: Error interno del servidor
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             example:
   *               success: false
   *               error: "Error interno del servidor al procesar webhook"
   *               message: "Error al procesar update de Telegram: [detalle del error]"
   *               traceId: "550e8400-e29b-41d4-a716-446655440000"
   */
  async webhook(req, res) {
    const traceId = req.traceId;

    try {
      logger.logWithTrace(traceId, 'info', 'Recibido webhook de Telegram', {
        body: req.body,
        headers: req.headers
      });

      // Verificar si el servicio de Telegram está habilitado
      if (!telegramService.isEnabled()) {
        logger.logWithTrace(traceId, 'warn', 'Webhook de Telegram recibido pero servicio deshabilitado');
        
        return res.status(400).json({
          success: false,
          error: 'Webhook de Telegram no configurado',
          message: 'El servicio de Telegram no está habilitado',
          traceId
        });
      }

      // Validar firma del webhook
      const telegramSecret = req.headers['x-telegram-secret'] || req.headers['authorization'];
      const cleanSecret = telegramSecret?.replace(/^Bearer\s+/i, '');
      
      if (!telegramService.validateWebhookSignature(req.body, cleanSecret)) {
        logger.logWithTrace(traceId, 'warn', 'Firma de webhook de Telegram inválida', {
          providedSecret: cleanSecret ? cleanSecret.substring(0, 8) + '...' : 'No proporcionado'
        });
        
        return res.status(401).json({
          success: false,
          error: 'Secret de Telegram inválido',
          message: 'El secret de Telegram proporcionado no es válido',
          traceId
        });
      }

      // Procesar update de Telegram
      const result = await telegramService.processUpdate(req.body);

      logger.logWithTrace(traceId, 'info', 'Webhook de Telegram procesado', {
        success: result.success,
        updateId: req.body.update_id,
        message: result.message
      });

      // Retornar respuesta exitosa (Telegram requiere 200 OK)
      res.status(200).json({
        success: true,
        message: 'Webhook procesado exitosamente',
        data: result.data || null,
        traceId
      });

    } catch (error) {
      logger.logWithTrace(traceId, 'error', 'Error en webhook de Telegram', {
        error: error.message,
        stack: error.stack,
        body: req.body
      });

      // Retornar 200 OK para evitar reintentos de Telegram
      res.status(200).json({
        success: false,
        error: 'Error interno del servidor al procesar webhook',
        message: error.message,
        traceId
      });
    }
  }

  /**
   * @swagger
   * /api/v1/telegram/set-webhook:
   *   post:
   *     tags:
   *       - Telegram
   *     summary: Configurar webhook de Telegram
   *     description: |
   *       Configura el webhook de Telegram para recibir updates.
   *       Este endpoint debe ser llamado una vez para configurar el bot.
   *       
   *       **Nota:** Requiere permisos de administrador y configuración válida de Telegram.
     *     security: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [webhook_url]
   *             properties:
   *               webhook_url:
   *                 type: string
   *                 format: uri
   *                 description: URL del webhook donde Telegram enviará los updates
   *                 example: "https://tu-dominio.com/api/v1/telegram/webhook"
   *               secret_token:
   *                 type: string
   *                 description: Token secreto para validar webhooks (opcional)
   *                 example: "mi_token_secreto_123"
   *               allowed_updates:
   *                 type: array
   *                 items:
   *                   type: string
   *                 description: Tipos de updates permitidos
   *                 example: ["message", "channel_post"]
   *           examples:
   *             configuracion_basica:
   *               summary: Configuración básica de webhook
   *               value:
   *                 webhook_url: "https://tu-dominio.com/api/v1/telegram/webhook"
   *                 secret_token: "mi_token_secreto_123"
   *                 allowed_updates: ["message", "channel_post"]
   *     responses:
   *       200:
   *         description: Webhook configurado exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/SuccessResponse'
   *             example:
   *               success: true
   *               message: "Webhook de Telegram configurado exitosamente"
   *               data:
   *                 webhook_url: "https://tu-dominio.com/api/v1/telegram/webhook"
   *                 webhook_info:
   *                   url: "https://tu-dominio.com/api/v1/telegram/webhook"
   *                   has_custom_certificate: false
   *                   pending_update_count: 0
   *               traceId: "550e8400-e29b-41d4-a716-446655440000"
   *       400:
   *         description: Error en la configuración del webhook
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             example:
   *               success: false
   *               error: "Error al configurar webhook"
   *               message: "URL de webhook inválida"
   *               traceId: "550e8400-e29b-41d4-a716-446655440000"
   *       401:
   *         description: Error en la validación de parámetros
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       500:
   *         description: Error interno del servidor
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  async setWebhook(req, res) {
    const traceId = req.traceId;

    try {
      logger.logWithTrace(traceId, 'info', 'Configurando webhook de Telegram', {
        webhookUrl: req.body.webhook_url,
        secretToken: req.body.secret_token ? 'Configurado' : 'No configurado'
      });

      // Verificar si el servicio de Telegram está habilitado
      if (!telegramService.isEnabled()) {
        return res.status(400).json({
          success: false,
          error: 'Servicio de Telegram no configurado',
          message: 'El servicio de Telegram no está habilitado. Configura TELEGRAM_BOT_TOKEN y TELEGRAM_WEBHOOK_SECRET',
          traceId
        });
      }

      // Validar URL del webhook
      const webhookUrl = req.body.webhook_url;
      if (!webhookUrl || !webhookUrl.startsWith('https://')) {
        return res.status(400).json({
          success: false,
          error: 'URL de webhook inválida',
          message: 'La URL del webhook debe comenzar con https://',
          traceId
        });
      }

      // Configurar webhook usando la API de Telegram
      const axios = require('axios');
      const setWebhookResponse = await axios.post(
        `https://api.telegram.org/bot${config.telegram.botToken}/setWebhook`,
        {
          url: webhookUrl,
          secret_token: req.body.secret_token || config.telegram.webhookSecret,
          allowed_updates: req.body.allowed_updates || ['message', 'channel_post']
        }
      );

      if (!setWebhookResponse.data.ok) {
        throw new Error(setWebhookResponse.data.description);
      }

      // Obtener información del webhook
      const webhookInfoResponse = await axios.get(
        `https://api.telegram.org/bot${config.telegram.botToken}/getWebhookInfo`
      );

      logger.logWithTrace(traceId, 'info', 'Webhook de Telegram configurado exitosamente', {
        webhookUrl,
        webhookInfo: webhookInfoResponse.data.result
      });

      res.json({
        success: true,
        message: 'Webhook de Telegram configurado exitosamente',
        data: {
          webhook_url: webhookUrl,
          webhook_info: webhookInfoResponse.data.result
        },
        traceId
      });

    } catch (error) {
      logger.logWithTrace(traceId, 'error', 'Error al configurar webhook de Telegram', {
        error: error.message,
        stack: error.stack,
        webhookUrl: req.body.webhook_url
      });

      res.status(500).json({
        success: false,
        error: 'Error interno del servidor al configurar webhook',
        message: error.message,
        traceId
      });
    }
  }

  /**
   * @swagger
   * /api/v1/telegram/webhook-info:
   *   get:
   *     tags:
   *       - Telegram
   *     summary: Obtener información del webhook de Telegram
   *     description: |
   *       Obtiene información sobre el webhook configurado en Telegram.
   *       Útil para verificar el estado y configuración del webhook.
     *     security: []
   *     responses:
   *       200:
   *         description: Información del webhook obtenida exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/SuccessResponse'
   *             example:
   *               success: true
   *               message: "Información del webhook obtenida exitosamente"
   *               data:
   *                 webhook_info:
   *                   url: "https://tu-dominio.com/api/v1/telegram/webhook"
   *                   has_custom_certificate: false
   *                   pending_update_count: 0
   *                   last_error_date: null
   *                   last_error_message: null
   *                   max_connections: 40
   *                   allowed_updates: ["message", "channel_post"]
   *               traceId: "550e8400-e29b-41d4-a716-446655440000"
   *       400:
   *         description: Servicio de Telegram no configurado
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             example:
   *               success: false
   *               error: "Servicio de Telegram no configurado"
   *               message: "El servicio de Telegram no está habilitado"
   *               traceId: "550e8400-e29b-41d4-a716-446655440000"
   *       401:
   *         description: Error en la validación de parámetros
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       500:
   *         description: Error interno del servidor
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  async getWebhookInfo(req, res) {
    const traceId = req.traceId;

    try {
      logger.logWithTrace(traceId, 'info', 'Obteniendo información del webhook de Telegram');

      // Verificar si el servicio de Telegram está habilitado
      if (!telegramService.isEnabled()) {
        return res.status(400).json({
          success: false,
          error: 'Servicio de Telegram no configurado',
          message: 'El servicio de Telegram no está habilitado. Configura TELEGRAM_BOT_TOKEN y TELEGRAM_WEBHOOK_SECRET',
          traceId
        });
      }

      // Obtener información del webhook
      const axios = require('axios');
      const webhookInfoResponse = await axios.get(
        `https://api.telegram.org/bot${config.telegram.botToken}/getWebhookInfo`
      );

      if (!webhookInfoResponse.data.ok) {
        throw new Error(webhookInfoResponse.data.description);
      }

      logger.logWithTrace(traceId, 'info', 'Información del webhook obtenida exitosamente', {
        webhookInfo: webhookInfoResponse.data.result
      });

      res.json({
        success: true,
        message: 'Información del webhook obtenida exitosamente',
        data: {
          webhook_info: webhookInfoResponse.data.result
        },
        traceId
      });

    } catch (error) {
      logger.logWithTrace(traceId, 'error', 'Error al obtener información del webhook', {
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: 'Error interno del servidor al obtener información del webhook',
        message: error.message,
        traceId
      });
    }
  }
}

module.exports = new TelegramController();

