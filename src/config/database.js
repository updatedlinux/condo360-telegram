const knex = require('knex');
const logger = require('./logger');

/**
 * Configuración de la base de datos MySQL usando Knex
 * Se conecta a la misma base de datos de WordPress
 */
const dbConfig = {
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: 'utf8mb4',
    timezone: 'UTC'
  },
  pool: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 30000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 200
  },
  migrations: {
    directory: './src/migrations'
  }
};

// Crear instancia de Knex
const db = knex(dbConfig);

// Verificar conexión a la base de datos
const testConnection = async () => {
  try {
    await db.raw('SELECT 1');
    logger.info('✅ Conexión a la base de datos MySQL establecida correctamente');
    return true;
  } catch (error) {
    logger.error('❌ Error al conectar con la base de datos MySQL:', error.message);
    return false;
  }
};

// Función para crear la tabla condo360_posts_history si no existe
const createHistoryTable = async () => {
  try {
    const tableExists = await db.schema.hasTable('condo360_posts_history');
    
    if (!tableExists) {
      await db.schema.createTable('condo360_posts_history', (table) => {
        table.bigIncrements('id').primary();
        table.bigInteger('wp_post_id').unsigned().nullable();
        table.string('title', 255).notNullable();
        table.string('status', 50).notNullable(); // draft, publish, trashed, failed
        table.string('created_by', 255).nullable(); // telegram user id o email del remitente
        table.string('telegram_chat_id', 50).nullable();
        table.string('telegram_message_id', 50).nullable();
        table.string('file_name', 255).nullable();
        table.json('media_ids').nullable(); // array JSON de media IDs subidos a WP
        table.json('wp_response').nullable(); // respuesta cruda de WP al crear post
        table.text('error_message').nullable();
        table.datetime('created_at').notNullable();
        table.datetime('updated_at').notNullable();
        table.string('timezone', 50).notNullable().defaultTo('America/Caracas');
        
        // Índices para optimizar consultas
        table.index('wp_post_id');
        table.index('created_by');
        table.index('status');
        table.index('created_at');
      });
      
      logger.info('✅ Tabla condo360_posts_history creada exitosamente');
    } else {
      logger.info('ℹ️ La tabla condo360_posts_history ya existe');
    }
  } catch (error) {
    logger.error('❌ Error al crear la tabla condo360_posts_history:', error.message);
    throw error;
  }
};

module.exports = {
  db,
  testConnection,
  createHistoryTable
};

