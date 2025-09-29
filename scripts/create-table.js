#!/usr/bin/env node

/**
 * Script para crear la tabla condo360_posts_history en la base de datos MySQL
 * Este script debe ejecutarse una vez para inicializar la base de datos
 */

require('dotenv').config();
const { db, testConnection, createHistoryTable } = require('../src/config/database');
const logger = require('../src/config/logger');

/**
 * Función principal para crear la tabla
 */
async function main() {
  console.log('🚀 Iniciando creación de tabla condo360_posts_history...\n');

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

    // Crear la tabla
    console.log('🔨 Creando tabla condo360_posts_history...');
    await createHistoryTable();
    console.log('✅ Tabla creada exitosamente\n');

    // Verificar que la tabla fue creada correctamente
    console.log('🔍 Verificando estructura de la tabla...');
    const tableInfo = await db.schema.hasTable('condo360_posts_history');
    
    if (tableInfo) {
      console.log('✅ Tabla condo360_posts_history verificada\n');
      
      // Mostrar información de la tabla
      const columns = await db('condo360_posts_history').columnInfo();
      console.log('📋 Estructura de la tabla:');
      console.table(columns);
      
      console.log('\n🎉 ¡Tabla creada exitosamente!');
      console.log('La tabla condo360_posts_history está lista para usar.\n');
      
      console.log('📝 Próximos pasos:');
      console.log('1. Configura las variables de entorno en tu archivo .env');
      console.log('2. Ejecuta: npm run dev para iniciar el servidor');
      console.log('3. Visita http://localhost:6000/api-docs para ver la documentación');
      
    } else {
      console.error('❌ Error: La tabla no se creó correctamente');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error durante la creación de la tabla:', error.message);
    console.error('\nDetalles del error:');
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Cerrar conexión a la base de datos
    await db.destroy();
    console.log('\n🔌 Conexión a la base de datos cerrada');
  }
}

/**
 * Función para mostrar ayuda
 */
function showHelp() {
  console.log(`
📖 Script de creación de tabla condo360_posts_history

Uso:
  node scripts/create-table.js [opciones]

Opciones:
  --help, -h          Mostrar esta ayuda
  --force, -f         Forzar recreación de la tabla (elimina la existente)

Variables de entorno requeridas:
  DB_HOST             Host de la base de datos MySQL
  DB_PORT             Puerto de la base de datos (por defecto: 3306)
  DB_USER             Usuario de la base de datos
  DB_PASSWORD         Contraseña de la base de datos
  DB_NAME             Nombre de la base de datos de WordPress

Ejemplos:
  node scripts/create-table.js
  node scripts/create-table.js --force

Nota: Este script debe ejecutarse en la misma base de datos de WordPress.
`);
}

/**
 * Función para eliminar la tabla existente
 */
async function dropTable() {
  try {
    console.log('🗑️  Eliminando tabla existente...');
    await db.schema.dropTableIfExists('condo360_posts_history');
    console.log('✅ Tabla existente eliminada\n');
  } catch (error) {
    console.error('❌ Error al eliminar tabla existente:', error.message);
    throw error;
  }
}

// Manejar argumentos de línea de comandos
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  showHelp();
  process.exit(0);
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
(async () => {
  try {
    // Si se especifica --force, eliminar tabla existente primero
    if (args.includes('--force') || args.includes('-f')) {
      await dropTable();
    }
    
    await main();
  } catch (error) {
    console.error('💥 Error fatal:', error.message);
    process.exit(1);
  }
})();

