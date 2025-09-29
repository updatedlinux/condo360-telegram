/**
 * Aplicación principal de Condo360 WordPress API
 * Servidor Express para automatizar creación y eliminación de posts en WordPress desde archivos .docx
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Importar configuración y servicios
const config = require('./config');
const logger = require('./config/logger');
const { testConnection, createHistoryTable } = require('./config/database');

// Importar rutas
const apiRoutes = require('./routes');
const swaggerRoutes = require('./swagger/routes-redoc'); // Usar ReDoc - Mucho más estable que Swagger UI

// Importar middlewares
const { generalRateLimit } = require('./middleware/security');

/**
 * Crear aplicación Express
 */
const app = express();

/**
 * Configurar middlewares de seguridad
 */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
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
}));

/**
 * Configurar CORS - Acceso libre desde cualquier origen
 */
app.use(cors({
  origin: '*', // Permitir acceso desde cualquier origen
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Telegram-Secret'],
  credentials: false // No necesario para API abierta
}));

/**
 * Configurar rate limiting general
 */
app.use(generalRateLimit);

/**
 * Configurar logging de requests
 */
if (config.server.env === 'development') {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));
} else {
  app.use(morgan('combined', {
    skip: (req, res) => res.statusCode < 400,
    stream: {
      write: (message) => logger.warn(message.trim())
    }
  }));
}

/**
 * Configurar parsing de requests
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * Middleware para agregar traceId a todas las requests
 */
app.use((req, res, next) => {
  const { v4: uuidv4 } = require('uuid');
  req.traceId = uuidv4();
  next();
});

/**
 * Middleware para logging de requests
 */
app.use((req, res, next) => {
  logger.logWithTrace(req.traceId, 'info', 'Request recibida', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentType: req.get('Content-Type')
  });
  next();
});

/**
 * Configurar archivos estáticos para Swagger UI
 * COMENTADO: ReDoc no necesita archivos estáticos locales, usa CDN
 */
// app.use('/api-docs', express.static('node_modules/swagger-ui-dist', {
//   setHeaders: (res, path) => {
//     if (path.endsWith('.css')) {
//       res.setHeader('Content-Type', 'text/css');
//     } else if (path.endsWith('.js')) {
//       res.setHeader('Content-Type', 'application/javascript');
//     }
//   }
// }));

/**
 * Configurar rutas
 */
app.use('/api', apiRoutes);
app.use('/api-docs', swaggerRoutes);

/**
 * Ruta raíz con información de la API
 */
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Condo360 WordPress API',
    data: {
      name: 'Condo360 WordPress API',
      version: '1.0.0',
      description: 'API para automatizar creación y eliminación de posts en WordPress desde archivos .docx',
      documentation: '/api-docs',
      health: '/api/v1/health',
      endpoints: '/api/v1',
      timezone: config.server.timezone,
      timestamp: new Date().toISOString()
    },
    traceId: req.traceId
  });
});

/**
 * Middleware para manejar rutas no encontradas
 */
app.use('*', (req, res) => {
  logger.logWithTrace(req.traceId, 'warn', 'Ruta no encontrada', {
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada',
    message: `La ruta ${req.method} ${req.originalUrl} no existe`,
    availableRoutes: [
      'GET / - Información de la API',
      'GET /api/v1 - Información detallada de la API',
      'GET /api/v1/health - Verificar salud del sistema',
      'POST /api/v1/docx/upload - Subir archivo .docx',
      'DELETE /api/v1/posts/:wp_post_id - Eliminar post',
      'GET /api/v1/posts/history - Buscar historial',
      'GET /api-docs - Documentación Swagger'
    ],
    documentation: '/api-docs',
    traceId: req.traceId
  });
});

/**
 * Middleware para manejo de errores
 */
app.use((error, req, res, next) => {
  logger.logWithTrace(req.traceId, 'error', 'Error no manejado', {
    error: error.message,
    stack: error.stack,
    method: req.method,
    path: req.path,
    ip: req.ip
  });

  res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
    message: config.server.env === 'development' ? error.message : 'Ha ocurrido un error interno',
    traceId: req.traceId
  });
});

/**
 * Función para inicializar la aplicación
 */
async function initializeApp() {
  try {
    logger.info('🚀 Iniciando Condo360 WordPress API...');

    // Verificar conexión a la base de datos
    logger.info('📡 Verificando conexión a la base de datos...');
    const isConnected = await testConnection();
    
    if (!isConnected) {
      logger.error('❌ No se pudo conectar a la base de datos MySQL');
      logger.error('Por favor, verifica la configuración en tu archivo .env');
      process.exit(1);
    }

    logger.info('✅ Conexión a la base de datos establecida');

    // Crear tabla de historial si no existe
    logger.info('🔨 Verificando tabla de historial...');
    await createHistoryTable();

    logger.info('✅ Aplicación inicializada correctamente');
    logger.info(`🌍 Zona horaria: ${config.server.timezone}`);
    logger.info(`🔧 Entorno: ${config.server.env}`);
    logger.info(`📊 Logging: ${config.logging.level}`);

  } catch (error) {
    logger.error('💥 Error al inicializar la aplicación:', error.message);
    logger.error(error.stack);
    process.exit(1);
  }
}

/**
 * Función para cerrar la aplicación correctamente
 */
async function gracefulShutdown(signal) {
  logger.info(`📴 Recibida señal ${signal}, cerrando aplicación...`);
  
  try {
    // Cerrar conexiones a la base de datos
    const { db } = require('./config/database');
    await db.destroy();
    
    logger.info('✅ Aplicación cerrada correctamente');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error al cerrar la aplicación:', error.message);
    process.exit(1);
  }
}

/**
 * Configurar manejo de señales del sistema
 */
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

/**
 * Configurar manejo de errores no capturados
 */
process.on('uncaughtException', (error) => {
  logger.error('💥 Excepción no capturada:', error.message);
  logger.error(error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('💥 Promesa rechazada no manejada:', reason);
  logger.error('Promise:', promise);
  process.exit(1);
});

/**
 * Inicializar aplicación
 */
initializeApp();

module.exports = app;

