const path = require('path');

/**
 * Middleware para validar archivos subidos
 */
const validateFileUpload = (req, res, next) => {
  try {
    // Verificar que se subió un archivo
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No se ha subido ningún archivo',
        code: 'NO_FILE_UPLOADED',
      });
    }

    // Verificar campos requeridos
    const { title, wp_user_id } = req.body;
    
    if (!title || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'El título es obligatorio',
        code: 'MISSING_TITLE',
      });
    }

    if (!wp_user_id || isNaN(parseInt(wp_user_id))) {
      return res.status(400).json({
        success: false,
        error: 'El ID de usuario de WordPress es obligatorio',
        code: 'MISSING_WP_USER_ID',
      });
    }

    // Validar tipo de archivo
    const allowedExtensions = ['.pdf', '.docx'];
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
      return res.status(400).json({
        success: false,
        error: 'Tipo de archivo no permitido. Solo se aceptan archivos .docx y .pdf',
        code: 'INVALID_FILE_TYPE',
      });
    }

    // Validar tamaño del archivo
    const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 25 * 1024 * 1024; // 25MB por defecto
    if (req.file.size > maxSize) {
      return res.status(400).json({
        success: false,
        error: `El archivo excede el tamaño máximo permitido (${Math.round(maxSize / 1024 / 1024)}MB)`,
        code: 'FILE_TOO_LARGE',
      });
    }

    // Validar nombre del archivo
    if (req.file.originalname.length > 255) {
      return res.status(400).json({
        success: false,
        error: 'El nombre del archivo es demasiado largo',
        code: 'FILENAME_TOO_LONG',
      });
    }

    // Validar título
    if (title.length > 255) {
      return res.status(400).json({
        success: false,
        error: 'El título es demasiado largo (máximo 255 caracteres)',
        code: 'TITLE_TOO_LONG',
      });
    }

    // Validar descripción si se proporciona
    const { description } = req.body;
    if (description && description.length > 1000) {
      return res.status(400).json({
        success: false,
        error: 'La descripción es demasiado larga (máximo 1000 caracteres)',
        code: 'DESCRIPTION_TOO_LONG',
      });
    }

    // Agregar información del archivo al request para uso posterior
    req.fileInfo = {
      originalName: req.file.originalname,
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
      extension: fileExtension,
      mimeType: req.file.mimetype,
    };

    next();
  } catch (error) {
    console.error('❌ Error en validación de archivo:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno al validar el archivo',
      code: 'VALIDATION_ERROR',
    });
  }
};

module.exports = {
  validateFileUpload,
};
