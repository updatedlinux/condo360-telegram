const swaggerJsdoc = require('swagger-jsdoc');
const config = require('../config');

/**
 * Configuración de Swagger/OpenAPI 3.0 para la API
 * Documentación completa en español con ejemplos
 */
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: config.swagger.title,
      description: config.swagger.description,
      version: config.swagger.version,
      contact: {
        name: 'Condo360 Team',
        email: 'support@condo360.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: `http://${config.swagger.host}`,
        description: 'Servidor de desarrollo'
      },
      {
        url: `https://${config.swagger.host}`,
        description: 'Servidor de producción'
      }
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-KEY',
          description: 'Clave API para autenticación. Debe proporcionarse en el header X-API-KEY.'
        },
        TelegramWebhookAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-Telegram-Secret',
          description: 'Secret del webhook de Telegram para validación de requests.'
        }
      },
      schemas: {
        // Esquemas de respuesta comunes
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
              description: 'Indica si la operación fue exitosa'
            },
            message: {
              type: 'string',
              description: 'Mensaje descriptivo de la operación'
            },
            data: {
              type: 'object',
              description: 'Datos de respuesta específicos de la operación'
            },
            traceId: {
              type: 'string',
              format: 'uuid',
              description: 'ID único para rastrear la request'
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
              description: 'Indica si la operación fue exitosa'
            },
            error: {
              type: 'string',
              description: 'Tipo de error'
            },
            message: {
              type: 'string',
              description: 'Mensaje descriptivo del error'
            },
            details: {
              type: 'object',
              description: 'Detalles adicionales del error'
            },
            traceId: {
              type: 'string',
              format: 'uuid',
              description: 'ID único para rastrear la request'
            }
          }
        },
        
        // Esquemas específicos de la API
        UploadRequest: {
          type: 'object',
          required: ['file'],
          properties: {
            file: {
              type: 'string',
              format: 'binary',
              description: 'Archivo .docx a procesar (requerido)'
            },
            title: {
              type: 'string',
              maxLength: 255,
              description: 'Título del post (opcional, por defecto nombre del archivo)',
              example: 'Mi Documento Importante'
            },
            status: {
              type: 'string',
              enum: ['draft', 'publish'],
              default: 'draft',
              description: 'Estado del post en WordPress',
              example: 'draft'
            },
            created_by: {
              type: 'string',
              maxLength: 255,
              description: 'Identificador del usuario que crea el post',
              example: 'usuario123'
            }
          }
        },
        UploadResponse: {
          allOf: [
            { $ref: '#/components/schemas/SuccessResponse' },
            {
              type: 'object',
              properties: {
                data: {
                  type: 'object',
                  properties: {
                    history_id: {
                      type: 'integer',
                      description: 'ID del registro en el historial',
                      example: 123
                    },
                    wp_post_id: {
                      type: 'integer',
                      description: 'ID del post creado en WordPress',
                      example: 456
                    },
                    title: {
                      type: 'string',
                      description: 'Título del post creado',
                      example: 'Mi Documento Importante'
                    },
                    status: {
                      type: 'string',
                      description: 'Estado del post en WordPress',
                      example: 'draft'
                    },
                    link: {
                      type: 'string',
                      format: 'uri',
                      description: 'URL del post en WordPress',
                      example: 'https://tudominio.com/2024/01/15/mi-documento-importante/'
                    },
                    featured_media: {
                      type: 'integer',
                      nullable: true,
                      description: 'ID del media destacado',
                      example: 789
                    },
                    images_count: {
                      type: 'integer',
                      description: 'Cantidad de imágenes procesadas',
                      example: 3
                    },
                    processing_time: {
                      type: 'string',
                      description: 'Tiempo de procesamiento',
                      example: '2.5s'
                    }
                  }
                }
              }
            }
          ]
        },
        DeleteResponse: {
          allOf: [
            { $ref: '#/components/schemas/SuccessResponse' },
            {
              type: 'object',
              properties: {
                data: {
                  type: 'object',
                  properties: {
                    wp_post_id: {
                      type: 'integer',
                      description: 'ID del post eliminado',
                      example: 456
                    },
                    wp_deleted: {
                      type: 'boolean',
                      description: 'Si el post fue eliminado de WordPress',
                      example: true
                    },
                    media_deletion: {
                      type: 'object',
                      properties: {
                        requested: {
                          type: 'boolean',
                          description: 'Si se solicitó eliminar medios',
                          example: true
                        },
                        total: {
                          type: 'integer',
                          description: 'Total de medios a eliminar',
                          example: 3
                        },
                        successful: {
                          type: 'integer',
                          description: 'Medios eliminados exitosamente',
                          example: 3
                        },
                        failed: {
                          type: 'integer',
                          description: 'Medios que fallaron al eliminar',
                          example: 0
                        },
                        results: {
                          type: 'array',
                          description: 'Resultados detallados de eliminación de medios',
                          items: {
                            type: 'object',
                            properties: {
                              mediaId: {
                                type: 'integer',
                                example: 789
                              },
                              success: {
                                type: 'boolean',
                                example: true
                              },
                              result: {
                                type: 'object',
                                description: 'Resultado de la eliminación'
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          ]
        },
        HistoryRecord: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'ID del registro de historial',
              example: 123
            },
            wp_post_id: {
              type: 'integer',
              nullable: true,
              description: 'ID del post en WordPress',
              example: 456
            },
            title: {
              type: 'string',
              description: 'Título del post',
              example: 'Mi Documento Importante'
            },
            status: {
              type: 'string',
              enum: ['processing', 'completed', 'failed', 'deleted'],
              description: 'Estado del procesamiento',
              example: 'completed'
            },
            created_by: {
              type: 'string',
              nullable: true,
              description: 'Usuario que creó el post',
              example: 'usuario123'
            },
            telegram_chat_id: {
              type: 'string',
              nullable: true,
              description: 'ID del chat de Telegram',
              example: '123456789'
            },
            telegram_message_id: {
              type: 'string',
              nullable: true,
              description: 'ID del mensaje de Telegram',
              example: '987654321'
            },
            file_name: {
              type: 'string',
              nullable: true,
              description: 'Nombre del archivo original',
              example: 'documento.docx'
            },
            media_ids: {
              type: 'array',
              nullable: true,
              description: 'IDs de medios subidos a WordPress',
              items: {
                type: 'integer'
              },
              example: [789, 790, 791]
            },
            wp_response: {
              type: 'object',
              nullable: true,
              description: 'Respuesta completa de WordPress',
              properties: {
                wpPostId: {
                  type: 'integer',
                  example: 456
                },
                title: {
                  type: 'string',
                  example: 'Mi Documento Importante'
                },
                link: {
                  type: 'string',
                  format: 'uri',
                  example: 'https://tudominio.com/2024/01/15/mi-documento-importante/'
                }
              }
            },
            error_message: {
              type: 'string',
              nullable: true,
              description: 'Mensaje de error si el procesamiento falló'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de creación del registro',
              example: '2024-01-15T10:30:00'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de última actualización',
              example: '2024-01-15T10:32:30'
            },
            timezone: {
              type: 'string',
              description: 'Zona horaria del registro',
              example: 'America/Caracas'
            }
          }
        },
        HealthCheck: {
          type: 'object',
          properties: {
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp de la verificación'
            },
            timezone: {
              type: 'string',
              description: 'Zona horaria configurada',
              example: 'America/Caracas'
            },
            environment: {
              type: 'string',
              description: 'Entorno de ejecución',
              example: 'production'
            },
            version: {
              type: 'string',
              description: 'Versión de la API',
              example: '1.0.0'
            },
            overall: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  enum: ['healthy', 'unhealthy'],
                  description: 'Estado general del sistema'
                },
                message: {
                  type: 'string',
                  description: 'Mensaje descriptivo del estado'
                },
                criticalChecksHealthy: {
                  type: 'boolean',
                  description: 'Si las verificaciones críticas están saludables'
                }
              }
            },
            checks: {
              type: 'object',
              properties: {
                database: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      enum: ['healthy', 'unhealthy'],
                      description: 'Estado de la conexión a MySQL'
                    },
                    message: {
                      type: 'string',
                      description: 'Mensaje descriptivo'
                    },
                    details: {
                      type: 'object',
                      properties: {
                        host: { type: 'string' },
                        port: { type: 'integer' },
                        database: { type: 'string' }
                      }
                    }
                  }
                },
                wordpress: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      enum: ['healthy', 'unhealthy'],
                      description: 'Estado de la conexión a WordPress'
                    },
                    message: {
                      type: 'string',
                      description: 'Mensaje descriptivo'
                    },
                    details: {
                      type: 'object',
                      properties: {
                        url: { type: 'string' },
                        apiUrl: { type: 'string' }
                      }
                    }
                  }
                },
                redis: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      enum: ['healthy', 'unhealthy', 'disabled'],
                      description: 'Estado de la conexión a Redis'
                    },
                    message: {
                      type: 'string',
                      description: 'Mensaje descriptivo'
                    }
                  }
                },
                telegram: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      enum: ['configured', 'disabled'],
                      description: 'Estado de la configuración de Telegram'
                    },
                    message: {
                      type: 'string',
                      description: 'Mensaje descriptivo'
                    }
                  }
                }
              }
            },
            responseTime: {
              type: 'string',
              description: 'Tiempo de respuesta de la verificación',
              example: '150ms'
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Documentos',
        description: 'Endpoints para procesamiento de archivos .docx'
      },
      {
        name: 'Posts',
        description: 'Endpoints para gestión de posts de WordPress'
      },
      {
        name: 'Historial',
        description: 'Endpoints para consulta del historial de procesamiento'
      },
      {
        name: 'Salud',
        description: 'Endpoints para verificación del estado del sistema'
      }
    ]
  },
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js'
  ]
};

// Generar especificación de Swagger
const swaggerSpec = swaggerJsdoc(swaggerOptions);

module.exports = swaggerSpec;

