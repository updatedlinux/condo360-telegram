const logger = require('../config/logger');
const config = require('../config');
const { testConnection } = require('../config/database');
const wordpressService = require('../services/wordpressService');

/**
 * Controlador para verificación de salud del sistema
 */
class HealthController {

  /**
   * @swagger
   * /api/v1/health:
   *   get:
   *     tags:
   *       - Salud
   *     summary: Verificar estado de salud del sistema
   *     description: |
   *       Verifica el estado de todas las dependencias del sistema incluyendo:
   *       - Conexión a base de datos MySQL
   *       - Conectividad con WordPress
   *       - Estado de Redis (si está configurado)
   *       - Configuración de Telegram (si está habilitado)
   *       - Configuración de archivos e imágenes
   *       
   *       Este endpoint es público y no requiere autenticación.
   *       Útil para monitoreo, load balancers y verificaciones de salud.
   *     responses:
   *       200:
   *         description: Sistema funcionando correctamente
   *         content:
   *           application/json:
   *             schema:
   *               allOf:
   *                 - $ref: '#/components/schemas/SuccessResponse'
   *                 - type: object
   *                   properties:
   *                     data:
   *                       $ref: '#/components/schemas/HealthCheck'
   *             examples:
   *               sistema_saludable:
   *                 summary: Sistema completamente saludable
   *                 value:
   *                   success: true
   *                   data:
   *                     timestamp: "2024-01-15T12:00:00.000Z"
   *                     timezone: "America/Caracas"
   *                     environment: "production"
   *                     version: "1.0.0"
   *                     overall:
   *                       status: "healthy"
   *                       message: "Sistema funcionando correctamente"
   *                       criticalChecksHealthy: true
   *                     checks:
   *                       database:
   *                         status: "healthy"
   *                         message: "Conexión a MySQL establecida"
   *                         details:
   *                           host: "localhost"
   *                           port: 3306
   *                           database: "wordpress_db"
   *                       wordpress:
   *                         status: "healthy"
   *                         message: "Conexión a WordPress establecida"
   *                         details:
   *                           url: "https://tudominio.com"
   *                           apiUrl: "https://tudominio.com/wp-json/wp/v2"
   *                       redis:
   *                         status: "healthy"
   *                         message: "Conexión a Redis establecida"
   *                         details:
   *                           url: "redis://localhost:6379"
   *                       telegram:
   *                         status: "configured"
   *                         message: "Bot de Telegram configurado"
   *                         details:
   *                           botToken: "Configurado"
   *                           webhookSecret: "Configurado"
   *                       files:
   *                         status: "healthy"
   *                         message: "Configuración de archivos correcta"
   *                         details:
   *                           maxSizeMB: 10
   *                           allowedMimeTypes: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
   *                           allowedExtensions: [".docx"]
   *                       images:
   *                         status: "healthy"
   *                         message: "Configuración de imágenes correcta"
   *                         details:
   *                           optimizationEnabled: true
   *                           maxWidth: 1920
   *                           maxHeight: 1080
   *                           quality: 85
   *                     responseTime: "150ms"
   *                   traceId: "550e8400-e29b-41d4-a716-446655440000"
   *       503:
   *         description: Sistema con problemas críticos
   *         content:
   *           application/json:
   *             schema:
   *               allOf:
   *                 - $ref: '#/components/schemas/SuccessResponse'
   *                 - type: object
   *                   properties:
   *                     data:
   *                       $ref: '#/components/schemas/HealthCheck'
   *             examples:
   *               sistema_con_problemas:
   *                 summary: Sistema con problemas críticos
   *                 value:
   *                   success: true
   *                   data:
   *                     timestamp: "2024-01-15T12:00:00.000Z"
   *                     timezone: "America/Caracas"
   *                     environment: "production"
   *                     version: "1.0.0"
   *                     overall:
   *                       status: "unhealthy"
   *                       message: "Sistema con problemas críticos"
   *                       criticalChecksHealthy: false
   *                     checks:
   *                       database:
   *                         status: "unhealthy"
   *                         message: "Error de conexión a MySQL: ECONNREFUSED"
   *                         error: "ECONNREFUSED"
   *                       wordpress:
   *                         status: "healthy"
   *                         message: "Conexión a WordPress establecida"
   *                         details:
   *                           url: "https://tudominio.com"
   *                           apiUrl: "https://tudominio.com/wp-json/wp/v2"
   *                       redis:
   *                         status: "disabled"
   *                         message: "Redis no está configurado"
   *                       telegram:
   *                         status: "disabled"
   *                         message: "Telegram no está configurado"
   *                       files:
   *                         status: "healthy"
   *                         message: "Configuración de archivos correcta"
   *                         details:
   *                           maxSizeMB: 10
   *                           allowedMimeTypes: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
   *                           allowedExtensions: [".docx"]
   *                       images:
   *                         status: "healthy"
   *                         message: "Configuración de imágenes correcta"
   *                         details:
   *                           optimizationEnabled: true
   *                           maxWidth: 1920
   *                           maxHeight: 1080
   *                           quality: 85
   *                     responseTime: "2500ms"
   *                   traceId: "550e8400-e29b-41d4-a716-446655440000"
   *       500:
   *         description: Error interno del servidor en verificación de salud
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             example:
   *               success: false
   *               error: "Error interno del servidor en verificación de salud"
   *               message: "Error al verificar dependencias del sistema"
   *               responseTime: "5000ms"
   *               traceId: "550e8400-e29b-41d4-a716-446655440000"
   */
  async checkHealth(req, res) {
    const traceId = req.traceId || 'health-check';
    const startTime = Date.now();

    try {
      logger.logWithTrace(traceId, 'info', 'Iniciando verificación de salud del sistema');

      const healthChecks = {
        timestamp: new Date().toISOString(),
        timezone: config.server.timezone,
        environment: config.server.env,
        version: '1.0.0',
        checks: {}
      };

      // Verificar conexión a base de datos MySQL
      logger.logWithTrace(traceId, 'info', 'Verificando conexión a base de datos MySQL');
      try {
        const dbHealthy = await testConnection();
        healthChecks.checks.database = {
          status: dbHealthy ? 'healthy' : 'unhealthy',
          message: dbHealthy ? 'Conexión a MySQL establecida' : 'Error de conexión a MySQL',
          details: {
            host: config.database.host,
            port: config.database.port,
            database: config.database.name
          }
        };
      } catch (error) {
        healthChecks.checks.database = {
          status: 'unhealthy',
          message: `Error de conexión a MySQL: ${error.message}`,
          error: error.message
        };
      }

      // Verificar conexión a WordPress
      logger.logWithTrace(traceId, 'info', 'Verificando conexión a WordPress');
      try {
        const wpHealthy = await wordpressService.checkConnection();
        healthChecks.checks.wordpress = {
          status: wpHealthy ? 'healthy' : 'unhealthy',
          message: wpHealthy ? 'Conexión a WordPress establecida' : 'Error de conexión a WordPress',
          details: {
            url: config.wordpress.url,
            apiUrl: config.wordpress.apiUrl
          }
        };
      } catch (error) {
        healthChecks.checks.wordpress = {
          status: 'unhealthy',
          message: `Error de conexión a WordPress: ${error.message}`,
          error: error.message
        };
      }

      // Verificar configuración de Redis (opcional)
      if (config.redis.enabled) {
        logger.logWithTrace(traceId, 'info', 'Verificando conexión a Redis');
        try {
          const Redis = require('ioredis');
          const redis = new Redis(config.redis.url);
          
          await redis.ping();
          await redis.disconnect();
          
          healthChecks.checks.redis = {
            status: 'healthy',
            message: 'Conexión a Redis establecida',
            details: {
              url: config.redis.url
            }
          };
        } catch (error) {
          healthChecks.checks.redis = {
            status: 'unhealthy',
            message: `Error de conexión a Redis: ${error.message}`,
            error: error.message
          };
        }
      } else {
        healthChecks.checks.redis = {
          status: 'disabled',
          message: 'Redis no está configurado'
        };
      }

      // Verificar configuración de Telegram (opcional)
      if (config.telegram.enabled) {
        healthChecks.checks.telegram = {
          status: 'configured',
          message: 'Bot de Telegram configurado',
          details: {
            botToken: config.telegram.botToken ? 'Configurado' : 'No configurado',
            webhookSecret: config.telegram.webhookSecret ? 'Configurado' : 'No configurado'
          }
        };
      } else {
        healthChecks.checks.telegram = {
          status: 'disabled',
          message: 'Telegram no está configurado'
        };
      }

      // Verificar configuración de archivos
      healthChecks.checks.files = {
        status: 'healthy',
        message: 'Configuración de archivos correcta',
        details: {
          maxSizeMB: config.files.maxSizeMB,
          allowedMimeTypes: config.files.allowedMimeTypes,
          allowedExtensions: config.files.allowedExtensions
        }
      };

      // Verificar configuración de imágenes
      healthChecks.checks.images = {
        status: 'healthy',
        message: 'Configuración de imágenes correcta',
        details: {
          optimizationEnabled: config.images.optimizationEnabled,
          maxWidth: config.images.maxWidth,
          maxHeight: config.images.maxHeight,
          quality: config.images.quality
        }
      };

      // Determinar estado general del sistema
      const criticalChecks = ['database', 'wordpress'];
      const criticalHealthy = criticalChecks.every(check => 
        healthChecks.checks[check]?.status === 'healthy'
      );

      healthChecks.overall = {
        status: criticalHealthy ? 'healthy' : 'unhealthy',
        message: criticalHealthy ? 
          'Sistema funcionando correctamente' : 
          'Sistema con problemas críticos',
        criticalChecksHealthy: criticalHealthy
      };

      const responseTime = Date.now() - startTime;
      healthChecks.responseTime = `${responseTime}ms`;

      logger.logWithTrace(traceId, 'info', 'Verificación de salud completada', {
        overallStatus: healthChecks.overall.status,
        responseTime: `${responseTime}ms`,
        criticalHealthy
      });

      // Retornar código de estado HTTP apropiado
      const httpStatus = criticalHealthy ? 200 : 503;
      
      res.status(httpStatus).json({
        success: true,
        data: healthChecks,
        traceId
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      logger.logWithTrace(traceId, 'error', 'Error en verificación de salud', {
        error: error.message,
        stack: error.stack,
        responseTime: `${responseTime}ms`
      });

      res.status(500).json({
        success: false,
        error: 'Error interno del servidor en verificación de salud',
        message: error.message,
        responseTime: `${responseTime}ms`,
        traceId
      });
    }
  }

  /**
   * @swagger
   * /api/v1/health/simple:
   *   get:
   *     tags:
   *       - Salud
   *     summary: Verificación simple de salud para load balancers
   *     description: |
   *       Endpoint optimizado para verificaciones rápidas de salud por parte de
   *       load balancers y sistemas de monitoreo. Retorna solo información básica
   *       sin realizar verificaciones de dependencias externas.
   *       
   *       **Características:**
   *       - Respuesta rápida sin verificaciones de dependencias
   *       - No requiere autenticación
   *       - Optimizado para checks frecuentes
   *       - Incluye tiempo de actividad del proceso
   *     responses:
   *       200:
   *         description: Sistema funcionando correctamente
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: "ok"
   *                   description: Estado del sistema
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *                   example: "2024-01-15T12:00:00.000Z"
   *                   description: Timestamp de la verificación
   *                 uptime:
   *                   type: number
   *                   example: 3600.5
   *                   description: Tiempo de actividad del proceso en segundos
   *             examples:
   *               respuesta_exitosa:
   *                 summary: Respuesta exitosa
   *                 value:
   *                   status: "ok"
   *                   timestamp: "2024-01-15T12:00:00.000Z"
   *                   uptime: 3600.5
   *       500:
   *         description: Error interno del servidor
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: "error"
   *                   description: Estado del sistema
   *                 message:
   *                   type: string
   *                   example: "Error interno del servidor"
   *                   description: Mensaje de error
   *             example:
   *               status: "error"
   *               message: "Error interno del servidor"
   */
  async simpleHealth(req, res) {
    try {
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }
}

module.exports = new HealthController();
