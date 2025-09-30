-- Scripts SQL para crear las tablas del sistema de comunicados
-- Ejecutar en la base de datos MySQL

-- Tabla principal de comunicados
CREATE TABLE IF NOT EXISTS `condo360_communiques` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `wp_user_id` BIGINT UNSIGNED NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `original_filename` VARCHAR(255) NOT NULL,
  `file_type` ENUM('docx', 'pdf') NOT NULL,
  `wp_post_id` BIGINT UNSIGNED,
  `wp_post_url` VARCHAR(255),
  `wp_media_id` BIGINT UNSIGNED,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_wp_user_id` (`wp_user_id`),
  INDEX `idx_wp_post_id` (`wp_post_id`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de notificaciones enviadas
CREATE TABLE IF NOT EXISTS `condo360_communiques_notifications` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `communique_id` BIGINT NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `status` ENUM('sent', 'error') NOT NULL,
  `message` TEXT NULL,
  `sent_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`communique_id`) REFERENCES `condo360_communiques`(`id`) ON DELETE CASCADE,
  INDEX `idx_communique_id` (`communique_id`),
  INDEX `idx_email` (`email`),
  INDEX `idx_status` (`status`),
  INDEX `idx_sent_at` (`sent_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla para cola de envío de correos
CREATE TABLE IF NOT EXISTS `condo360_email_queue` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `communique_id` BIGINT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `wp_post_url` VARCHAR(500),
  `status` ENUM('pending','processing','completed','failed') DEFAULT 'pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `processed_at` TIMESTAMP NULL,
  `error_message` TEXT NULL,
  FOREIGN KEY (`communique_id`) REFERENCES `condo360_communiques`(`id`) ON DELETE CASCADE,
  INDEX `idx_status` (`status`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de configuración del sistema
CREATE TABLE IF NOT EXISTS `condo360_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `setting_key` VARCHAR(100) NOT NULL UNIQUE,
  `setting_value` TEXT,
  `description` VARCHAR(255),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar configuraciones por defecto
INSERT INTO `condo360_settings` (`setting_key`, `setting_value`, `description`) VALUES
('email_template_logo_url', 'https://bonaventurecclub.com/wp-content/uploads/2025/09/2.png', 'URL del logo para emails'),
('email_template_logo_width', '281', 'Ancho del logo en emails'),
('email_template_logo_height', '94', 'Alto del logo en emails'),
('notification_role_filter', 'subscriber', 'Rol de usuarios a notificar'),
('max_file_size_mb', '25', 'Tamaño máximo de archivo en MB'),
('allowed_file_types', 'docx,pdf', 'Tipos de archivo permitidos')
ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);

-- Crear índices adicionales para optimización
CREATE INDEX `idx_communiques_file_type` ON `condo360_communiques` (`file_type`);
CREATE INDEX `idx_notifications_created_at` ON `condo360_communiques_notifications` (`created_at`);

-- Vista para estadísticas de comunicados
CREATE OR REPLACE VIEW `condo360_communiques_stats` AS
SELECT 
    DATE(created_at) as fecha,
    COUNT(*) as total_comunicados,
    COUNT(CASE WHEN file_type = 'docx' THEN 1 END) as comunicados_docx,
    COUNT(CASE WHEN file_type = 'pdf' THEN 1 END) as comunicados_pdf,
    COUNT(DISTINCT wp_user_id) as usuarios_activos
FROM `condo360_communiques`
GROUP BY DATE(created_at)
ORDER BY fecha DESC;
