-- =====================================================
-- Script SQL para crear tabla condo360_posts_history
-- Condo360 WordPress API
-- =====================================================

-- Crear tabla principal para el historial de procesamiento de posts
CREATE TABLE IF NOT EXISTS condo360_posts_history (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    wp_post_id BIGINT UNSIGNED NULL COMMENT 'ID del post en WordPress',
    title VARCHAR(255) NOT NULL COMMENT 'Título del post',
    status VARCHAR(50) NOT NULL COMMENT 'Estado del procesamiento: processing, completed, failed, deleted',
    created_by VARCHAR(255) NULL COMMENT 'Usuario que creó el post (telegram user id o email)',
    telegram_chat_id VARCHAR(50) NULL COMMENT 'ID del chat de Telegram',
    telegram_message_id VARCHAR(50) NULL COMMENT 'ID del mensaje de Telegram',
    file_name VARCHAR(255) NULL COMMENT 'Nombre del archivo original',
    media_ids JSON NULL COMMENT 'Array JSON de media IDs subidos a WordPress',
    wp_response JSON NULL COMMENT 'Respuesta completa de WordPress al crear el post',
    error_message TEXT NULL COMMENT 'Mensaje de error si el procesamiento falló',
    created_at DATETIME NOT NULL COMMENT 'Fecha de creación del registro',
    updated_at DATETIME NOT NULL COMMENT 'Fecha de última actualización',
    timezone VARCHAR(50) NOT NULL DEFAULT 'America/Caracas' COMMENT 'Zona horaria del registro',
    
    -- Índices para optimizar consultas
    INDEX idx_wp_post_id (wp_post_id),
    INDEX idx_created_by (created_by),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_telegram_chat_id (telegram_chat_id),
    INDEX idx_file_name (file_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Historial de procesamiento de posts de Condo360';

-- =====================================================
-- Tabla opcional para control de migraciones
-- =====================================================

CREATE TABLE IF NOT EXISTS condo360_migrations (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    migration_id VARCHAR(255) NOT NULL UNIQUE COMMENT 'ID único de la migración',
    name VARCHAR(255) NOT NULL COMMENT 'Nombre descriptivo de la migración',
    description TEXT NULL COMMENT 'Descripción detallada de la migración',
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha y hora de ejecución',
    executed_by VARCHAR(255) DEFAULT 'migrate-db-script' COMMENT 'Usuario o script que ejecutó la migración',
    notes TEXT NULL COMMENT 'Notas adicionales sobre la migración',
    
    INDEX idx_migration_id (migration_id),
    INDEX idx_executed_at (executed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Control de migraciones de Condo360';

-- =====================================================
-- Insertar migración inicial
-- =====================================================

INSERT IGNORE INTO condo360_migrations (
    migration_id,
    name,
    description,
    executed_by,
    notes
) VALUES (
    '001_create_posts_history_table',
    'Crear tabla condo360_posts_history',
    'Crea la tabla principal para el historial de procesamiento de posts',
    'database.sql',
    'Migración inicial creada manualmente'
);

-- =====================================================
-- Verificar que las tablas fueron creadas correctamente
-- =====================================================

-- Mostrar información de las tablas creadas
SELECT 
    TABLE_NAME as 'Tabla',
    TABLE_COMMENT as 'Descripción',
    TABLE_ROWS as 'Filas',
    CREATE_TIME as 'Creada'
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME LIKE 'condo360_%'
ORDER BY TABLE_NAME;

-- Mostrar estructura de la tabla principal
DESCRIBE condo360_posts_history;

-- Mostrar índices de la tabla principal
SHOW INDEX FROM condo360_posts_history;

-- =====================================================
-- Ejemplos de consultas útiles
-- =====================================================

-- Consultar todos los registros de historial
-- SELECT * FROM condo360_posts_history ORDER BY created_at DESC LIMIT 10;

-- Consultar posts por usuario
-- SELECT * FROM condo360_posts_history WHERE created_by = 'usuario123' ORDER BY created_at DESC;

-- Consultar posts por estado
-- SELECT * FROM condo360_posts_history WHERE status = 'completed' ORDER BY created_at DESC;

-- Consultar posts con errores
-- SELECT * FROM condo360_posts_history WHERE status = 'failed' ORDER BY created_at DESC;

-- Consultar estadísticas por día
-- SELECT 
--     DATE(created_at) as fecha,
--     COUNT(*) as total_posts,
--     SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as exitosos,
--     SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as fallidos
-- FROM condo360_posts_history 
-- GROUP BY DATE(created_at) 
-- ORDER BY fecha DESC;

-- =====================================================
-- Notas importantes
-- =====================================================

/*
IMPORTANTE: 
- Este script debe ejecutarse en la MISMA base de datos de WordPress
- Asegúrate de tener permisos de CREATE TABLE en la base de datos
- Las tablas usan el prefijo 'condo360_' para evitar conflictos
- Los campos JSON permiten almacenar datos complejos de WordPress
- Los índices optimizan las consultas más comunes
- La zona horaria por defecto es 'America/Caracas' (GMT-4)

REQUISITOS:
- MySQL >= 5.7 (para soporte completo de JSON)
- InnoDB engine (para transacciones y foreign keys)
- utf8mb4 charset (para caracteres Unicode completos)

MANTENIMIENTO:
- Los logs se rotan automáticamente por la aplicación
- Considera hacer backup regular de esta tabla
- Monitorea el crecimiento de la tabla para optimización
*/

