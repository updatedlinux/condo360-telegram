#!/usr/bin/env node

/**
 * Servidor principal de Condo360 WordPress API
 * Punto de entrada para la aplicación
 */

const app = require('./src/app');
const config = require('./src/config');
const logger = require('./src/config/logger');

/**
 * Iniciar servidor
 */
const server = app.listen(config.server.port, () => {
  logger.info('🎉 Servidor iniciado exitosamente');
  logger.info(`🌐 Servidor corriendo en puerto ${config.server.port}`);
  logger.info(`📚 Documentación disponible en: http://localhost:${config.server.port}/api-docs`);
  logger.info(`🔍 Health check disponible en: http://localhost:${config.server.port}/api/v1/health`);
  logger.info(`📊 Información de API disponible en: http://localhost:${config.server.port}/api/v1`);
  logger.info(`🕐 Zona horaria: ${config.server.timezone}`);
  logger.info(`🔧 Entorno: ${config.server.env}`);
});

/**
 * Configurar timeout del servidor
 */
server.timeout = 30000; // 30 segundos

/**
 * Configurar manejo de errores del servidor
 */
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`❌ Puerto ${config.server.port} ya está en uso`);
    logger.error('Por favor, cambia el puerto en la variable de entorno PORT o detén el proceso que lo está usando');
  } else {
    logger.error('❌ Error del servidor:', error.message);
  }
  process.exit(1);
});

/**
 * Configurar cierre graceful del servidor
 */
process.on('SIGTERM', () => {
  logger.info('📴 Cerrando servidor...');
  server.close(() => {
    logger.info('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('📴 Cerrando servidor...');
  server.close(() => {
    logger.info('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
});

