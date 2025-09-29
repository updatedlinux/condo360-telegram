require('dotenv').config();

/**
 * Configuración centralizada de la aplicación
 * Valida variables de entorno requeridas y establece valores por defecto
 */

const requiredEnvVars = [
  'WP_URL',
  'WP_USER', 
  'WP_APP_PASSWORD',
  'DB_HOST',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME'
];

// Validar variables de entorno requeridas
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('❌ Variables de entorno faltantes:', missingVars.join(', '));
  console.error('Por favor, configura las variables requeridas en tu archivo .env');
  process.exit(1);
}

const config = {
  // Configuración del servidor
  server: {
    port: parseInt(process.env.PORT) || 6000,
    env: process.env.NODE_ENV || 'development',
    apiPrefix: '/api',
    timezone: process.env.TIMEZONE || 'America/Caracas'
  },

  // Configuración de WordPress
  wordpress: {
    url: process.env.WP_URL.replace(/\/$/, ''), // Remover barra final si existe
    user: process.env.WP_USER,
    appPassword: process.env.WP_APP_PASSWORD,
    apiUrl: `${process.env.WP_URL.replace(/\/$/, '')}/wp-json/wp/v2`,
    authHeader: Buffer.from(`${process.env.WP_USER}:${process.env.WP_APP_PASSWORD}`).toString('base64')
  },

  // Configuración de base de datos
  database: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_NAME
  },

  // Configuración de Telegram (opcional)
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET,
    enabled: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_WEBHOOK_SECRET)
  },

  // Configuración de Redis (opcional)
  redis: {
    url: process.env.REDIS_URL,
    enabled: !!process.env.REDIS_URL
  },

  // Configuración de archivos
  files: {
    maxSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB) || 10,
    allowedMimeTypes: [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
    allowedExtensions: ['.docx']
  },

  // Configuración de imágenes
  images: {
    optimizationEnabled: process.env.ENABLE_IMAGE_OPTIMIZATION === 'true',
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 85,
    formats: ['jpeg', 'png', 'webp']
  },

  // Configuración de logging
  logging: {
    logDir: process.env.LOG_DIR || './logs',
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'info'
  },

  // Configuración de seguridad
  security: {
    rateLimitWindowMs: 15 * 60 * 1000, // 15 minutos
    rateLimitMax: 100, // máximo 100 requests por ventana
    corsOrigins: ['*'] // Permitir acceso desde cualquier origen
  },

  // Configuración de Swagger
  swagger: {
    title: process.env.SWAGGER_TITLE || 'Condo360 WordPress API',
    description: process.env.SWAGGER_DESCRIPTION || 'API para automatizar creación y eliminación de posts en WordPress desde archivos .docx',
    version: process.env.SWAGGER_VERSION || '1.0.0',
    host: process.env.SWAGGER_HOST || `localhost:${process.env.PORT || 6000}`,
    schemes: process.env.NODE_ENV === 'production' ? ['https'] : ['http', 'https']
  },

  // Configuración de mammoth para conversión de .docx
  mammoth: {
    // Configuración para preservar estilos exactamente como están en Word
    styleMap: [
      // Mapeo básico de estilos sin modificar el contenido
      "p[style-name='Heading 1'] => h1:fresh",
      "p[style-name='Heading 2'] => h2:fresh", 
      "p[style-name='Heading 3'] => h3:fresh",
      "p[style-name='Heading 4'] => h4:fresh",
      "p[style-name='Heading 5'] => h5:fresh",
      "p[style-name='Heading 6'] => h6:fresh"
    ],
    // Preservar estilos inline sin modificaciones
    includeEmbeddedStyleMap: true,
    // No aplicar transformaciones automáticas
    convertImage: mammoth.images.inline(function(element) {
      return element.read("base64").then(function(imageBuffer) {
        return {
          src: "data:" + element.contentType + ";base64," + imageBuffer
        };
      });
    })
  }
};

// Validar configuración de WordPress
if (!config.wordpress.url.startsWith('http')) {
  console.error('❌ WP_URL debe comenzar con http:// o https://');
  process.exit(1);
}

// Validar configuración de base de datos
if (!config.database.host || !config.database.user || !config.database.name) {
  console.error('❌ Configuración de base de datos incompleta');
  process.exit(1);
}

module.exports = config;

