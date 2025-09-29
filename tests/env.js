/**
 * Configuración de variables de entorno para testing
 * Se ejecuta antes de todos los tests
 */

// Configurar variables de entorno para testing
process.env.NODE_ENV = 'test';
process.env.PORT = '6001';
process.env.TIMEZONE = 'America/Caracas';
process.env.LOG_DIR = './tests/logs';

// Configuración de base de datos para testing
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '3306';
process.env.DB_USER = 'test_user';
process.env.DB_PASSWORD = 'test_password';
process.env.DB_NAME = 'test_wordpress_db';

// Configuración de WordPress para testing
process.env.WP_URL = 'https://test-wordpress.com';
process.env.WP_USER = 'test_wp_user';
process.env.WP_APP_PASSWORD = 'test-wp-password';

// Configuración de seguridad para testing
process.env.ADMIN_API_KEY = 'test-api-key-123';

// Configuración de archivos para testing
process.env.MAX_FILE_SIZE_MB = '5';

// Configuración de imágenes para testing
process.env.ENABLE_IMAGE_OPTIMIZATION = 'false';

// Configuración de Telegram para testing (opcional)
process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token';
process.env.TELEGRAM_WEBHOOK_SECRET = 'test-webhook-secret';

// Configuración de Redis para testing (opcional)
process.env.REDIS_URL = 'redis://localhost:6379';

// Configuración de Swagger para testing
process.env.SWAGGER_TITLE = 'Condo360 WordPress API - Test';
process.env.SWAGGER_DESCRIPTION = 'API de testing para automatizar creación y eliminación de posts en WordPress';
process.env.SWAGGER_VERSION = '1.0.0-test';
process.env.SWAGGER_HOST = 'localhost:6001';

console.log('🧪 Variables de entorno de testing configuradas');

