const express = require('express');
const swaggerSpec = require('./index');
const logger = require('../config/logger');
const { publicEndpoint } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api-docs
 * Documentación usando ReDoc - Mucho más estable que Swagger UI
 */
router.get('/',
  publicEndpoint,
  (req, res, next) => {
    logger.info('Acceso a documentación ReDoc', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      traceId: req.traceId
    });
    next();
  },
  (req, res) => {
    // Detectar el prefijo del proxy reverso
    const originalUrl = req.originalUrl || '';
    const pathPrefix = originalUrl.replace('/api-docs', '');
    const forwardedPrefix = req.headers['x-forwarded-prefix'] || '';
    const finalPrefix = pathPrefix || forwardedPrefix;
    
    logger.info('Generando documentación ReDoc', {
      originalUrl: req.originalUrl,
      pathPrefix,
      forwardedPrefix,
      finalPrefix
    });

    // Especificación OpenAPI embebida directamente
    const spec = JSON.stringify(swaggerSpec);

    const redocHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Condo360 WordPress API - Documentación</title>
          <meta charset="utf-8"/>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
          <style>
            body { margin: 0; padding: 0; }
            .redoc-wrap { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
          </style>
        </head>
        <body>
          <div id="redoc-container"></div>
          <script src="https://cdn.jsdelivr.net/npm/redoc@latest/bundles/redoc.standalone.js"></script>
          <script>
            Redoc.init(${spec}, {
              scrollYOffset: 0,
              hideDownloadButton: false,
              hideHostname: false,
              hideLoading: false,
              nativeScrollbars: false,
              disableSearch: false,
              onlyRequiredInSamples: false,
              sortPropsAlphabetically: false,
              showObjectSchemaExamples: true,
              hideSchemaPattern: false,
              expandDefaultServerVariables: true,
              maxDisplayedEnumValues: 10,
              hideSingleRequestSampleTab: false,
              menuToggle: true,
              jsonSampleExpandLevel: 2,
              hideRequestPayloadSample: false,
              expandResponses: "200,201",
              requiredPropsFirst: false,
              sortOperationsAlphabetically: false,
              showExtensions: false,
              hideSchemaTitles: false,
              simpleOneOfTypeLabel: false,
              payloadSampleIdx: 0,
              theme: {
                colors: {
                  primary: {
                    main: '#2c3e50'
                  }
                },
                typography: {
                  fontSize: '14px',
                  lineHeight: '1.5em',
                  code: {
                    fontSize: '13px',
                    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace'
                  },
                  headings: {
                    fontFamily: 'Montserrat, sans-serif',
                    fontWeight: '400'
                  }
                },
                spacing: {
                  unit: 5,
                  sectionHorizontal: 40,
                  sectionVertical: 40
                },
                breakpoints: {
                  medium: '50rem',
                  large: '85rem',
                  xlarge: '100rem'
                },
                shadows: {
                  level1: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
                  level2: '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)',
                  level3: '0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23)'
                },
                rightPanel: {
                  backgroundColor: '#263238',
                  width: '40%'
                }
              }
            }, document.getElementById('redoc-container'));
          </script>
        </body>
      </html>
    `;
    
    res.send(redocHtml);
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
 * GET /api-docs/postman
 * Generar colección de Postman para importar directamente
 */
router.get('/postman',
  publicEndpoint,
  (req, res) => {
    logger.info('Acceso a colección de Postman', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      traceId: req.traceId
    });

    // Detectar el prefijo del proxy reverso
    const originalUrl = req.originalUrl || '';
    const pathPrefix = originalUrl.replace('/api-docs/postman', '');
    const forwardedPrefix = req.headers['x-forwarded-prefix'] || '';
    const finalPrefix = pathPrefix || forwardedPrefix;
    
    const protocol = req.get('X-Forwarded-Proto') || req.protocol;
    const host = req.get('X-Forwarded-Host') || req.get('Host');
    const baseUrl = `${protocol}://${host}${finalPrefix}`;

    // Generar colección de Postman
    const postmanCollection = {
      info: {
        name: swaggerSpec.info.title,
        description: swaggerSpec.info.description,
        version: swaggerSpec.info.version,
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
      },
      variable: [
        {
          key: "baseUrl",
          value: baseUrl,
          type: "string"
        }
      ],
      item: []
    };

    // Convertir endpoints de OpenAPI a Postman
    Object.entries(swaggerSpec.paths).forEach(([path, methods]) => {
      Object.entries(methods).forEach(([method, operation]) => {
        const item = {
          name: operation.summary || `${method.toUpperCase()} ${path}`,
          request: {
            method: method.toUpperCase(),
            header: [],
            url: {
              raw: "{{baseUrl}}" + path,
              host: ["{{baseUrl}}"],
              path: path.split('/').filter(p => p)
            },
            description: operation.description || ''
          },
          response: []
        };

        // Agregar headers comunes
        item.request.header.push({
          key: "Content-Type",
          value: "application/json",
          type: "text"
        });

        // Agregar parámetros de query si existen
        if (operation.parameters) {
          operation.parameters.forEach(param => {
            if (param.in === 'query') {
              if (!item.request.url.query) {
                item.request.url.query = [];
              }
              item.request.url.query.push({
                key: param.name,
                value: param.example || '',
                description: param.description || ''
              });
            }
          });
        }

        // Agregar body si es POST/PUT
        if (['post', 'put', 'patch'].includes(method.toLowerCase()) && operation.requestBody) {
          item.request.body = {
            mode: "raw",
            raw: JSON.stringify({}, null, 2),
            options: {
              raw: {
                language: "json"
              }
            }
          };
        }

        postmanCollection.item.push(item);
      });
    });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="condo360-api.postman_collection.json"');
    res.json(postmanCollection);
  }
);

/**
 * GET /api-docs/insomnia
 * Generar colección de Insomnia para importar directamente
 */
router.get('/insomnia',
  publicEndpoint,
  (req, res) => {
    logger.info('Acceso a colección de Insomnia', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      traceId: req.traceId
    });

    // Detectar el prefijo del proxy reverso
    const originalUrl = req.originalUrl || '';
    const pathPrefix = originalUrl.replace('/api-docs/insomnia', '');
    const forwardedPrefix = req.headers['x-forwarded-prefix'] || '';
    const finalPrefix = pathPrefix || forwardedPrefix;
    
    const protocol = req.get('X-Forwarded-Proto') || req.protocol;
    const host = req.get('X-Forwarded-Host') || req.get('Host');
    const baseUrl = `${protocol}://${host}${finalPrefix}`;

    // Generar colección de Insomnia
    const insomniaCollection = {
      _type: "export",
      __export_format: 4,
      __export_date: new Date().toISOString(),
      __export_source: "condo360-api",
      resources: [
        {
          _id: "wrk_condo360",
          _type: "workspace",
          name: swaggerSpec.info.title,
          description: swaggerSpec.info.description
        },
        {
          _id: "env_base",
          _type: "environment",
          name: "Base Environment",
          data: {
            base_url: baseUrl
          },
          parentId: "wrk_condo360"
        }
      ]
    };

    // Convertir endpoints a requests de Insomnia
    Object.entries(swaggerSpec.paths).forEach(([path, methods], pathIndex) => {
      Object.entries(methods).forEach(([method, operation], methodIndex) => {
        const requestId = `req_${pathIndex}_${methodIndex}`;
        const request = {
          _id: requestId,
          _type: "request",
          name: operation.summary || `${method.toUpperCase()} ${path}`,
          description: operation.description || '',
          url: "{{ _.base_url }}" + path,
          method: method.toUpperCase(),
          body: {},
          parameters: [],
          headers: [
            {
              name: "Content-Type",
              value: "application/json"
            }
          ],
          parentId: "wrk_condo360"
        };

        // Agregar parámetros de query
        if (operation.parameters) {
          operation.parameters.forEach(param => {
            if (param.in === 'query') {
              request.parameters.push({
                name: param.name,
                value: param.example || '',
                description: param.description || ''
              });
            }
          });
        }

        // Agregar body si es necesario
        if (['post', 'put', 'patch'].includes(method.toLowerCase()) && operation.requestBody) {
          request.body.mimeType = "application/json";
          request.body.text = JSON.stringify({}, null, 2);
        }

        insomniaCollection.resources.push(request);
      });
    });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="condo360-api.insomnia_collection.json"');
    res.json(insomniaCollection);
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
      'GET /api-docs - Documentación ReDoc',
      'GET /api-docs/json - Especificación OpenAPI en JSON',
      'GET /api-docs/yaml - Especificación OpenAPI en YAML',
      'GET /api-docs/postman - Colección de Postman',
      'GET /api-docs/insomnia - Colección de Insomnia'
    ],
    traceId
  });
});

module.exports = router;
