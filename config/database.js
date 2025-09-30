const mysql = require('mysql2/promise');

// Configuración de conexión a WordPress DB
const wpDbConfig = {
  host: process.env.WP_DB_HOST || 'localhost',
  port: process.env.WP_DB_PORT || 3306,
  user: process.env.WP_DB_USER,
  password: process.env.WP_DB_PASS,
  database: process.env.WP_DB_NAME,
  charset: 'utf8mb4',
  timezone: '+00:00', // Usar UTC para evitar problemas de timezone
};

// Configuración de conexión a BD propia (por defecto usa la misma que WP)
const appDbConfig = {
  host: process.env.DB_HOST || process.env.WP_DB_HOST || 'localhost',
  port: process.env.DB_PORT || process.env.WP_DB_PORT || 3306,
  user: process.env.DB_USER || process.env.WP_DB_USER,
  password: process.env.DB_PASS || process.env.WP_DB_PASS,
  database: process.env.DB_NAME || process.env.WP_DB_NAME || 'wordpress',
  charset: 'utf8mb4',
  timezone: '+00:00', // Usar UTC para evitar problemas de timezone
};

let wpConnection = null;
let appConnection = null;

// Función para obtener conexión a WordPress DB
async function getWpConnection() {
  if (!wpConnection) {
    wpConnection = await mysql.createConnection(wpDbConfig);
  }
  return wpConnection;
}

// Función para obtener conexión a BD propia
async function getAppConnection() {
  if (!appConnection) {
    appConnection = await mysql.createConnection(appDbConfig);
  }
  return appConnection;
}

// Función para inicializar la base de datos
async function initializeDatabase() {
  try {
    // Solo verificar conexión en modo producción
    if (process.env.NODE_ENV === 'production') {
      console.log('🔍 Verificando conexión a base de datos...');
      
      const connection = await getAppConnection();
      
      // Verificar que las tablas existen
      const [tables] = await connection.execute(`
        SELECT TABLE_NAME 
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME IN ('condo360_communiques', 'condo360_communiques_notifications', 'condo360_settings')
      `, [appDbConfig.database]);
      
      if (tables.length < 3) {
        console.log('⚠️  Algunas tablas no existen. Ejecute el script schema.sql para crearlas.');
      } else {
        console.log('✅ Todas las tablas de la aplicación están disponibles');
      }
      
      // Verificar conexión a WordPress DB
      const wpConn = await getWpConnection();
      const [wpTables] = await wpConn.execute(`
        SELECT TABLE_NAME 
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME IN ('wp_users', 'wp_usermeta')
      `, [wpDbConfig.database]);
      
      if (wpTables.length < 2) {
        console.log('⚠️  No se encontraron las tablas de WordPress. Verifique la configuración de WP_DB_*');
      } else {
        console.log('✅ Conexión a WordPress DB establecida correctamente');
      }
    } else {
      console.log('🔧 Modo desarrollo: Saltando verificación de base de datos');
      console.log('⚠️  Configure las variables de entorno antes de usar en producción');
      console.log('📝 Variables requeridas: WP_DB_*, SMTP_*, WP_REST_*');
    }
    
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ Error al inicializar la base de datos:', error.message);
      throw error;
    } else {
      console.log('⚠️  Error de conexión a base de datos (modo desarrollo):', error.message);
      console.log('💡 Configure las variables de entorno en .env para conectar a la base de datos');
    }
  }
}

// Función para cerrar conexiones
async function closeConnections() {
  try {
    if (wpConnection) {
      await wpConnection.end();
      wpConnection = null;
    }
    if (appConnection) {
      await appConnection.end();
      appConnection = null;
    }
    console.log('✅ Conexiones a base de datos cerradas');
  } catch (error) {
    console.error('❌ Error al cerrar conexiones:', error.message);
  }
}

// Función para obtener usuarios de WordPress
async function getWpUsers(roleFilter = 'subscriber') {
  try {
    const connection = await getWpConnection();
    
    // Query para obtener usuarios con el rol especificado
    const query = `
      SELECT DISTINCT u.ID, u.user_email, u.display_name, u.user_login
      FROM wp_users u
      LEFT JOIN wp_usermeta um ON u.ID = um.user_id AND um.meta_key = 'wp_capabilities'
      WHERE u.user_email IS NOT NULL 
      AND u.user_email != ''
      AND (
        um.meta_value LIKE '%"${roleFilter}"%' 
        OR um.meta_value LIKE '%"administrator"%'
        OR um.meta_value LIKE '%"editor"%'
      )
      ORDER BY u.display_name ASC
    `;
    
    const [users] = await connection.execute(query);
    return users;
  } catch (error) {
    console.error('❌ Error al obtener usuarios de WordPress:', error.message);
    throw error;
  }
}

// Función para obtener configuración del sistema
async function getSetting(key, defaultValue = null) {
  try {
    const connection = await getAppConnection();
    const [rows] = await connection.execute(
      'SELECT setting_value FROM condo360_settings WHERE setting_key = ?',
      [key]
    );
    
    return rows.length > 0 ? rows[0].setting_value : defaultValue;
  } catch (error) {
    console.error(`❌ Error al obtener configuración ${key}:`, error.message);
    return defaultValue;
  }
}

// Función para actualizar configuración del sistema
async function updateSetting(key, value) {
  try {
    const connection = await getAppConnection();
    await connection.execute(
      'INSERT INTO condo360_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)',
      [key, value]
    );
    return true;
  } catch (error) {
    console.error(`❌ Error al actualizar configuración ${key}:`, error.message);
    return false;
  }
}

module.exports = {
  getWpConnection,
  getAppConnection,
  initializeDatabase,
  closeConnections,
  getWpUsers,
  getSetting,
  updateSetting,
};
