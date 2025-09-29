const express = require('express');
const swaggerSpec = require('./index');
const logger = require('../config/logger');
const { publicEndpoint } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api-docs
 * Endpoint principal de documentación Swagger usando CDN
 * Soluciona problemas de archivos estáticos con proxy reverso
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
  (req, res) => {
    // Detectar la URL base automáticamente
    const protocol = req.get('X-Forwarded-Proto') || req.protocol;
    const host = req.get('X-Forwarded-Host') || req.get('Host');
    const baseUrl = `${protocol}://${host}`;
    
    logger.info('Generando Swagger UI', {
      baseUrl,
      originalUrl: req.originalUrl,
      headers: {
        'X-Forwarded-Proto': req.get('X-Forwarded-Proto'),
        'X-Forwarded-Host': req.get('X-Forwarded-Host'),
        'Host': req.get('Host')
      }
    });

    const swaggerHtml = `
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="UTF-8">
          <title>Condo360 WordPress API - Documentación</title>
          <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css" />
          <style>
            html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
            *, *:before, *:after { box-sizing: inherit; }
            body { margin:0; background: #fafafa; }
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
          </style>
        </head>
        <body>
          <div id="swagger-ui"></div>
          <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
          <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-standalone-preset.js"></script>
          <script>
            window.onload = function() {
              // Detectar la URL base del proxy reverso
              const currentPath = window.location.pathname;
              const basePath = currentPath.replace('/api-docs', '');
              const specUrl = basePath + '/api-docs/json';
              
              console.log('Swagger UI Config:', {
                currentPath: currentPath,
                basePath: basePath,
                specUrl: specUrl,
                windowLocation: window.location.href
              });
              
              const ui = SwaggerUIBundle({
                url: specUrl,
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                  SwaggerUIBundle.presets.apis,
                  SwaggerUIStandalonePreset
                ],
                plugins: [
                  SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "StandaloneLayout",
                persistAuthorization: true,
                displayRequestDuration: true,
                filter: true,
                showExtensions: true,
                showCommonExtensions: true,
                tryItOutEnabled: true,
                validatorUrl: null,
                // Configuración para proxy reverso
                requestInterceptor: function(request) {
                  console.log('Request interceptor:', request);
                  // Asegurar que las URLs sean relativas al proxy
                  if (request.url.startsWith('/')) {
                    request.url = basePath + request.url;
                  }
                  return request;
                },
                responseInterceptor: function(response) {
                  console.log('Response interceptor:', response);
                  return response;
                }
              });
              
              // Manejar errores de carga
              ui.onComplete = function() {
                console.log('Swagger UI loaded successfully');
              };
            };
          </script>
        </body>
      </html>
    `;
    
    res.send(swaggerHtml);
  }
);

/**
 * GET /api-docs/json
 * Endpoint para obtener la especificación OpenAPI en formato JSON
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
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-KEY');
    
    res.json(swaggerSpec);
  }
);

/**
 * GET /api-docs/yaml
 * Endpoint para obtener la especificación OpenAPI en formato YAML
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
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(yamlSpec);
  }
);

/**
 * GET /api-docs/redoc
 * Endpoint alternativo con documentación en formato ReDoc
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