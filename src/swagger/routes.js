const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./index');
const logger = require('../config/logger');
const { publicEndpoint } = require('../middleware/auth');

const router = express.Router();

/**
 * Configuración personalizada de Swagger UI
 */
const swaggerUiOptions = {
  customCss: `
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin: 20px 0; }
    .swagger-ui .info .title { color: #2c3e50; }
    .swagger-ui .scheme-container { background: #f8f9fa; padding: 10px; border-radius: 5px; }
    .swagger-ui .btn.authorize { background-color: #3498db; border-color: #3498db; }
    .swagger-ui .btn.authorize:hover { background-color: #2980b9; border-color: #2980b9; }
    .swagger-ui .response-col_status { font-weight: bold; }
    .swagger-ui .response-col_status-200 { color: #27ae60; }
    .swagger-ui .response-col_status-400 { color: #e74c3c; }
    .swagger-ui .response-col_status-401 { color: #e74c3c; }
    .swagger-ui .response-col_status-403 { color: #e74c3c; }
    .swagger-ui .response-col_status-404 { color: #e74c3c; }
    .swagger-ui .response-col_status-500 { color: #e74c3c; }
  `,
  customSiteTitle: 'Condo360 WordPress API - Documentación',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    tryItOutEnabled: true,
    requestInterceptor: (req) => {
      // Agregar información de logging para requests desde Swagger UI
      logger.info('Request desde Swagger UI', {
        method: req.method,
        url: req.url,
        headers: req.headers
      });
      return req;
    }
  }
};

/**
 * GET /api-docs
 * Endpoint principal de documentación Swagger
 * Sirve la interfaz de Swagger UI con la documentación completa
 */
router.get('/',
  publicEndpoint,
  (req, res, next) => {
    logger.info('Acceso a documentación Swagger', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      traceId: req.traceId
    });
    next();
  },
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, swaggerUiOptions)
);

/**
 * GET /api-docs.json
 * Endpoint para obtener la especificación OpenAPI en formato JSON
 * Útil para integración con otras herramientas de documentación
 */
router.get('/json',
  publicEndpoint,
  (req, res) => {
    logger.info('Acceso a especificación OpenAPI JSON', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      traceId: req.traceId
    });

    res.setHeader('Content-Type', 'application/json');
    res.json(swaggerSpec);
  }
);

/**
 * GET /api-docs.yaml
 * Endpoint para obtener la especificación OpenAPI en formato YAML
 * Útil para integración con herramientas que prefieren YAML
 */
router.get('/yaml',
  publicEndpoint,
  (req, res) => {
    logger.info('Acceso a especificación OpenAPI YAML', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      traceId: req.traceId
    });

    const yaml = require('js-yaml');
    const yamlSpec = yaml.dump(swaggerSpec, {
      indent: 2,
      lineWidth: 120,
      noRefs: true
    });

    res.setHeader('Content-Type', 'text/yaml');
    res.send(yamlSpec);
  }
);

/**
 * GET /api-docs/redoc
 * Endpoint alternativo con documentación en formato ReDoc
 * Proporciona una interfaz alternativa para visualizar la documentación
 */
router.get('/redoc',
  publicEndpoint,
  (req, res) => {
    logger.info('Acceso a documentación ReDoc', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      traceId: req.traceId
    });

    const redocHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Condo360 WordPress API - ReDoc</title>
          <meta charset="utf-8"/>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
          <style>
            body { margin: 0; padding: 0; }
          </style>
        </head>
        <body>
          <redoc spec-url='/api-docs/json'></redoc>
          <script src="https://cdn.jsdelivr.net/npm/redoc@latest/bundles/redoc.standalone.js"></script>
        </body>
      </html>
    `;

    res.send(redocHtml);
  }
);

/**
 * Middleware para manejar rutas no encontradas en Swagger
 */
router.use('*', (req, res) => {
  const traceId = req.traceId;
  
  logger.logWithTrace(traceId, 'warn', 'Ruta de documentación no encontrada', {
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(404).json({
    success: false,
    error: 'Ruta de documentación no encontrada',
    message: `La ruta ${req.method} ${req.originalUrl} no existe en la documentación`,
    availableRoutes: [
      'GET /api-docs - Interfaz Swagger UI',
      'GET /api-docs/json - Especificación OpenAPI en JSON',
      'GET /api-docs/yaml - Especificación OpenAPI en YAML',
      'GET /api-docs/redoc - Interfaz ReDoc alternativa'
    ],
    traceId
  });
});

module.exports = router;

