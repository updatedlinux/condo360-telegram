const axios = require('axios');
const FormData = require('form-data');
const logger = require('../config/logger');
const config = require('../config');
const docxService = require('./docxService');
const wordpressService = require('./wordpressService');
const { db } = require('../config/database');
const dayjs = require('dayjs');

/**
 * Servicio para manejo de webhooks de Telegram
 * Procesa mensajes y archivos enviados al bot
 */
class TelegramService {
  constructor() {
    this.botToken = config.telegram.botToken;
    this.webhookSecret = config.telegram.webhookSecret;
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
    this.enabled = config.telegram.enabled;
    
    if (this.enabled) {
      logger.info('✅ Servicio de Telegram inicializado', {
        botToken: this.botToken ? 'Configurado' : 'No configurado',
        webhookSecret: this.webhookSecret ? 'Configurado' : 'No configurado'
      });
    } else {
      logger.info('ℹ️ Servicio de Telegram deshabilitado');
    }
  }

  /**
   * Verificar si el servicio está habilitado
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Validar firma del webhook de Telegram
   * @param {Object} update - Update de Telegram
   * @param {string} signature - Firma del webhook
   * @returns {boolean} - true si la firma es válida
   */
  validateWebhookSignature(update, signature) {
    try {
      if (!this.webhookSecret) {
        logger.warn('Webhook secret no configurado, saltando validación de firma');
        return true;
      }

      // Implementar validación de firma si es necesario
      // Por ahora, validamos que el secret coincida
      return signature === this.webhookSecret;
    } catch (error) {
      logger.error('Error al validar firma del webhook de Telegram', {
        error: error.message
      });
      return false;
    }
  }

  /**
   * Procesar update de Telegram
   * @param {Object} update - Update de Telegram
   * @returns {Promise<Object>} - Respuesta del procesamiento
   */
  async processUpdate(update) {
    const traceId = update.update_id?.toString() || 'telegram-update';
    
    try {
      logger.logWithTrace(traceId, 'info', 'Procesando update de Telegram', {
        updateId: update.update_id,
        type: this.getUpdateType(update)
      });

      // Procesar diferentes tipos de update
      if (update.message) {
        return await this.processMessage(update.message, traceId);
      } else if (update.channel_post) {
        return await this.processMessage(update.channel_post, traceId);
      } else {
        logger.logWithTrace(traceId, 'info', 'Tipo de update no soportado', {
          updateId: update.update_id
        });
        
        return {
          success: true,
          message: 'Update procesado (tipo no soportado)',
          traceId
        };
      }

    } catch (error) {
      logger.logWithTrace(traceId, 'error', 'Error al procesar update de Telegram', {
        error: error.message,
        stack: error.stack,
        updateId: update.update_id
      });

      return {
        success: false,
        error: 'Error al procesar update de Telegram',
        message: error.message,
        traceId
      };
    }
  }

  /**
   * Procesar mensaje de Telegram
   * @param {Object} message - Mensaje de Telegram
   * @param {string} traceId - ID de trazabilidad
   * @returns {Promise<Object>} - Respuesta del procesamiento
   */
  async processMessage(message, traceId) {
    try {
      const chatId = message.chat.id;
      const messageId = message.message_id;
      const userId = message.from.id;
      const username = message.from.username || message.from.first_name;

      logger.logWithTrace(traceId, 'info', 'Procesando mensaje de Telegram', {
        chatId,
        messageId,
        userId,
        username,
        hasDocument: !!message.document,
        hasText: !!message.text
      });

      // Procesar documento .docx
      if (message.document) {
        return await this.processDocument(message, traceId);
      }

      // Procesar mensaje de texto
      if (message.text) {
        return await this.processTextMessage(message, traceId);
      }

      // Mensaje sin contenido procesable
      await this.sendMessage(chatId, 'Por favor, envía un archivo .docx para procesar.', messageId);
      
      return {
        success: true,
        message: 'Mensaje procesado (sin contenido procesable)',
        traceId
      };

    } catch (error) {
      logger.logWithTrace(traceId, 'error', 'Error al procesar mensaje de Telegram', {
        error: error.message,
        stack: error.stack,
        chatId: message.chat?.id,
        messageId: message.message_id
      });

      // Enviar mensaje de error al usuario
      try {
        await this.sendMessage(
          message.chat.id, 
          '❌ Error al procesar tu mensaje. Por favor, intenta nuevamente.',
          message.message_id
        );
      } catch (sendError) {
        logger.logWithTrace(traceId, 'error', 'Error al enviar mensaje de error', {
          error: sendError.message
        });
      }

      return {
        success: false,
        error: 'Error al procesar mensaje de Telegram',
        message: error.message,
        traceId
      };
    }
  }

  /**
   * Procesar documento .docx de Telegram
   * @param {Object} message - Mensaje con documento
   * @param {string} traceId - ID de trazabilidad
   * @returns {Promise<Object>} - Respuesta del procesamiento
   */
  async processDocument(message, traceId) {
    const chatId = message.chat.id;
    const messageId = message.message_id;
    const userId = message.from.id;
    const document = message.document;

    try {
      logger.logWithTrace(traceId, 'info', 'Procesando documento de Telegram', {
        chatId,
        messageId,
        userId,
        fileName: document.file_name,
        fileSize: document.file_size,
        mimeType: document.mime_type
      });

      // Validar tipo de archivo
      if (!document.mime_type?.includes('wordprocessingml.document')) {
        await this.sendMessage(
          chatId,
          '❌ Solo se permiten archivos .docx. Por favor, envía un documento de Word válido.',
          messageId
        );
        
        return {
          success: false,
          error: 'Tipo de archivo no permitido',
          message: 'Solo se permiten archivos .docx',
          traceId
        };
      }

      // Validar tamaño de archivo
      const maxSizeBytes = config.files.maxSizeMB * 1024 * 1024;
      if (document.file_size > maxSizeBytes) {
        await this.sendMessage(
          chatId,
          `❌ El archivo es demasiado grande. Tamaño máximo permitido: ${config.files.maxSizeMB}MB`,
          messageId
        );
        
        return {
          success: false,
          error: 'Archivo demasiado grande',
          message: `Tamaño máximo permitido: ${config.files.maxSizeMB}MB`,
          traceId
        };
      }

      // Enviar mensaje de procesamiento
      const processingMessage = await this.sendMessage(
        chatId,
        '📄 Procesando documento... Por favor, espera.',
        messageId
      );

      // Descargar archivo de Telegram
      const fileBuffer = await this.downloadFile(document.file_id);
      
      if (!fileBuffer) {
        await this.editMessage(
          chatId,
          processingMessage.result.message_id,
          '❌ Error al descargar el archivo. Por favor, intenta nuevamente.'
        );
        
        return {
          success: false,
          error: 'Error al descargar archivo',
          message: 'No se pudo descargar el archivo de Telegram',
          traceId
        };
      }

      // Actualizar mensaje de progreso
      await this.editMessage(
        chatId,
        processingMessage.result.message_id,
        '🔄 Convirtiendo documento a HTML...'
      );

      // Crear registro inicial en la base de datos
      const historyRecord = await db('condo360_posts_history').insert({
        title: document.file_name?.replace(/\.[^/.]+$/, '') || 'Documento de Telegram',
        status: 'processing',
        created_by: `telegram_${userId}`,
        telegram_chat_id: chatId.toString(),
        telegram_message_id: messageId.toString(),
        file_name: document.file_name,
        created_at: dayjs().tz(config.server.timezone).format('YYYY-MM-DD HH:mm:ss'),
        updated_at: dayjs().tz(config.server.timezone).format('YYYY-MM-DD HH:mm:ss'),
        timezone: config.server.timezone
      }).returning('*');

      const historyId = historyRecord[0].id;

      // Procesar archivo .docx
      await this.editMessage(
        chatId,
        processingMessage.result.message_id,
        '🖼️ Procesando imágenes...'
      );

      const conversionResult = await docxService.convertToHtml(fileBuffer);

      // Subir imágenes a WordPress si existen
      let imageMappings = [];
      if (conversionResult.images && conversionResult.images.length > 0) {
        await this.editMessage(
          chatId,
          processingMessage.result.message_id,
          '☁️ Subiendo imágenes a WordPress...'
        );

        const uploadResult = await wordpressService.uploadImages(conversionResult.images);
        imageMappings = uploadResult.successful;

        // Actualizar registro con IDs de media
        await db('condo360_posts_history')
          .where('id', historyId)
          .update({
            media_ids: JSON.stringify(uploadResult.successful.map(img => img.wpMediaId)),
            updated_at: dayjs().tz(config.server.timezone).format('YYYY-MM-DD HH:mm:ss')
          });
      }

      // Crear post en WordPress
      await this.editMessage(
        chatId,
        processingMessage.result.message_id,
        '📝 Creando post en WordPress...'
      );

      const finalHtml = docxService.replaceImageReferences(
        conversionResult.html, 
        imageMappings
      );

      const wpPostData = {
        title: document.file_name?.replace(/\.[^/.]+$/, '') || 'Documento de Telegram',
        content: finalHtml,
        status: 'draft', // Por defecto como borrador
        featured_media: imageMappings.length > 0 ? imageMappings[0].wpMediaId : null
      };

      const wpPost = await wordpressService.createPost(wpPostData);

      // Actualizar registro con datos del post creado
      await db('condo360_posts_history')
        .where('id', historyId)
        .update({
          wp_post_id: wpPost.wpPostId,
          status: 'completed',
          wp_response: JSON.stringify(wpPost),
          updated_at: dayjs().tz(config.server.timezone).format('YYYY-MM-DD HH:mm:ss')
        });

      // Limpiar archivos temporales
      const tempPaths = conversionResult.images.map(img => img.tempPath).filter(Boolean);
      await docxService.cleanupTempFiles(tempPaths);

      // Enviar mensaje de éxito
      const successMessage = `✅ ¡Documento procesado exitosamente!

📄 **Título:** ${wpPost.title}
🔗 **Enlace:** ${wpPost.link}
📊 **Estado:** ${wpPost.status}
🖼️ **Imágenes:** ${imageMappings.length}

El post ha sido creado en WordPress como borrador.`;

      await this.editMessage(
        chatId,
        processingMessage.result.message_id,
        successMessage
      );

      logger.logWithTrace(traceId, 'info', 'Documento de Telegram procesado exitosamente', {
        historyId,
        wpPostId: wpPost.wpPostId,
        imagesCount: imageMappings.length,
        chatId,
        userId
      });

      return {
        success: true,
        message: 'Documento procesado exitosamente',
        data: {
          history_id: historyId,
          wp_post_id: wpPost.wpPostId,
          title: wpPost.title,
          link: wpPost.link,
          images_count: imageMappings.length
        },
        traceId
      };

    } catch (error) {
      logger.logWithTrace(traceId, 'error', 'Error al procesar documento de Telegram', {
        error: error.message,
        stack: error.stack,
        chatId,
        userId,
        fileName: document.file_name
      });

      // Enviar mensaje de error
      try {
        await this.sendMessage(
          chatId,
          `❌ Error al procesar el documento: ${error.message}`,
          messageId
        );
      } catch (sendError) {
        logger.logWithTrace(traceId, 'error', 'Error al enviar mensaje de error', {
          error: sendError.message
        });
      }

      return {
        success: false,
        error: 'Error al procesar documento de Telegram',
        message: error.message,
        traceId
      };
    }
  }

  /**
   * Procesar mensaje de texto de Telegram
   * @param {Object} message - Mensaje de texto
   * @param {string} traceId - ID de trazabilidad
   * @returns {Promise<Object>} - Respuesta del procesamiento
   */
  async processTextMessage(message, traceId) {
    const chatId = message.chat.id;
    const messageId = message.message_id;
    const text = message.text;

    try {
      logger.logWithTrace(traceId, 'info', 'Procesando mensaje de texto de Telegram', {
        chatId,
        messageId,
        text: text.substring(0, 100) // Solo primeros 100 caracteres para logging
      });

      // Comandos especiales
      if (text.startsWith('/')) {
        return await this.processCommand(message, traceId);
      }

      // Mensaje de ayuda por defecto
      const helpMessage = `🤖 **Condo360 WordPress Bot**

¡Hola! Soy un bot que te ayuda a crear posts en WordPress desde archivos .docx.

**Cómo usar:**
1. Envía un archivo .docx
2. El bot procesará el documento
3. Creará un post en WordPress con el contenido

**Comandos disponibles:**
/help - Mostrar esta ayuda
/status - Verificar estado del sistema

**Requisitos:**
- Archivo debe ser .docx
- Tamaño máximo: ${config.files.maxSizeMB}MB
- El post se creará como borrador

¡Envía tu documento .docx para comenzar!`;

      await this.sendMessage(chatId, helpMessage, messageId);

      return {
        success: true,
        message: 'Mensaje de ayuda enviado',
        traceId
      };

    } catch (error) {
      logger.logWithTrace(traceId, 'error', 'Error al procesar mensaje de texto', {
        error: error.message,
        chatId,
        messageId
      });

      return {
        success: false,
        error: 'Error al procesar mensaje de texto',
        message: error.message,
        traceId
      };
    }
  }

  /**
   * Procesar comando de Telegram
   * @param {Object} message - Mensaje con comando
   * @param {string} traceId - ID de trazabilidad
   * @returns {Promise<Object>} - Respuesta del procesamiento
   */
  async processCommand(message, traceId) {
    const chatId = message.chat.id;
    const messageId = message.message_id;
    const command = message.text.split(' ')[0];

    try {
      switch (command) {
        case '/help':
          const helpMessage = `🤖 **Condo360 WordPress Bot - Ayuda**

**Comandos disponibles:**
/help - Mostrar esta ayuda
/status - Verificar estado del sistema

**Cómo usar:**
1. Envía un archivo .docx
2. El bot procesará el documento automáticamente
3. Creará un post en WordPress con el contenido

**Requisitos:**
- Archivo debe ser .docx
- Tamaño máximo: ${config.files.maxSizeMB}MB
- El post se creará como borrador

**Soporte:**
Si tienes problemas, contacta al administrador del sistema.`;

          await this.sendMessage(chatId, helpMessage, messageId);
          break;

        case '/status':
          const statusMessage = `📊 **Estado del Sistema**

✅ Bot activo y funcionando
📄 Procesamiento de .docx habilitado
🖼️ Optimización de imágenes: ${config.images.optimizationEnabled ? 'Habilitada' : 'Deshabilitada'}
📏 Tamaño máximo de archivo: ${config.files.maxSizeMB}MB
🌍 Zona horaria: ${config.server.timezone}

¡El sistema está listo para procesar tus documentos!`;

          await this.sendMessage(chatId, statusMessage, messageId);
          break;

        default:
          await this.sendMessage(
            chatId,
            '❓ Comando no reconocido. Usa /help para ver los comandos disponibles.',
            messageId
          );
      }

      return {
        success: true,
        message: `Comando ${command} procesado`,
        traceId
      };

    } catch (error) {
      logger.logWithTrace(traceId, 'error', 'Error al procesar comando', {
        error: error.message,
        command,
        chatId,
        messageId
      });

      await this.sendMessage(
        chatId,
        '❌ Error al procesar el comando. Por favor, intenta nuevamente.',
        messageId
      );

      return {
        success: false,
        error: 'Error al procesar comando',
        message: error.message,
        traceId
      };
    }
  }

  /**
   * Descargar archivo de Telegram
   * @param {string} fileId - ID del archivo en Telegram
   * @returns {Promise<Buffer|null>} - Buffer del archivo o null si falla
   */
  async downloadFile(fileId) {
    try {
      // Obtener información del archivo
      const fileInfoResponse = await axios.get(`${this.apiUrl}/getFile`, {
        params: { file_id: fileId }
      });

      if (!fileInfoResponse.data.ok) {
        logger.error('Error al obtener información del archivo de Telegram', {
          fileId,
          error: fileInfoResponse.data.description
        });
        return null;
      }

      const filePath = fileInfoResponse.data.result.file_path;
      const fileUrl = `https://api.telegram.org/file/bot${this.botToken}/${filePath}`;

      // Descargar archivo
      const fileResponse = await axios.get(fileUrl, {
        responseType: 'arraybuffer',
        timeout: 60000 // 60 segundos timeout
      });

      return Buffer.from(fileResponse.data);

    } catch (error) {
      logger.error('Error al descargar archivo de Telegram', {
        fileId,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Enviar mensaje a Telegram
   * @param {string|number} chatId - ID del chat
   * @param {string} text - Texto del mensaje
   * @param {number} replyToMessageId - ID del mensaje al que responder (opcional)
   * @returns {Promise<Object>} - Respuesta de la API de Telegram
   */
  async sendMessage(chatId, text, replyToMessageId = null) {
    try {
      const params = {
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
      };

      if (replyToMessageId) {
        params.reply_to_message_id = replyToMessageId;
      }

      const response = await axios.post(`${this.apiUrl}/sendMessage`, params);

      if (!response.data.ok) {
        logger.error('Error al enviar mensaje a Telegram', {
          chatId,
          error: response.data.description,
          text: text.substring(0, 100)
        });
        throw new Error(response.data.description);
      }

      return response.data;

    } catch (error) {
      logger.error('Error al enviar mensaje a Telegram', {
        chatId,
        error: error.message,
        text: text.substring(0, 100)
      });
      throw error;
    }
  }

  /**
   * Editar mensaje en Telegram
   * @param {string|number} chatId - ID del chat
   * @param {number} messageId - ID del mensaje a editar
   * @param {string} text - Nuevo texto del mensaje
   * @returns {Promise<Object>} - Respuesta de la API de Telegram
   */
  async editMessage(chatId, messageId, text) {
    try {
      const params = {
        chat_id: chatId,
        message_id: messageId,
        text: text,
        parse_mode: 'Markdown'
      };

      const response = await axios.post(`${this.apiUrl}/editMessageText`, params);

      if (!response.data.ok) {
        logger.error('Error al editar mensaje en Telegram', {
          chatId,
          messageId,
          error: response.data.description,
          text: text.substring(0, 100)
        });
        throw new Error(response.data.description);
      }

      return response.data;

    } catch (error) {
      logger.error('Error al editar mensaje en Telegram', {
        chatId,
        messageId,
        error: error.message,
        text: text.substring(0, 100)
      });
      throw error;
    }
  }

  /**
   * Obtener tipo de update de Telegram
   * @param {Object} update - Update de Telegram
   * @returns {string} - Tipo de update
   */
  getUpdateType(update) {
    if (update.message) return 'message';
    if (update.edited_message) return 'edited_message';
    if (update.channel_post) return 'channel_post';
    if (update.edited_channel_post) return 'edited_channel_post';
    if (update.inline_query) return 'inline_query';
    if (update.chosen_inline_result) return 'chosen_inline_result';
    if (update.callback_query) return 'callback_query';
    if (update.shipping_query) return 'shipping_query';
    if (update.pre_checkout_query) return 'pre_checkout_query';
    if (update.poll) return 'poll';
    if (update.poll_answer) return 'poll_answer';
    return 'unknown';
  }
}

module.exports = new TelegramService();

