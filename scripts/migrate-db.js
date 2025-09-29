#!/usr/bin/env node

/**
 * Script de migración de base de datos para Condo360 WordPress API
 * Maneja la creación y actualización de tablas necesarias
 */

require('dotenv').config();
const { db, testConnection, createHistoryTable } = require('../src/config/database');
const logger = require('../src/config/logger');

/**
 * Información de migraciones disponibles
 */
const migrations = [
  {
    id: '001_create_posts_history_table',
    name: 'Crear tabla condo360_posts_history',
    description: 'Crea la tabla principal para el historial de procesamiento de posts',
    up: createHistoryTable,
    down: async () => {
      await db.schema.dropTableIfExists('condo360_posts_history');
    }
  }
];

/**
 * Tabla para control de migraciones
 */
const migrationsTable = 'condo360_migrations';

/**
 * Crear tabla de control de migraciones
 */
async function createMigrationsTable() {
  try {
    const tableExists = await db.schema.hasTable(migrationsTable);
    
    if (!tableExists) {
      await db.schema.createTable(migrationsTable, (table) => {
        table.increments('id').primary();
        table.string('migration_id', 255).notNullable().unique();
        table.string('name', 255).notNullable();
        table.text('description').nullable();
        table.timestamp('executed_at').defaultTo(db.fn.now());
        table.string('executed_by', 255).defaultTo('migrate-db-script');
        table.text('notes').nullable();
      });
      
      logger.info('✅ Tabla de control de migraciones creada');
    } else {
      logger.info('ℹ️ La tabla de control de migraciones ya existe');
    }
  } catch (error) {
    logger.error('❌ Error al crear tabla de control de migraciones:', error.message);
    throw error;
  }
}

/**
 * Obtener migraciones ejecutadas
 */
async function getExecutedMigrations() {
  try {
    const executed = await db(migrationsTable)
      .select('migration_id')
      .orderBy('executed_at', 'asc');
    
    return executed.map(m => m.migration_id);
  } catch (error) {
    logger.error('❌ Error al obtener migraciones ejecutadas:', error.message);
    return [];
  }
}

/**
 * Registrar migración ejecutada
 */
async function recordMigration(migration, notes = '') {
  try {
    await db(migrationsTable).insert({
      migration_id: migration.id,
      name: migration.name,
      description: migration.description,
      executed_by: 'migrate-db-script',
      notes: notes
    });
    
    logger.info(`✅ Migración ${migration.id} registrada`);
  } catch (error) {
    logger.error(`❌ Error al registrar migración ${migration.id}:`, error.message);
    throw error;
  }
}

/**
 * Ejecutar migraciones pendientes
 */
async function runMigrations() {
  try {
    logger.info('🚀 Iniciando proceso de migración...');
    
    // Crear tabla de control si no existe
    await createMigrationsTable();
    
    // Obtener migraciones ejecutadas
    const executedMigrations = await getExecutedMigrations();
    
    // Filtrar migraciones pendientes
    const pendingMigrations = migrations.filter(
      migration => !executedMigrations.includes(migration.id)
    );
    
    if (pendingMigrations.length === 0) {
      logger.info('✅ No hay migraciones pendientes');
      return;
    }
    
    logger.info(`📋 Migraciones pendientes: ${pendingMigrations.length}`);
    
    // Ejecutar migraciones pendientes
    for (const migration of pendingMigrations) {
      try {
        logger.info(`🔨 Ejecutando migración: ${migration.name}`);
        logger.info(`📝 Descripción: ${migration.description}`);
        
        await migration.up();
        await recordMigration(migration, 'Ejecutada exitosamente');
        
        logger.info(`✅ Migración ${migration.id} completada`);
        
      } catch (error) {
        logger.error(`❌ Error en migración ${migration.id}:`, error.message);
        throw error;
      }
    }
    
    logger.info('🎉 Todas las migraciones completadas exitosamente');
    
  } catch (error) {
    logger.error('💥 Error durante el proceso de migración:', error.message);
    throw error;
  }
}

/**
 * Revertir migraciones
 */
async function rollbackMigrations(count = 1) {
  try {
    logger.info(`🔄 Iniciando rollback de ${count} migración(es)...`);
    
    // Obtener migraciones ejecutadas ordenadas por fecha descendente
    const executedMigrations = await db(migrationsTable)
      .select('migration_id')
      .orderBy('executed_at', 'desc')
      .limit(count);
    
    if (executedMigrations.length === 0) {
      logger.info('ℹ️ No hay migraciones para revertir');
      return;
    }
    
    logger.info(`📋 Migraciones a revertir: ${executedMigrations.length}`);
    
    // Revertir migraciones
    for (const executed of executedMigrations) {
      const migration = migrations.find(m => m.id === executed.migration_id);
      
      if (!migration) {
        logger.warn(`⚠️ Migración ${executed.migration_id} no encontrada en el código`);
        continue;
      }
      
      try {
        logger.info(`🔄 Revirtiendo migración: ${migration.name}`);
        
        await migration.down();
        
        // Eliminar registro de migración
        await db(migrationsTable)
          .where('migration_id', migration.id)
          .del();
        
        logger.info(`✅ Migración ${migration.id} revertida`);
        
      } catch (error) {
        logger.error(`❌ Error al revertir migración ${migration.id}:`, error.message);
        throw error;
      }
    }
    
    logger.info('🎉 Rollback completado exitosamente');
    
  } catch (error) {
    logger.error('💥 Error durante el rollback:', error.message);
    throw error;
  }
}

/**
 * Mostrar estado de migraciones
 */
async function showStatus() {
  try {
    logger.info('📊 Estado de migraciones:');
    
    // Crear tabla de control si no existe
    await createMigrationsTable();
    
    // Obtener migraciones ejecutadas
    const executedMigrations = await db(migrationsTable)
      .select('*')
      .orderBy('executed_at', 'asc');
    
    // Obtener todas las migraciones disponibles
    const allMigrations = migrations.map(m => ({
      ...m,
      executed: executedMigrations.some(e => e.migration_id === m.id),
      executedAt: executedMigrations.find(e => e.migration_id === m.id)?.executed_at
    }));
    
    console.log('\n📋 Resumen de migraciones:');
    console.log('='.repeat(80));
    
    allMigrations.forEach((migration, index) => {
      const status = migration.executed ? '✅ Ejecutada' : '⏳ Pendiente';
      const executedAt = migration.executedAt ? 
        new Date(migration.executedAt).toLocaleString('es-ES', { timeZone: 'America/Caracas' }) : 
        'N/A';
      
      console.log(`${index + 1}. ${migration.name}`);
      console.log(`   ID: ${migration.id}`);
      console.log(`   Estado: ${status}`);
      console.log(`   Ejecutada: ${executedAt}`);
      console.log(`   Descripción: ${migration.description}`);
      console.log('-'.repeat(80));
    });
    
    const executedCount = allMigrations.filter(m => m.executed).length;
    const pendingCount = allMigrations.filter(m => !m.executed).length;
    
    console.log(`\n📈 Estadísticas:`);
    console.log(`   Total: ${allMigrations.length}`);
    console.log(`   Ejecutadas: ${executedCount}`);
    console.log(`   Pendientes: ${pendingCount}`);
    
  } catch (error) {
    logger.error('❌ Error al mostrar estado:', error.message);
    throw error;
  }
}

/**
 * Función principal
 */
async function main() {
  const command = process.argv[2];
  const arg = process.argv[3];
  
  try {
    // Verificar conexión a la base de datos
    console.log('📡 Verificando conexión a la base de datos...');
    const isConnected = await testConnection();
    
    if (!isConnected) {
      console.error('❌ No se pudo conectar a la base de datos MySQL');
      console.error('Por favor, verifica la configuración en tu archivo .env');
      process.exit(1);
    }
    
    console.log('✅ Conexión a la base de datos establecida\n');
    
    switch (command) {
      case 'up':
      case 'migrate':
        await runMigrations();
        break;
        
      case 'down':
      case 'rollback':
        const count = arg ? parseInt(arg) : 1;
        await rollbackMigrations(count);
        break;
        
      case 'status':
        await showStatus();
        break;
        
      default:
        showHelp();
        break;
    }
    
  } catch (error) {
    console.error('💥 Error fatal:', error.message);
    process.exit(1);
  } finally {
    // Cerrar conexión a la base de datos
    await db.destroy();
    console.log('\n🔌 Conexión a la base de datos cerrada');
  }
}

/**
 * Mostrar ayuda
 */
function showHelp() {
  console.log(`
📖 Script de migración de base de datos para Condo360 WordPress API

Uso:
  node scripts/migrate-db.js <comando> [argumentos]

Comandos:
  up, migrate          Ejecutar migraciones pendientes
  down, rollback [n]   Revertir las últimas n migraciones (por defecto: 1)
  status               Mostrar estado de las migraciones
  help                 Mostrar esta ayuda

Ejemplos:
  node scripts/migrate-db.js up
  node scripts/migrate-db.js migrate
  node scripts/migrate-db.js down
  node scripts/migrate-db.js rollback 2
  node scripts/migrate-db.js status

Variables de entorno requeridas:
  DB_HOST             Host de la base de datos MySQL
  DB_PORT             Puerto de la base de datos (por defecto: 3306)
  DB_USER             Usuario de la base de datos
  DB_PASSWORD         Contraseña de la base de datos
  DB_NAME             Nombre de la base de datos de WordPress

Nota: Este script debe ejecutarse en la misma base de datos de WordPress.
`);
}

// Verificar variables de entorno requeridas
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Variables de entorno faltantes:', missingVars.join(', '));
  console.error('Por favor, configura las variables requeridas en tu archivo .env');
  console.error('\nEjecuta: cp env.example .env y configura las variables necesarias');
  process.exit(1);
}

// Ejecutar script principal
main();

