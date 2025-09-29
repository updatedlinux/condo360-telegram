const express = require('express');
const multer = require('multer');
const path = require('path');
const logger = require('../config/logger');
const config = require('../config');

// Importar controladores
const docxController = require('../controllers/docxController');

// Importar middlewares
const { authenticateApiKey, addUserInfo } = require('../middleware/auth');
const { 
  validateFileUpload, 
  validateUploadParams, 
  validateDeleteParams,
  validateSearchParams,
  validateNumericId 
} = require('../middleware/validation');
const { 
  uploadRateLimit, 
  deleteRateLimit,
  sanitizeInputs, 
  validateBodySize,
  securityLogging 
} = require('../middleware/security');

const router = express.Router();

/**
 * Configuración de Multer para upload de archivos
 * Configurado para mantener archivos en memoria (buffer) para procesamiento
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.files.maxSizeMB * 1024 * 1024, // Límite en bytes
    files: 1 // Solo un archivo por request
  },
  fileFilter: (req, file, cb) => {
    // Validar tipo MIME
    if (!config.files.allowedMimeTypes.includes(file.mimetype)) {
      const error = new Error(`Tipo de archivo no permitido: ${file.mimetype}`);
      error.code = 'INVALID_FILE_TYPE';
      return cb(error, false);
    }

    // Validar extensión
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (!config.files.allowedExtensions.includes(fileExtension)) {
      const error = new Error(`Extensión de archivo no permitida: ${fileExtension}`);
      error.code = 'INVALID_FILE_EXTENSION';
      return cb(error, false);
    }

    cb(null, true);
  }
});

/**
 * Middleware para manejar errores de Multer
 */
const handleMulterError = (error, req, res, next) => {
  const traceId = req.traceId;

  if (error.code === 'LIMIT_FILE_SIZE') {
    logger.logWithTrace(traceId, 'warn', 'Archivo demasiado grande', {
      fileName: req.file?.originalname,
      fileSize: req.file?.size,
      maxSize: config.files.maxSizeMB * 1024 * 1024
    });

    return res.status(400).json({
      success: false,
      error: 'Archivo demasiado grande',
      message: `El archivo excede el tamaño máximo permitido de ${config.files.maxSizeMB}MB`,
      traceId
    });
  }

  if (error.code === 'INVALID_FILE_TYPE') {
    logger.logWithTrace(traceId, 'warn', 'Tipo de archivo no permitido', {
      fileName: req.file?.originalname,
      mimeType: req.file?.mimetype,
      allowedTypes: config.files.allowedMimeTypes
    });

    return res.status(400).json({
      success: false,
      error: 'Tipo de archivo no permitido',
      message: 'Solo se permiten archivos .docx',
      allowedTypes: config.files.allowedMimeTypes,
      traceId
    });
  }

  if (error.code === 'INVALID_FILE_EXTENSION') {
    logger.logWithTrace(traceId, 'warn', 'Extensión de archivo no permitida', {
      fileName: req.file?.originalname,
      extension: path.extname(req.file?.originalname),
      allowedExtensions: config.files.allowedExtensions
    });

    return res.status(400).json({
      success: false,
      error: 'Extensión de archivo no permitida',
      message: 'Solo se permiten archivos con extensión .docx',
      allowedExtensions: config.files.allowedExtensions,
      traceId
    });
  }

  if (error.code === 'LIMIT_FILE_COUNT') {
    logger.logWithTrace(traceId, 'warn', 'Demasiados archivos', {
      fileCount: req.files?.length,
      maxFiles: 1
    });

    return res.status(400).json({
      success: false,
      error: 'Demasiados archivos',
      message: 'Solo se permite subir un archivo por request',
      traceId
    });
  }

  // Error genérico de Multer
  logger.logWithTrace(traceId, 'error', 'Error de Multer', {
    error: error.message,
    code: error.code,
    stack: error.stack
  });

  res.status(500).json({
    success: false,
    error: 'Error interno del servidor al procesar archivo',
    message: error.message,
    traceId
  });
};

/**
 * POST /api/v1/docx/upload
 * Endpoint para subir archivo .docx y crear post en WordPress
 * 
 * Body (multipart/form-data):
 * - file: archivo .docx (requerido)
 * - title: título del post (opcional, por defecto nombre del archivo)
 * - status: estado del post - 'draft' o 'publish' (opcional, por defecto 'draft')
 * - created_by: identificador del usuario que crea el post (opcional)
 * 
 * Headers:
 * - X-API-KEY: clave API para autenticación (requerido)
 * - Content-Type: multipart/form-data
 */
router.post('/upload',
  // Middlewares de seguridad y autenticación
  uploadRateLimit,
  authenticateApiKey,
  addUserInfo,
  securityLogging,
  sanitizeInputs,
  validateBodySize(15), // 15MB para archivos grandes
  
  // Middleware de upload de archivo
  upload.single('file'),
  handleMulterError,
  
  // Validaciones específicas
  validateFileUpload,
  validateUploadParams,
  
  // Controlador
  docxController.uploadDocx
);

/**
 * DELETE /api/v1/posts/:wp_post_id
 * Endpoint para eliminar post de WordPress y opcionalmente sus medios asociados
 * 
 * Parámetros de ruta:
 * - wp_post_id: ID del post en WordPress (requerido)
 * 
 * Parámetros de consulta:
 * - delete_media: 'true' o 'false' para eliminar medios asociados (opcional, por defecto 'false')
 * 
 * Headers:
 * - X-API-KEY: clave API para autenticación (requerido)
 */
router.delete('/posts/:wp_post_id',
  // Middlewares de seguridad y autenticación
  deleteRateLimit,
  authenticateApiKey,
  addUserInfo,
  securityLogging,
  sanitizeInputs,
  
  // Validaciones
  validateNumericId('wp_post_id'),
  validateDeleteParams,
  
  // Controlador
  docxController.deletePost
);

/**
 * GET /api/v1/posts/history/:history_id
 * Endpoint para obtener registro específico del historial de procesamiento
 * 
 * Parámetros de ruta:
 * - history_id: ID del registro de historial (requerido)
 * 
 * Headers:
 * - X-API-KEY: clave API para autenticación (requerido)
 */
router.get('/posts/history/:history_id',
  // Middlewares de seguridad y autenticación
  authenticateApiKey,
  addUserInfo,
  securityLogging,
  sanitizeInputs,
  
  // Validaciones
  validateNumericId('history_id'),
  
  // Controlador
  docxController.getHistoryById
);

/**
 * GET /api/v1/posts/history
 * Endpoint para buscar registros del historial de procesamiento con filtros
 * 
 * Parámetros de consulta:
 * - wp_post_id: ID del post en WordPress (opcional)
 * - created_by: identificador del usuario (opcional, búsqueda parcial)
 * - status: estado del procesamiento - 'processing', 'completed', 'failed', 'deleted' (opcional)
 * - start_date: fecha de inicio para filtrar (opcional, formato ISO)
 * - end_date: fecha de fin para filtrar (opcional, formato ISO)
 * - page: número de página para paginación (opcional, por defecto 1)
 * - limit: cantidad de registros por página (opcional, por defecto 20, máximo 100)
 * 
 * Headers:
 * - X-API-KEY: clave API para autenticación (requerido)
 */
router.get('/posts/history',
  // Middlewares de seguridad y autenticación
  authenticateApiKey,
  addUserInfo,
  securityLogging,
  sanitizeInputs,
  
  // Validaciones
  validateSearchParams,
  
  // Controlador
  docxController.searchHistory
);

/**
 * Middleware para logging de rutas no encontradas
 */
router.use('*', (req, res) => {
  const traceId = req.traceId;
  
  logger.logWithTrace(traceId, 'warn', 'Ruta no encontrada', {
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
      'POST /api/v1/docx/upload',
      'DELETE /api/v1/posts/:wp_post_id',
      'GET /api/v1/posts/history/:history_id',
      'GET /api/v1/posts/history'
    ],
    traceId
  });
});

module.exports = router;

