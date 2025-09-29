const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');
const logger = require('../config/logger');
const config = require('../config');
const docxService = require('../services/docxService');
const wordpressService = require('../services/wordpressService');
const { db } = require('../config/database');

/**
 * Controlador para manejo de archivos .docx y creación de posts en WordPress
 */
class DocxController {
  
  /**
   * @swagger
   * /api/v1/docx/upload:
   *   post:
   *     tags:
   *       - Documentos
   *     summary: Subir archivo .docx y crear post en WordPress
   *     description: |
   *       Procesa un archivo .docx, convierte su contenido a HTML preservando todos los estilos,
   *       extrae imágenes embebidas, las sube al Media Library de WordPress y crea un post
   *       con el contenido HTML resultante.
   *       
   *       **Características importantes:**
   *       - Preserva TODOS los estilos del documento Word sin modificaciones
   *       - Extrae y procesa imágenes embebidas automáticamente
   *       - Optimiza imágenes si está habilitado en la configuración
   *       - Crea registro de trazabilidad en la base de datos
   *       - Soporta posts como borrador o publicado
     *     security: []
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             $ref: '#/components/schemas/UploadRequest'
   *           examples:
   *             ejemplo_basico:
   *               summary: Ejemplo básico de upload
   *               value:
   *                 file: documento.docx
   *                 title: "Mi Documento Importante"
   *                 status: "draft"
   *                 created_by: "usuario123"
   *             ejemplo_con_imagenes:
   *               summary: Ejemplo con imágenes embebidas
   *               value:
   *                 file: documento_con_imagenes.docx
   *                 title: "Documento con Imágenes"
   *                 status: "publish"
   *                 created_by: "admin@empresa.com"
   *     responses:
   *       201:
   *         description: Archivo procesado y post creado exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/UploadResponse'
   *             examples:
   *               exito_con_imagenes:
   *                 summary: Procesamiento exitoso con imágenes
   *                 value:
   *                   success: true
   *                   message: "Archivo .docx procesado y post creado exitosamente"
   *                   data:
   *                     history_id: 123
   *                     wp_post_id: 456
   *                     title: "Mi Documento Importante"
   *                     status: "draft"
   *                     link: "https://tudominio.com/2024/01/15/mi-documento-importante/"
   *                     featured_media: 789
   *                     images_count: 3
   *                     processing_time: "2.5s"
   *                   traceId: "550e8400-e29b-41d4-a716-446655440000"
   *       400:
   *         description: Error en la validación del archivo o parámetros
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             examples:
   *               archivo_invalido:
   *                 summary: Archivo no válido
   *                 value:
   *                   success: false
   *                   error: "Tipo de archivo no permitido"
   *                   message: "Solo se permiten archivos .docx"
   *                   details:
   *                     providedMimeType: "application/pdf"
   *                     allowedMimeTypes: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
   *                   traceId: "550e8400-e29b-41d4-a716-446655440000"
   *               archivo_demasiado_grande:
   *                 summary: Archivo demasiado grande
   *                 value:
   *                   success: false
   *                   error: "Archivo demasiado grande"
   *                   message: "El archivo excede el tamaño máximo permitido de 10MB"
   *                   details:
   *                     fileSize: 15728640
   *                     maxSize: 10485760
   *                   traceId: "550e8400-e29b-41d4-a716-446655440000"
   *       401:
   *         description: Error en la validación de parámetros
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             example:
   *               success: false
   *               error: "Parámetros inválidos"
   *               message: "Los parámetros proporcionados no son válidos"
   *               traceId: "550e8400-e29b-41d4-a716-446655440000"
   *       429:
   *         description: Demasiadas solicitudes (rate limit excedido)
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             example:
   *               success: false
   *               error: "Demasiadas solicitudes"
   *               message: "Demasiados uploads. Intente nuevamente en unos minutos."
   *               retryAfter: 900
   *               traceId: "550e8400-e29b-41d4-a716-446655440000"
   *       500:
   *         description: Error interno del servidor
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             example:
   *               success: false
   *               error: "Error interno del servidor al procesar el archivo"
   *               message: "Error al convertir archivo .docx: [detalle del error]"
   *               traceId: "550e8400-e29b-41d4-a716-446655440000"
   */
  async uploadDocx(req, res) {
    const traceId = uuidv4();
    const startTime = Date.now();
    
    try {
      logger.logWithTrace(traceId, 'info', 'Iniciando procesamiento de archivo .docx', {
        fileName: req.file?.originalname,
        fileSize: req.file?.size,
        title: req.body.title,
        status: req.body.status,
        createdBy: req.body.created_by
      });

      // Validar archivo
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No se proporcionó ningún archivo',
          traceId
        });
      }

      // Validar tipo de archivo
      if (!req.file.mimetype.includes('wordprocessingml.document')) {
        return res.status(400).json({
          success: false,
          error: 'El archivo debe ser un documento .docx válido',
          traceId
        });
      }

      // Validar tamaño de archivo
      const maxSizeBytes = config.files.maxSizeMB * 1024 * 1024;
      if (req.file.size > maxSizeBytes) {
        return res.status(400).json({
          success: false,
          error: `El archivo excede el tamaño máximo permitido de ${config.files.maxSizeMB}MB`,
          traceId
        });
      }

      const fileName = req.file.originalname;
      const title = req.body.title || fileName.replace(/\.[^/.]+$/, '');
      const status = req.body.status || 'draft';
      const createdBy = req.body.created_by || 'api_user';

      // Crear registro inicial en la base de datos
      const historyRecord = await db('condo360_posts_history').insert({
        title,
        status: 'processing',
        created_by: createdBy,
        file_name: fileName,
        created_at: dayjs().tz(config.server.timezone).format('YYYY-MM-DD HH:mm:ss'),
        updated_at: dayjs().tz(config.server.timezone).format('YYYY-MM-DD HH:mm:ss'),
        timezone: config.server.timezone
      }).returning('*');

      const historyId = historyRecord[0].id;

      logger.logWithTrace(traceId, 'info', 'Registro de historial creado', { historyId });

      // Convertir .docx a HTML
      logger.logWithTrace(traceId, 'info', 'Iniciando conversión de .docx a HTML');
      const conversionResult = await docxService.convertToHtml(req.file.buffer);

      // Subir imágenes a WordPress si existen
      let imageMappings = [];
      if (conversionResult.images && conversionResult.images.length > 0) {
        logger.logWithTrace(traceId, 'info', 'Subiendo imágenes a WordPress', {
          imagesCount: conversionResult.images.length
        });

        const uploadResult = await wordpressService.uploadImages(conversionResult.images);
        imageMappings = uploadResult.successful;

        // Actualizar registro con IDs de media
        await db('condo360_posts_history')
          .where('id', historyId)
          .update({
            media_ids: JSON.stringify(uploadResult.successful.map(img => img.wpMediaId)),
            updated_at: dayjs().tz(config.server.timezone).format('YYYY-MM-DD HH:mm:ss')
          });

        logger.logWithTrace(traceId, 'info', 'Imágenes subidas exitosamente', {
          successful: uploadResult.successful.length,
          failed: uploadResult.failed.length
        });
      }

      // Reemplazar referencias temporales de imágenes en HTML
      const finalHtml = docxService.replaceImageReferences(
        conversionResult.html, 
        imageMappings
      );

      // Crear post en WordPress
      logger.logWithTrace(traceId, 'info', 'Creando post en WordPress');
      const wpPostData = {
        title,
        content: finalHtml,
        status,
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

      const processingTime = Date.now() - startTime;

      logger.logWithTrace(traceId, 'info', 'Procesamiento completado exitosamente', {
        historyId,
        wpPostId: wpPost.wpPostId,
        processingTime: `${processingTime}ms`,
        imagesCount: imageMappings.length
      });

      res.status(201).json({
        success: true,
        message: 'Archivo .docx procesado y post creado exitosamente',
        data: {
          history_id: historyId,
          wp_post_id: wpPost.wpPostId,
          title: wpPost.title,
          status: wpPost.status,
          link: wpPost.link,
          featured_media: wpPost.featuredMedia,
          images_count: imageMappings.length,
          processing_time: `${processingTime}ms`
        },
        traceId
      });

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logger.logWithTrace(traceId, 'error', 'Error en procesamiento de archivo .docx', {
        error: error.message,
        stack: error.stack,
        processingTime: `${processingTime}ms`
      });

      // Actualizar registro con error si existe historyId
      if (req.historyId) {
        try {
          await db('condo360_posts_history')
            .where('id', req.historyId)
            .update({
              status: 'failed',
              error_message: error.message,
              updated_at: dayjs().tz(config.server.timezone).format('YYYY-MM-DD HH:mm:ss')
            });
        } catch (dbError) {
          logger.logWithTrace(traceId, 'error', 'Error al actualizar registro de historial', {
            dbError: dbError.message
          });
        }
      }

      res.status(500).json({
        success: false,
        error: 'Error interno del servidor al procesar el archivo',
        message: error.message,
        traceId
      });
    }
  }

  /**
   * @swagger
   * /api/v1/posts/{wp_post_id}:
   *   delete:
   *     tags:
   *       - Posts
   *     summary: Eliminar post de WordPress y opcionalmente sus medios asociados
   *     description: |
   *       Elimina un post de WordPress por su ID. Opcionalmente puede eliminar también
   *       todos los medios asociados (imágenes) que fueron subidos durante la creación del post.
   *       
   *       **Características importantes:**
   *       - Elimina el post de WordPress permanentemente
   *       - Opcionalmente elimina medios asociados registrados en el historial
   *       - Actualiza el estado del registro en el historial
   *       - Proporciona detalles de la operación realizada
     *     security: []
   *     parameters:
   *       - in: path
   *         name: wp_post_id
   *         required: true
   *         description: ID del post en WordPress a eliminar
   *         schema:
   *           type: integer
   *           minimum: 1
   *         example: 456
   *       - in: query
   *         name: delete_media
   *         required: false
   *         description: Si eliminar también los medios asociados al post
   *         schema:
   *           type: string
   *           enum: [true, false]
   *           default: false
   *         example: true
   *     responses:
   *       200:
   *         description: Post eliminado exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/DeleteResponse'
   *             examples:
   *               exito_con_medios:
   *                 summary: Eliminación exitosa con medios
   *                 value:
   *                   success: true
   *                   message: "Post eliminado exitosamente"
   *                   data:
   *                     wp_post_id: 456
   *                     wp_deleted: true
   *                     media_deletion:
   *                       requested: true
   *                       total: 3
   *                       successful: 3
   *                       failed: 0
   *                       results:
   *                         - mediaId: 789
   *                           success: true
   *                           result: { deleted: true }
   *                         - mediaId: 790
   *                           success: true
   *                           result: { deleted: true }
   *                         - mediaId: 791
   *                           success: true
   *                           result: { deleted: true }
   *                   traceId: "550e8400-e29b-41d4-a716-446655440000"
   *               exito_sin_medios:
   *                 summary: Eliminación exitosa sin medios
   *                 value:
   *                   success: true
   *                   message: "Post eliminado exitosamente"
   *                   data:
   *                     wp_post_id: 456
   *                     wp_deleted: true
   *                     media_deletion:
   *                       requested: false
   *                       total: 0
   *                       successful: 0
   *                       failed: 0
   *                       results: []
   *                   traceId: "550e8400-e29b-41d4-a716-446655440000"
   *       400:
   *         description: ID de post inválido
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             example:
   *               success: false
   *               error: "ID de post inválido"
   *               message: "El parámetro wp_post_id debe ser un número entero positivo"
   *               details:
   *                 paramName: "wp_post_id"
   *                 providedValue: "abc"
   *               traceId: "550e8400-e29b-41d4-a716-446655440000"
   *       401:
   *         description: Error en la validación de parámetros
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       403:
   *         description: Acceso denegado
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       404:
   *         description: Post no encontrado en el historial
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             example:
   *               success: false
   *               error: "Post no encontrado en el historial"
   *               message: "No se encontró un registro de historial para el post con ID 456"
   *               traceId: "550e8400-e29b-41d4-a716-446655440000"
   *       429:
   *         description: Demasiadas solicitudes de eliminación
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             example:
   *               success: false
   *               error: "Demasiadas solicitudes"
   *               message: "Demasiadas solicitudes de eliminación. Intente nuevamente más tarde."
   *               retryAfter: 3600
   *               traceId: "550e8400-e29b-41d4-a716-446655440000"
   *       500:
   *         description: Error interno del servidor
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  async deletePost(req, res) {
    const traceId = uuidv4();
    const wpPostId = parseInt(req.params.wp_post_id);
    const deleteMedia = req.query.delete_media === 'true';

    try {
      logger.logWithTrace(traceId, 'info', 'Iniciando eliminación de post', {
        wpPostId,
        deleteMedia
      });

      // Validar ID del post
      if (!wpPostId || isNaN(wpPostId)) {
        return res.status(400).json({
          success: false,
          error: 'ID de post inválido',
          traceId
        });
      }

      // Buscar registro en historial
      const historyRecord = await db('condo360_posts_history')
        .where('wp_post_id', wpPostId)
        .first();

      if (!historyRecord) {
        return res.status(404).json({
          success: false,
          error: 'Post no encontrado en el historial',
          traceId
        });
      }

      // Eliminar medios asociados si se solicita
      let mediaDeletionResults = [];
      if (deleteMedia && historyRecord.media_ids) {
        try {
          const mediaIds = JSON.parse(historyRecord.media_ids);
          
          logger.logWithTrace(traceId, 'info', 'Eliminando medios asociados', {
            mediaIds,
            count: mediaIds.length
          });

          const mediaDeletionPromises = mediaIds.map(async (mediaId) => {
            try {
              const result = await wordpressService.deleteMedia(mediaId, true);
              return { mediaId, success: true, result };
            } catch (error) {
              logger.logWithTrace(traceId, 'error', 'Error al eliminar medio individual', {
                mediaId,
                error: error.message
              });
              return { mediaId, success: false, error: error.message };
            }
          });

          mediaDeletionResults = await Promise.all(mediaDeletionPromises);
          
          logger.logWithTrace(traceId, 'info', 'Proceso de eliminación de medios completado', {
            total: mediaIds.length,
            successful: mediaDeletionResults.filter(r => r.success).length,
            failed: mediaDeletionResults.filter(r => !r.success).length
          });

        } catch (error) {
          logger.logWithTrace(traceId, 'error', 'Error al procesar eliminación de medios', {
            error: error.message
          });
        }
      }

      // Eliminar post de WordPress
      const wpDeletionResult = await wordpressService.deletePost(wpPostId, true);

      // Actualizar registro de historial
      await db('condo360_posts_history')
        .where('wp_post_id', wpPostId)
        .update({
          status: 'deleted',
          updated_at: dayjs().tz(config.server.timezone).format('YYYY-MM-DD HH:mm:ss')
        });

      logger.logWithTrace(traceId, 'info', 'Post eliminado exitosamente', {
        wpPostId,
        wpDeleted: wpDeletionResult.deleted,
        mediaDeleted: mediaDeletionResults.filter(r => r.success).length
      });

      res.json({
        success: true,
        message: 'Post eliminado exitosamente',
        data: {
          wp_post_id: wpPostId,
          wp_deleted: wpDeletionResult.deleted,
          media_deletion: {
            requested: deleteMedia,
            total: mediaDeletionResults.length,
            successful: mediaDeletionResults.filter(r => r.success).length,
            failed: mediaDeletionResults.filter(r => !r.success).length,
            results: mediaDeletionResults
          }
        },
        traceId
      });

    } catch (error) {
      logger.logWithTrace(traceId, 'error', 'Error en eliminación de post', {
        wpPostId,
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: 'Error interno del servidor al eliminar el post',
        message: error.message,
        traceId
      });
    }
  }

  /**
   * @swagger
   * /api/v1/posts/history/{history_id}:
   *   get:
   *     tags:
   *       - Historial
   *     summary: Obtener registro específico del historial de procesamiento
   *     description: |
   *       Obtiene un registro específico del historial de procesamiento por su ID.
   *       Incluye todos los metadatos, información de WordPress, medios asociados
   *       y detalles del procesamiento.
   *       
   *       **Información incluida:**
   *       - Datos del post creado en WordPress
   *       - IDs de medios subidos
   *       - Información de Telegram (si aplica)
   *       - Estados de procesamiento y errores
   *       - Timestamps con zona horaria
     *     security: []
   *     parameters:
   *       - in: path
   *         name: history_id
   *         required: true
   *         description: ID del registro de historial
   *         schema:
   *           type: integer
   *           minimum: 1
   *         example: 123
   *     responses:
   *       200:
   *         description: Registro de historial obtenido exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               allOf:
   *                 - $ref: '#/components/schemas/SuccessResponse'
   *                 - type: object
   *                   properties:
   *                     data:
   *                       $ref: '#/components/schemas/HistoryRecord'
   *             examples:
   *               registro_completo:
   *                 summary: Registro completo con todos los datos
   *                 value:
   *                   success: true
   *                   data:
   *                     id: 123
   *                     wp_post_id: 456
   *                     title: "Mi Documento Importante"
   *                     status: "completed"
   *                     created_by: "usuario123"
   *                     telegram_chat_id: "123456789"
   *                     telegram_message_id: "987654321"
   *                     file_name: "documento.docx"
   *                     media_ids: [789, 790, 791]
   *                     wp_response:
   *                       wpPostId: 456
   *                       title: "Mi Documento Importante"
   *                       link: "https://tudominio.com/2024/01/15/mi-documento-importante/"
   *                       status: "draft"
   *                       featuredMedia: 789
   *                     error_message: null
   *                     created_at: "2024-01-15T10:30:00"
   *                     updated_at: "2024-01-15T10:32:30"
   *                     timezone: "America/Caracas"
   *                   traceId: "550e8400-e29b-41d4-a716-446655440000"
   *               registro_con_error:
   *                 summary: Registro con error de procesamiento
   *                 value:
   *                   success: true
   *                   data:
   *                     id: 124
   *                     wp_post_id: null
   *                     title: "Documento con Error"
   *                     status: "failed"
   *                     created_by: "usuario456"
   *                     telegram_chat_id: null
   *                     telegram_message_id: null
   *                     file_name: "documento_corrupto.docx"
   *                     media_ids: null
   *                     wp_response: null
   *                     error_message: "Error al convertir archivo .docx: archivo corrupto"
   *                     created_at: "2024-01-15T11:00:00"
   *                     updated_at: "2024-01-15T11:00:05"
   *                     timezone: "America/Caracas"
   *                   traceId: "550e8400-e29b-41d4-a716-446655440000"
   *       400:
   *         description: ID de historial inválido
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             example:
   *               success: false
   *               error: "ID de historial inválido"
   *               message: "El parámetro history_id debe ser un número entero positivo"
   *               details:
   *                 paramName: "history_id"
   *                 providedValue: "abc"
   *               traceId: "550e8400-e29b-41d4-a716-446655440000"
   *       401:
   *         description: Error en la validación de parámetros
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       404:
   *         description: Registro de historial no encontrado
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             example:
   *               success: false
   *               error: "Registro de historial no encontrado"
   *               message: "No se encontró un registro de historial con ID 999"
   *               traceId: "550e8400-e29b-41d4-a716-446655440000"
   *       500:
   *         description: Error interno del servidor
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  async getHistoryById(req, res) {
    const traceId = uuidv4();
    const historyId = parseInt(req.params.history_id);

    try {
      logger.logWithTrace(traceId, 'info', 'Obteniendo historial por ID', { historyId });

      if (!historyId || isNaN(historyId)) {
        return res.status(400).json({
          success: false,
          error: 'ID de historial inválido',
          traceId
        });
      }

      const historyRecord = await db('condo360_posts_history')
        .where('id', historyId)
        .first();

      if (!historyRecord) {
        return res.status(404).json({
          success: false,
          error: 'Registro de historial no encontrado',
          traceId
        });
      }

      // Parsear campos JSON si existen
      const parsedRecord = {
        ...historyRecord,
        media_ids: historyRecord.media_ids ? JSON.parse(historyRecord.media_ids) : null,
        wp_response: historyRecord.wp_response ? JSON.parse(historyRecord.wp_response) : null
      };

      logger.logWithTrace(traceId, 'info', 'Historial obtenido exitosamente', { historyId });

      res.json({
        success: true,
        data: parsedRecord,
        traceId
      });

    } catch (error) {
      logger.logWithTrace(traceId, 'error', 'Error al obtener historial', {
        historyId,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: 'Error interno del servidor al obtener historial',
        message: error.message,
        traceId
      });
    }
  }

  /**
   * @swagger
   * /api/v1/posts/history:
   *   get:
   *     tags:
   *       - Historial
   *     summary: Buscar registros del historial de procesamiento con filtros
   *     description: |
   *       Busca registros del historial de procesamiento aplicando filtros opcionales
   *       y paginación. Permite filtrar por usuario, estado, fechas y otros criterios.
   *       
   *       **Filtros disponibles:**
   *       - wp_post_id: ID específico del post en WordPress
   *       - created_by: Usuario que creó el post (búsqueda parcial)
   *       - status: Estado del procesamiento
   *       - start_date/end_date: Rango de fechas
   *       - page/limit: Paginación
     *     security: []
   *     parameters:
   *       - in: query
   *         name: wp_post_id
   *         required: false
   *         description: ID del post en WordPress
   *         schema:
   *           type: integer
   *           minimum: 1
   *         example: 456
   *       - in: query
   *         name: created_by
   *         required: false
   *         description: Usuario que creó el post (búsqueda parcial)
   *         schema:
   *           type: string
   *           maxLength: 255
   *         example: usuario123
   *       - in: query
   *         name: status
   *         required: false
   *         description: Estado del procesamiento
   *         schema:
   *           type: string
   *           enum: [processing, completed, failed, deleted]
   *         example: completed
   *       - in: query
   *         name: start_date
   *         required: false
   *         description: Fecha de inicio para filtrar (formato ISO YYYY-MM-DD)
   *         schema:
   *           type: string
   *           format: date
   *         example: "2024-01-01"
   *       - in: query
   *         name: end_date
   *         required: false
   *         description: Fecha de fin para filtrar (formato ISO YYYY-MM-DD)
   *         schema:
   *           type: string
   *           format: date
   *         example: "2024-01-31"
   *       - in: query
   *         name: page
   *         required: false
   *         description: Número de página para paginación
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         example: 1
   *       - in: query
   *         name: limit
   *         required: false
   *         description: Cantidad de registros por página (máximo 100)
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 20
   *         example: 20
   *     responses:
   *       200:
   *         description: Búsqueda de historial completada exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               allOf:
   *                 - $ref: '#/components/schemas/SuccessResponse'
   *                 - type: object
   *                   properties:
   *                     data:
   *                       type: object
   *                       properties:
   *                         records:
   *                           type: array
   *                           items:
   *                             $ref: '#/components/schemas/HistoryRecord'
   *                         pagination:
   *                           type: object
   *                           properties:
   *                             page:
   *                               type: integer
   *                               example: 1
   *                             limit:
   *                               type: integer
   *                               example: 20
   *                             total:
   *                               type: integer
   *                               example: 150
   *                             pages:
   *                               type: integer
   *                               example: 8
   *             examples:
   *               busqueda_exitosa:
   *                 summary: Búsqueda exitosa con resultados
   *                 value:
   *                   success: true
   *                   data:
   *                     records:
   *                       - id: 123
   *                         wp_post_id: 456
   *                         title: "Mi Documento Importante"
   *                         status: "completed"
   *                         created_by: "usuario123"
   *                         telegram_chat_id: "123456789"
   *                         telegram_message_id: "987654321"
   *                         file_name: "documento.docx"
   *                         media_ids: [789, 790, 791]
   *                         wp_response:
   *                           wpPostId: 456
   *                           title: "Mi Documento Importante"
   *                           link: "https://tudominio.com/2024/01/15/mi-documento-importante/"
   *                         error_message: null
   *                         created_at: "2024-01-15T10:30:00"
   *                         updated_at: "2024-01-15T10:32:30"
   *                         timezone: "America/Caracas"
   *                       - id: 124
   *                         wp_post_id: 457
   *                         title: "Otro Documento"
   *                         status: "completed"
   *                         created_by: "usuario456"
   *                         telegram_chat_id: null
   *                         telegram_message_id: null
   *                         file_name: "otro_documento.docx"
   *                         media_ids: [792]
   *                         wp_response:
   *                           wpPostId: 457
   *                           title: "Otro Documento"
   *                           link: "https://tudominio.com/2024/01/15/otro-documento/"
   *                         error_message: null
   *                         created_at: "2024-01-15T11:00:00"
   *                         updated_at: "2024-01-15T11:02:00"
   *                         timezone: "America/Caracas"
   *                     pagination:
   *                       page: 1
   *                       limit: 20
   *                       total: 150
   *                       pages: 8
   *                   traceId: "550e8400-e29b-41d4-a716-446655440000"
   *               busqueda_sin_resultados:
   *                 summary: Búsqueda sin resultados
   *                 value:
   *                   success: true
   *                   data:
   *                     records: []
   *                     pagination:
   *                       page: 1
   *                       limit: 20
   *                       total: 0
   *                       pages: 0
   *                   traceId: "550e8400-e29b-41d4-a716-446655440000"
   *       400:
   *         description: Parámetros de consulta inválidos
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             examples:
   *               parametros_invalidos:
   *                 summary: Parámetros inválidos
   *                 value:
   *                   success: false
   *                   error: "Parámetros de consulta inválidos"
   *                   message: "Los parámetros de consulta proporcionados no son válidos"
   *                   details:
   *                     - field: "page"
   *                       message: "page debe ser mayor a 0"
   *                     - field: "limit"
   *                       message: "limit no puede exceder 100"
   *                   traceId: "550e8400-e29b-41d4-a716-446655440000"
   *               fecha_invalida:
   *                 summary: Formato de fecha inválido
   *                 value:
   *                   success: false
   *                   error: "Parámetros de consulta inválidos"
   *                   message: "Los parámetros de consulta proporcionados no son válidos"
   *                   details:
   *                     - field: "start_date"
   *                       message: "start_date debe estar en formato ISO (YYYY-MM-DD)"
   *                   traceId: "550e8400-e29b-41d4-a716-446655440000"
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
  async searchHistory(req, res) {
    const traceId = uuidv4();

    try {
      logger.logWithTrace(traceId, 'info', 'Buscando historial con filtros', { query: req.query });

      const {
        wp_post_id,
        created_by,
        status,
        start_date,
        end_date,
        page = 1,
        limit = 20
      } = req.query;

      // Construir query base
      let query = db('condo360_posts_history');

      // Aplicar filtros
      if (wp_post_id) {
        query = query.where('wp_post_id', wp_post_id);
      }

      if (created_by) {
        query = query.where('created_by', 'like', `%${created_by}%`);
      }

      if (status) {
        query = query.where('status', status);
      }

      if (start_date) {
        query = query.where('created_at', '>=', start_date);
      }

      if (end_date) {
        query = query.where('created_at', '<=', end_date);
      }

      // Aplicar paginación
      const offset = (parseInt(page) - 1) * parseInt(limit);
      query = query.offset(offset).limit(parseInt(limit));

      // Ordenar por fecha de creación descendente
      query = query.orderBy('created_at', 'desc');

      const records = await query;

      // Contar total de registros para paginación
      const countQuery = db('condo360_posts_history');
      if (wp_post_id) countQuery.where('wp_post_id', wp_post_id);
      if (created_by) countQuery.where('created_by', 'like', `%${created_by}%`);
      if (status) countQuery.where('status', status);
      if (start_date) countQuery.where('created_at', '>=', start_date);
      if (end_date) countQuery.where('created_at', '<=', end_date);

      const totalCount = await countQuery.count('* as count').first();

      // Parsear campos JSON en los registros
      const parsedRecords = records.map(record => ({
        ...record,
        media_ids: record.media_ids ? JSON.parse(record.media_ids) : null,
        wp_response: record.wp_response ? JSON.parse(record.wp_response) : null
      }));

      logger.logWithTrace(traceId, 'info', 'Búsqueda de historial completada', {
        found: records.length,
        total: totalCount.count,
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: {
          records: parsedRecords,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: parseInt(totalCount.count),
            pages: Math.ceil(totalCount.count / parseInt(limit))
          }
        },
        traceId
      });

    } catch (error) {
      logger.logWithTrace(traceId, 'error', 'Error en búsqueda de historial', {
        error: error.message,
        query: req.query
      });

      res.status(500).json({
        success: false,
        error: 'Error interno del servidor al buscar historial',
        message: error.message,
        traceId
      });
    }
  }
}

module.exports = new DocxController();
