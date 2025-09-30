/**
 * Middleware para manejo centralizado de errores
 */

const errorHandler = (err, req, res, next) => {
  console.error('❌ Error capturado:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // Error de validación de archivo
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: 'El archivo excede el tamaño máximo permitido (25MB)',
      code: 'FILE_TOO_LARGE',
    });
  }

  // Error de tipo de archivo
  if (err.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({
      success: false,
      error: 'Tipo de archivo no permitido. Solo se aceptan archivos .docx y .pdf',
      code: 'INVALID_FILE_TYPE',
    });
  }

  // Error de WordPress API
  if (err.code === 'WP_API_ERROR') {
    return res.status(502).json({
      success: false,
      error: 'Error al comunicarse con WordPress',
      details: err.message,
      code: 'WP_API_ERROR',
    });
  }

  // Error de base de datos
  if (err.code === 'DB_ERROR') {
    return res.status(500).json({
      success: false,
      error: 'Error interno de base de datos',
      code: 'DB_ERROR',
    });
  }

  // Error de SMTP
  if (err.code === 'SMTP_ERROR') {
    return res.status(500).json({
      success: false,
      error: 'Error al enviar notificaciones por correo',
      details: err.message,
      code: 'SMTP_ERROR',
    });
  }

  // Error de procesamiento de archivo
  if (err.code === 'FILE_PROCESSING_ERROR') {
    return res.status(500).json({
      success: false,
      error: 'Error al procesar el archivo',
      details: err.message,
      code: 'FILE_PROCESSING_ERROR',
    });
  }

  // Error de validación
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Error de validación',
      details: err.message,
      code: 'VALIDATION_ERROR',
    });
  }

  // Error genérico
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Error interno del servidor' 
      : err.message,
    code: err.code || 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};

module.exports = {
  errorHandler,
};
