const Joi = require('joi');
const logger = require('../config/logger');
const config = require('../config');

/**
 * Middleware para validar archivos subidos
 * Valida tipo MIME, extensión y tamaño de archivos
 */
const validateFileUpload = (req, res, next) => {
  const traceId = req.traceId;

  try {
    if (!req.file) {
      logger.logWithTrace(traceId, 'warn', 'Validación de archivo fallida: no se proporcionó archivo');
      return res.status(400).json({
        success: false,
        error: 'No se proporcionó ningún archivo',
        message: 'Debe subir un archivo .docx válido',
        traceId
      });
    }

    const file = req.file;
    const maxSizeBytes = config.files.maxSizeMB * 1024 * 1024;

    // Validar tamaño de archivo
    if (file.size > maxSizeBytes) {
      logger.logWithTrace(traceId, 'warn', 'Validación de archivo fallida: tamaño excedido', {
        fileSize: file.size,
        maxSize: maxSizeBytes,
        fileName: file.originalname
      });

      return res.status(400).json({
        success: false,
        error: 'Archivo demasiado grande',
        message: `El archivo excede el tamaño máximo permitido de ${config.files.maxSizeMB}MB`,
        details: {
          fileSize: file.size,
          maxSize: maxSizeBytes,
          fileName: file.originalname
        },
        traceId
      });
    }

    // Validar tipo MIME
    if (!config.files.allowedMimeTypes.includes(file.mimetype)) {
      logger.logWithTrace(traceId, 'warn', 'Validación de archivo fallida: tipo MIME no permitido', {
        mimeType: file.mimetype,
        fileName: file.originalname,
        allowedTypes: config.files.allowedMimeTypes
      });

      return res.status(400).json({
        success: false,
        error: 'Tipo de archivo no permitido',
        message: 'Solo se permiten archivos .docx',
        details: {
          providedMimeType: file.mimetype,
          allowedMimeTypes: config.files.allowedMimeTypes,
          fileName: file.originalname
        },
        traceId
      });
    }

    // Validar extensión de archivo
    const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    if (!config.files.allowedExtensions.includes(fileExtension)) {
      logger.logWithTrace(traceId, 'warn', 'Validación de archivo fallida: extensión no permitida', {
        extension: fileExtension,
        fileName: file.originalname,
        allowedExtensions: config.files.allowedExtensions
      });

      return res.status(400).json({
        success: false,
        error: 'Extensión de archivo no permitida',
        message: 'Solo se permiten archivos con extensión .docx',
        details: {
          providedExtension: fileExtension,
          allowedExtensions: config.files.allowedExtensions,
          fileName: file.originalname
        },
        traceId
      });
    }

    logger.logWithTrace(traceId, 'info', 'Validación de archivo exitosa', {
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      extension: fileExtension
    });

    next();

  } catch (error) {
    logger.logWithTrace(traceId, 'error', 'Error en validación de archivo', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Error interno del servidor en validación de archivo',
      message: error.message,
      traceId
    });
  }
};

/**
 * Esquema de validación para parámetros de upload de .docx
 */
const uploadDocxSchema = Joi.object({
  title: Joi.string()
    .min(1)
    .max(255)
    .optional()
    .messages({
      'string.min': 'El título debe tener al menos 1 carácter',
      'string.max': 'El título no puede exceder 255 caracteres'
    }),
  
  status: Joi.string()
    .valid('draft', 'publish')
    .default('draft')
    .messages({
      'any.only': 'El estado debe ser "draft" o "publish"'
    }),
  
  created_by: Joi.string()
    .min(1)
    .max(255)
    .optional()
    .messages({
      'string.min': 'El campo created_by debe tener al menos 1 carácter',
      'string.max': 'El campo created_by no puede exceder 255 caracteres'
    })
});

/**
 * Middleware para validar parámetros de upload de .docx
 */
const validateUploadParams = (req, res, next) => {
  const traceId = req.traceId;

  try {
    const { error, value } = uploadDocxSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      logger.logWithTrace(traceId, 'warn', 'Validación de parámetros de upload fallida', {
        errors: errorDetails,
        body: req.body
      });

      return res.status(400).json({
        success: false,
        error: 'Parámetros de entrada inválidos',
        message: 'Los parámetros proporcionados no son válidos',
        details: errorDetails,
        traceId
      });
    }

    // Actualizar req.body con valores validados
    req.body = value;

    logger.logWithTrace(traceId, 'info', 'Validación de parámetros de upload exitosa', {
      validatedBody: value
    });

    next();

  } catch (error) {
    logger.logWithTrace(traceId, 'error', 'Error en validación de parámetros de upload', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Error interno del servidor en validación de parámetros',
      message: error.message,
      traceId
    });
  }
};

/**
 * Esquema de validación para parámetros de eliminación de post
 */
const deletePostSchema = Joi.object({
  delete_media: Joi.string()
    .valid('true', 'false')
    .default('false')
    .messages({
      'any.only': 'El parámetro delete_media debe ser "true" o "false"'
    })
});

/**
 * Middleware para validar parámetros de eliminación de post
 */
const validateDeleteParams = (req, res, next) => {
  const traceId = req.traceId;

  try {
    const { error, value } = deletePostSchema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      logger.logWithTrace(traceId, 'warn', 'Validación de parámetros de eliminación fallida', {
        errors: errorDetails,
        query: req.query
      });

      return res.status(400).json({
        success: false,
        error: 'Parámetros de consulta inválidos',
        message: 'Los parámetros de consulta proporcionados no son válidos',
        details: errorDetails,
        traceId
      });
    }

    // Actualizar req.query con valores validados
    req.query = value;

    logger.logWithTrace(traceId, 'info', 'Validación de parámetros de eliminación exitosa', {
      validatedQuery: value
    });

    next();

  } catch (error) {
    logger.logWithTrace(traceId, 'error', 'Error en validación de parámetros de eliminación', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Error interno del servidor en validación de parámetros',
      message: error.message,
      traceId
    });
  }
};

/**
 * Esquema de validación para parámetros de búsqueda de historial
 */
const searchHistorySchema = Joi.object({
  wp_post_id: Joi.number()
    .integer()
    .positive()
    .optional()
    .messages({
      'number.base': 'wp_post_id debe ser un número',
      'number.integer': 'wp_post_id debe ser un número entero',
      'number.positive': 'wp_post_id debe ser un número positivo'
    }),
  
  created_by: Joi.string()
    .min(1)
    .max(255)
    .optional()
    .messages({
      'string.min': 'created_by debe tener al menos 1 carácter',
      'string.max': 'created_by no puede exceder 255 caracteres'
    }),
  
  status: Joi.string()
    .valid('processing', 'completed', 'failed', 'deleted')
    .optional()
    .messages({
      'any.only': 'El estado debe ser uno de: processing, completed, failed, deleted'
    }),
  
  start_date: Joi.date()
    .iso()
    .optional()
    .messages({
      'date.format': 'start_date debe estar en formato ISO (YYYY-MM-DD)'
    }),
  
  end_date: Joi.date()
    .iso()
    .min(Joi.ref('start_date'))
    .optional()
    .messages({
      'date.format': 'end_date debe estar en formato ISO (YYYY-MM-DD)',
      'date.min': 'end_date debe ser posterior a start_date'
    }),
  
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.base': 'page debe ser un número',
      'number.integer': 'page debe ser un número entero',
      'number.min': 'page debe ser mayor a 0'
    }),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .messages({
      'number.base': 'limit debe ser un número',
      'number.integer': 'limit debe ser un número entero',
      'number.min': 'limit debe ser mayor a 0',
      'number.max': 'limit no puede exceder 100'
    })
});

/**
 * Middleware para validar parámetros de búsqueda de historial
 */
const validateSearchParams = (req, res, next) => {
  const traceId = req.traceId;

  try {
    const { error, value } = searchHistorySchema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      logger.logWithTrace(traceId, 'warn', 'Validación de parámetros de búsqueda fallida', {
        errors: errorDetails,
        query: req.query
      });

      return res.status(400).json({
        success: false,
        error: 'Parámetros de consulta inválidos',
        message: 'Los parámetros de consulta proporcionados no son válidos',
        details: errorDetails,
        traceId
      });
    }

    // Actualizar req.query con valores validados
    req.query = value;

    logger.logWithTrace(traceId, 'info', 'Validación de parámetros de búsqueda exitosa', {
      validatedQuery: value
    });

    next();

  } catch (error) {
    logger.logWithTrace(traceId, 'error', 'Error en validación de parámetros de búsqueda', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Error interno del servidor en validación de parámetros',
      message: error.message,
      traceId
    });
  }
};

/**
 * Middleware para validar parámetros de ruta (IDs numéricos)
 */
const validateNumericId = (paramName) => {
  return (req, res, next) => {
    const traceId = req.traceId;
    const id = req.params[paramName];

    try {
      const numericId = parseInt(id);

      if (isNaN(numericId) || numericId <= 0) {
        logger.logWithTrace(traceId, 'warn', `Validación de ID fallida: ${paramName} inválido`, {
          providedId: id,
          paramName
        });

        return res.status(400).json({
          success: false,
          error: `ID inválido`,
          message: `El parámetro ${paramName} debe ser un número entero positivo`,
          details: {
            paramName,
            providedValue: id
          },
          traceId
        });
      }

      // Actualizar el parámetro con el valor numérico
      req.params[paramName] = numericId;

      logger.logWithTrace(traceId, 'info', `Validación de ID exitosa: ${paramName}`, {
        paramName,
        validatedId: numericId
      });

      next();

    } catch (error) {
      logger.logWithTrace(traceId, 'error', `Error en validación de ID: ${paramName}`, {
        error: error.message,
        paramName,
        providedId: id
      });

      res.status(500).json({
        success: false,
        error: 'Error interno del servidor en validación de ID',
        message: error.message,
        traceId
      });
    }
  };
};

module.exports = {
  validateFileUpload,
  validateUploadParams,
  validateDeleteParams,
  validateSearchParams,
  validateNumericId
};

