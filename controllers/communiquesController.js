const moment = require('moment-timezone');
const { getAppConnection } = require('../config/database');
const { WordPressService, FileProcessingService } = require('../services/wordpressService');
const EmailService = require('../services/emailService');

/**
 * Controlador para gestión de comunicados
 */
class CommuniquesController {
  constructor() {
    this.wordpressService = new WordPressService();
    this.fileProcessingService = new FileProcessingService();
    this.emailService = new EmailService();
  }

  /**
   * Subir comunicado
   */
  async uploadCommunique(req, res, next) {
    try {
      const { title, description, wp_user_id, user_display_name } = req.body;
      const fileInfo = req.fileInfo;
      
      console.log('📤 Iniciando subida de comunicado:', {
        title,
        filename: fileInfo.originalName,
        wp_user_id,
      });

      let wpPostData = null;
      let wpMediaData = null;
      let communiqueId = null;

      try {
        // Procesar archivo según su tipo
        if (fileInfo.extension === '.docx') {
          const docxResult = await this.fileProcessingService.processDocx(fileInfo.path);
          
          // Subir imágenes si las hay
          const imageUrls = {};
          for (const image of docxResult.images) {
            try {
              const mediaResult = await this.wordpressService.uploadMedia(
                image.path,
                image.filename,
                image.mimeType
              );
              imageUrls[image.originalPath] = mediaResult.url;
            } catch (error) {
              console.error('⚠️  Error al subir imagen:', error.message);
            }
          }

          // Reemplazar URLs de imágenes en el HTML
          let processedHtml = docxResult.html;
          Object.entries(imageUrls).forEach(([originalPath, newUrl]) => {
            processedHtml = processedHtml.replace(originalPath, newUrl);
          });

          // Generar HTML final
          const finalHtml = this.fileProcessingService.generateDocxHtml(
            title,
            description,
            processedHtml
          );

          // Crear post en WordPress
          wpPostData = await this.wordpressService.createPost({
            title,
            content: finalHtml,
            author: parseInt(wp_user_id),
          });

        } else if (fileInfo.extension === '.pdf') {
          // Subir PDF como media
          wpMediaData = await this.wordpressService.uploadMedia(
            fileInfo.path,
            fileInfo.originalName,
            fileInfo.mimeType
          );

          // Generar HTML para PDF
          const pdfHtml = this.fileProcessingService.generatePdfHtml(
            title,
            description,
            wpMediaData.url,
            fileInfo.originalName
          );

          // Crear post en WordPress
          wpPostData = await this.wordpressService.createPost({
            title,
            content: pdfHtml,
            author: parseInt(wp_user_id),
            featured_media: wpMediaData.id,
          });
        }

        // Guardar en base de datos propia
        const connection = await getAppConnection();
        const [result] = await connection.execute(
          `INSERT INTO condo360_communiques 
           (wp_user_id, title, description, original_filename, file_type, wp_post_id, wp_post_url, wp_media_id) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            parseInt(wp_user_id),
            title,
            description || null,
            fileInfo.originalName,
            fileInfo.extension.substring(1), // quitar el punto
            wpPostData.id,
            wpPostData.url,
            wpMediaData?.id || null,
          ]
        );

        communiqueId = result.insertId;

        // Enviar notificaciones por correo
        console.log('📧 Iniciando envío de notificaciones...');
        const notificationResult = await this.emailService.sendCommuniqueNotification({
          id: communiqueId,
          title,
          description,
          wp_post_url: wpPostData.url,
          wp_post_id: wpPostData.id,
        });

        // Registrar resultados de notificaciones en BD
        await this.recordNotificationResults(communiqueId, notificationResult);

        // Limpiar archivo temporal
        await this.fileProcessingService.cleanupTempFile(fileInfo.path);

        console.log('✅ Comunicado procesado exitosamente:', {
          communiqueId,
          wpPostId: wpPostData.id,
          notificationsSent: notificationResult.sent,
        });

        res.json({
          success: true,
          message: 'Comunicado subido y publicado exitosamente',
          data: {
            communique_id: communiqueId,
            wp_post_id: wpPostData.id,
            wp_post_url: wpPostData.url,
            notifications_sent: notificationResult.sent,
            notifications_failed: notificationResult.failed,
            file_type: fileInfo.extension.substring(1),
            created_at: moment().tz('America/Caracas').format(),
          },
        });

      } catch (error) {
        // Limpiar archivo temporal en caso de error
        await this.fileProcessingService.cleanupTempFile(fileInfo.path);
        throw error;
      }

    } catch (error) {
      console.error('❌ Error en uploadCommunique:', error);
      next(error);
    }
  }

  /**
   * Registrar resultados de notificaciones en BD
   */
  async recordNotificationResults(communiqueId, notificationResult) {
    try {
      const connection = await getAppConnection();
      
      // Registrar notificaciones exitosas
      if (notificationResult.sent > 0) {
        await connection.execute(
          `INSERT INTO condo360_communiques_notifications 
           (communique_id, email, status, message, sent_at) 
           VALUES (?, ?, 'sent', 'Notificación enviada exitosamente', NOW())`,
          [communiqueId, 'multiple_recipients']
        );
      }

      // Registrar errores
      for (const error of notificationResult.errors) {
        await connection.execute(
          `INSERT INTO condo360_communiques_notifications 
           (communique_id, email, status, message, sent_at) 
           VALUES (?, ?, 'error', ?, NULL)`,
          [communiqueId, 'error_recipient', error]
        );
      }

    } catch (error) {
      console.error('❌ Error al registrar resultados de notificaciones:', error);
    }
  }

  /**
   * Obtener lista de comunicados
   */
  async getCommuniques(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const fileType = req.query.file_type;
      const offset = (page - 1) * limit;

      console.log('🔍 Versión del código:', 'v1.1 - Consulta SQL simplificada');
      console.log('🔍 Parámetros recibidos:', { page, limit, fileType, offset });

      const connection = await getAppConnection();

      // Obtener total de registros - usar query más simple
      let countQuery;
      let countParams;
      
      if (fileType && ['docx', 'pdf'].includes(fileType)) {
        countQuery = 'SELECT COUNT(*) as total FROM condo360_communiques WHERE file_type = ?';
        countParams = [fileType];
      } else {
        countQuery = 'SELECT COUNT(*) as total FROM condo360_communiques';
        countParams = [];
      }
      
      const [countResult] = await connection.execute(countQuery, countParams);
      const total = countResult[0].total;

      // Obtener comunicados - usar query más simple
      let selectQuery;
      let selectParams;
      
      if (fileType && ['docx', 'pdf'].includes(fileType)) {
        selectQuery = `SELECT id, wp_user_id, title, description, original_filename, file_type, 
                wp_post_id, wp_post_url, created_at, updated_at
         FROM condo360_communiques 
         WHERE file_type = ?
         ORDER BY created_at DESC 
         LIMIT ? OFFSET ?`;
        selectParams = [fileType, limit, offset];
      } else {
        selectQuery = `SELECT id, wp_user_id, title, description, original_filename, file_type, 
                wp_post_id, wp_post_url, created_at, updated_at
         FROM condo360_communiques 
         ORDER BY created_at DESC 
         LIMIT ? OFFSET ?`;
        selectParams = [limit, offset];
      }
      
      console.log('🔍 Debug SQL:', {
        query: selectQuery,
        params: selectParams,
        limit,
        offset,
        fileType
      });
      
      const [communiques] = await connection.execute(selectQuery, selectParams);

      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: {
          communiques: communiques.map(comm => ({
            ...comm,
            created_at: moment(comm.created_at).tz('America/Caracas').format(),
            updated_at: moment(comm.updated_at).tz('America/Caracas').format(),
          })),
          pagination: {
            page,
            limit,
            total,
            pages: totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          },
        },
      });

    } catch (error) {
      console.error('❌ Error en getCommuniques:', error);
      next(error);
    }
  }

  /**
   * Obtener comunicado por ID
   */
  async getCommuniqueById(req, res, next) {
    try {
      const { id } = req.params;
      const connection = await getAppConnection();

      // Obtener comunicado
      const [communiques] = await connection.execute(
        `SELECT id, wp_user_id, title, description, original_filename, file_type, 
                wp_post_id, wp_post_url, wp_media_id, created_at, updated_at
         FROM condo360_communiques 
         WHERE id = ?`,
        [id]
      );

      if (communiques.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Comunicado no encontrado',
          code: 'COMMUNIQUE_NOT_FOUND',
        });
      }

      const communique = communiques[0];

      // Obtener notificaciones asociadas
      const [notifications] = await connection.execute(
        `SELECT id, email, status, message, sent_at, created_at
         FROM condo360_communiques_notifications 
         WHERE communique_id = ?
         ORDER BY created_at DESC`,
        [id]
      );

      res.json({
        success: true,
        data: {
          communique: {
            ...communique,
            created_at: moment(communique.created_at).tz('America/Caracas').format(),
            updated_at: moment(communique.updated_at).tz('America/Caracas').format(),
          },
          notifications: notifications.map(notif => ({
            ...notif,
            sent_at: notif.sent_at ? moment(notif.sent_at).tz('America/Caracas').format() : null,
            created_at: moment(notif.created_at).tz('America/Caracas').format(),
          })),
        },
      });

    } catch (error) {
      console.error('❌ Error en getCommuniqueById:', error);
      next(error);
    }
  }

  /**
   * Obtener estadísticas de comunicados
   */
  async getCommuniquesStats(req, res, next) {
    try {
      const connection = await getAppConnection();

      // Estadísticas de comunicados
      const [communiqueStats] = await connection.execute(
        `SELECT 
           COUNT(*) as total_comunicados,
           COUNT(CASE WHEN file_type = 'docx' THEN 1 END) as comunicados_docx,
           COUNT(CASE WHEN file_type = 'pdf' THEN 1 END) as comunicados_pdf
         FROM condo360_communiques`
      );

      // Estadísticas de notificaciones
      const [notificationStats] = await connection.execute(
        `SELECT 
           COUNT(*) as total_notifications,
           COUNT(CASE WHEN status = 'sent' THEN 1 END) as notifications_sent,
           COUNT(CASE WHEN status = 'error' THEN 1 END) as notifications_failed
         FROM condo360_communiques_notifications`
      );

      // Comunicados por mes (últimos 6 meses)
      const [monthlyStats] = await connection.execute(
        `SELECT 
           DATE_FORMAT(created_at, '%Y-%m') as month,
           COUNT(*) as count
         FROM condo360_communiques 
         WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
         GROUP BY DATE_FORMAT(created_at, '%Y-%m')
         ORDER BY month DESC`
      );

      res.json({
        success: true,
        data: {
          ...communiqueStats[0],
          ...notificationStats[0],
          monthly_stats: monthlyStats,
          last_updated: moment().tz('America/Caracas').format(),
        },
      });

    } catch (error) {
      console.error('❌ Error en getCommuniquesStats:', error);
      next(error);
    }
  }
}

module.exports = new CommuniquesController();
