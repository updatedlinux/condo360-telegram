const express = require('express');
const swaggerSpec = require('./index');
const logger = require('../config/logger');
const { publicEndpoint } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api-docs
 * Documentación HTML pura SIN JavaScript - Versión 3.0
 * Elimina completamente cualquier posibilidad de requests externos
 */
router.get('/',
  publicEndpoint,
  (req, res, next) => {
    logger.info('Acceso a documentación HTML pura sin JS', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      traceId: req.traceId
    });
    next();
  },
  (req, res) => {
    // Headers para evitar cache del navegador
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Last-Modified', new Date().toUTCString());
    
    // Detectar la URL base automáticamente incluyendo el prefijo del proxy reverso
    const protocol = req.get('X-Forwarded-Proto') || req.protocol;
    const host = req.get('X-Forwarded-Host') || req.get('Host');
    
    // Detectar el prefijo del proxy reverso desde la URL original
    const originalUrl = req.originalUrl;
    const pathPrefix = originalUrl.replace('/api-docs', '');
    const baseUrl = `${protocol}://${host}${pathPrefix}`;
    
    logger.info('Generando documentación HTML pura sin JS', {
      baseUrl,
      originalUrl: req.originalUrl,
      pathPrefix,
      protocol,
      host,
      version: '3.0',
      timestamp: new Date().toISOString()
    });

    const swaggerHtml = `
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="UTF-8">
          <title>Condo360 WordPress API - Documentación</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
          <meta http-equiv="Pragma" content="no-cache">
          <meta http-equiv="Expires" content="0">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
              background: #f8f9fa; 
              color: #333; 
              line-height: 1.6; 
            }
            .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
            .header { 
              background: linear-gradient(135deg, #2c3e50, #3498db); 
              color: white; 
              padding: 30px; 
              border-radius: 12px; 
              margin-bottom: 30px; 
              text-align: center;
            }
            .header h1 { font-size: 2.5em; margin-bottom: 10px; }
            .header p { font-size: 1.2em; opacity: 0.9; }
            .version { 
              background: rgba(255,255,255,0.2); 
              padding: 5px 15px; 
              border-radius: 20px; 
              display: inline-block; 
              margin-top: 10px; 
              font-size: 0.9em;
            }
            .endpoint { 
              background: white; 
              border: 1px solid #e1e5e9; 
              border-radius: 12px; 
              margin-bottom: 25px; 
              overflow: hidden; 
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .endpoint-header { 
              background: #f8f9fa; 
              padding: 20px; 
              border-bottom: 1px solid #e1e5e9; 
              display: flex; 
              align-items: center;
            }
            .endpoint-method { 
              display: inline-block; 
              padding: 6px 12px; 
              border-radius: 6px; 
              font-weight: bold; 
              font-size: 0.85em; 
              margin-right: 15px; 
              min-width: 70px; 
              text-align: center;
            }
            .method-post { background: #28a745; color: white; }
            .method-get { background: #007bff; color: white; }
            .method-delete { background: #dc3545; color: white; }
            .endpoint-path { 
              font-family: 'Monaco', 'Menlo', monospace; 
              font-size: 1.2em; 
              font-weight: 600;
            }
            .endpoint-description { padding: 25px; }
            .endpoint-description h3 { 
              margin-bottom: 15px; 
              color: #2c3e50; 
              font-size: 1.3em;
            }
            .endpoint-description p { 
              margin-bottom: 20px; 
              color: #666; 
              font-size: 1.05em;
            }
            .parameters { 
              background: #f8f9fa; 
              padding: 20px; 
              border-radius: 8px; 
              margin: 20px 0; 
              border-left: 4px solid #007bff;
            }
            .parameters h4 { 
              margin-bottom: 15px; 
              color: #2c3e50; 
              font-size: 1.1em;
            }
            .parameter { 
              margin-bottom: 15px; 
              padding-bottom: 10px; 
              border-bottom: 1px solid #e9ecef;
            }
            .parameter:last-child { border-bottom: none; margin-bottom: 0; }
            .parameter-name { 
              font-weight: bold; 
              font-family: 'Monaco', 'Menlo', monospace; 
              color: #2c3e50;
            }
            .parameter-type { 
              color: #6c757d; 
              font-size: 0.9em; 
              margin-left: 8px;
            }
            .response { 
              background: #e8f5e8; 
              padding: 20px; 
              border-radius: 8px; 
              margin: 20px 0; 
              border-left: 4px solid #28a745;
            }
            .response-code { 
              font-weight: bold; 
              color: #28a745; 
              font-size: 1.1em; 
              margin-bottom: 10px;
            }
            .example { 
              background: #f8f9fa; 
              padding: 20px; 
              border-radius: 8px; 
              margin: 15px 0; 
              border: 1px solid #e9ecef;
            }
            .example pre { 
              margin: 0; 
              overflow-x: auto; 
              font-size: 0.9em;
            }
            .example pre code { 
              font-family: 'Monaco', 'Menlo', monospace; 
              color: #333;
            }
            .server-info { 
              background: #e3f2fd; 
              padding: 20px; 
              border-radius: 8px; 
              margin: 25px 0; 
              border-left: 4px solid #1976d2;
            }
            .server-info h3 { 
              margin-bottom: 15px; 
              color: #1976d2; 
              font-size: 1.2em;
            }
            .server-list { 
              list-style: none; 
              padding: 0; 
            }
            .server-list li { 
              padding: 8px 0; 
              font-family: 'Monaco', 'Menlo', monospace; 
              background: rgba(255,255,255,0.5); 
              margin: 5px 0; 
              padding: 10px; 
              border-radius: 4px;
            }
            .try-button { 
              background: #007bff; 
              color: white; 
              border: none; 
              padding: 12px 25px; 
              border-radius: 6px; 
              cursor: pointer; 
              font-size: 1em; 
              font-weight: 600;
              transition: background 0.3s;
              text-decoration: none;
              display: inline-block;
            }
            .try-button:hover { 
              background: #0056b3; 
              transform: translateY(-1px);
            }
            .footer { 
              text-align: center; 
              margin-top: 50px; 
              padding: 30px; 
              color: #6c757d; 
              border-top: 2px solid #e1e5e9; 
              background: white;
              border-radius: 8px;
            }
            .footer a { 
              color: #007bff; 
              text-decoration: none; 
              font-weight: 600;
            }
            .footer a:hover { 
              text-decoration: underline; 
            }
            .stats { 
              display: grid; 
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
              gap: 20px; 
              margin: 25px 0;
            }
            .stat-card { 
              background: white; 
              padding: 20px; 
              border-radius: 8px; 
              text-align: center; 
              border: 1px solid #e9ecef;
            }
            .stat-number { 
              font-size: 2em; 
              font-weight: bold; 
              color: #007bff; 
              margin-bottom: 5px;
            }
            .stat-label { 
              color: #6c757d; 
              font-size: 0.9em;
            }
            .no-js-notice {
              background: #fff3cd;
              border: 1px solid #ffeaa7;
              color: #856404;
              padding: 15px;
              border-radius: 8px;
              margin: 20px 0;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${swaggerSpec.info.title}</h1>
              <p>${swaggerSpec.info.description}</p>
              <div class="version">Versión ${swaggerSpec.info.version} - HTML Puro Sin JavaScript</div>
            </div>

            <div class="no-js-notice">
              <strong>✅ Documentación HTML Pura</strong> - Sin JavaScript, sin requests externos, sin problemas de CSP
            </div>

            <div class="stats">
              <div class="stat-card">
                <div class="stat-number">${Object.keys(swaggerSpec.paths).length}</div>
                <div class="stat-label">Endpoints</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">${swaggerSpec.servers.length}</div>
                <div class="stat-label">Servidores</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">${Object.keys(swaggerSpec.components.schemas).length}</div>
                <div class="stat-label">Modelos</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">${swaggerSpec.tags.length}</div>
                <div class="stat-label">Categorías</div>
              </div>
            </div>

            <div class="server-info">
              <h3>🌐 Servidores Disponibles</h3>
              <ul class="server-list">
                ${swaggerSpec.servers.map(server => `<li>${server.url} - ${server.description}</li>`).join('')}
              </ul>
            </div>

            <div class="endpoint">
              <div class="endpoint-header">
                <span class="endpoint-method method-post">POST</span>
                <span class="endpoint-path">/api/v1/docx/upload</span>
              </div>
              <div class="endpoint-description">
                <h3>📄 Subir archivo .docx y crear post en WordPress</h3>
                <p>Procesa un archivo .docx, convierte su contenido a HTML preservando todos los estilos, extrae imágenes embebidas, las sube al Media Library de WordPress y crea un post con el contenido HTML resultante.</p>
                
                <div class="parameters">
                  <h4>📋 Parámetros</h4>
                  <div class="parameter">
                    <span class="parameter-name">file</span> <span class="parameter-type">(multipart/form-data, requerido)</span><br>
                    Archivo .docx a procesar
                  </div>
                  <div class="parameter">
                    <span class="parameter-name">title</span> <span class="parameter-type">(string, opcional)</span><br>
                    Título del post (por defecto nombre del archivo)
                  </div>
                  <div class="parameter">
                    <span class="parameter-name">status</span> <span class="parameter-type">(string, opcional)</span><br>
                    Estado del post: "draft" o "publish" (por defecto "draft")
                  </div>
                  <div class="parameter">
                    <span class="parameter-name">created_by</span> <span class="parameter-type">(string, opcional)</span><br>
                    Identificador del usuario que crea el post
                  </div>
                </div>

                <div class="response">
                  <h4>✅ Respuesta Exitosa (201)</h4>
                  <div class="response-code">200 - Archivo procesado y post creado exitosamente</div>
                  <div class="example">
                    <pre><code>{
  "success": true,
  "message": "Archivo .docx procesado y post creado exitosamente",
  "data": {
    "history_id": 123,
    "wp_post_id": 456,
    "title": "Mi Documento Importante",
    "status": "draft",
    "link": "https://tudominio.com/2024/01/15/mi-documento-importante/",
    "featured_media": 789,
    "images_count": 3,
    "processing_time": "2.5s"
  },
  "traceId": "550e8400-e29b-41d4-a716-446655440000"
}</code></pre>
                  </div>
                </div>

                <a href="${baseUrl}/api/v1/docx/upload" class="try-button" target="_blank">🚀 Probar Endpoint</a>
              </div>
            </div>

            <div class="endpoint">
              <div class="endpoint-header">
                <span class="endpoint-method method-delete">DELETE</span>
                <span class="endpoint-path">/api/v1/posts/{wp_post_id}</span>
              </div>
              <div class="endpoint-description">
                <h3>🗑️ Eliminar post de WordPress y opcionalmente sus medios asociados</h3>
                <p>Elimina un post de WordPress por su ID. Opcionalmente puede eliminar también todos los medios asociados (imágenes) que fueron subidos durante la creación del post.</p>
                
                <div class="parameters">
                  <h4>📋 Parámetros</h4>
                  <div class="parameter">
                    <span class="parameter-name">wp_post_id</span> <span class="parameter-type">(path, requerido)</span><br>
                    ID del post en WordPress a eliminar
                  </div>
                  <div class="parameter">
                    <span class="parameter-name">delete_media</span> <span class="parameter-type">(query, opcional)</span><br>
                    Si eliminar también los medios asociados al post (true/false, por defecto false)
                  </div>
                </div>

                <div class="response">
                  <h4>✅ Respuesta Exitosa (200)</h4>
                  <div class="response-code">200 - Post eliminado exitosamente</div>
                  <div class="example">
                    <pre><code>{
  "success": true,
  "message": "Post eliminado exitosamente",
  "data": {
    "wp_post_id": 456,
    "wp_deleted": true,
    "media_deletion": {
      "requested": true,
      "total": 3,
      "successful": 3,
      "failed": 0
    }
  },
  "traceId": "550e8400-e29b-41d4-a716-446655440000"
}</code></pre>
                  </div>
                </div>

                <a href="${baseUrl}/api/v1/posts/456" class="try-button" target="_blank">🚀 Probar Endpoint</a>
              </div>
            </div>

            <div class="endpoint">
              <div class="endpoint-header">
                <span class="endpoint-method method-get">GET</span>
                <span class="endpoint-path">/api/v1/health</span>
              </div>
              <div class="endpoint-description">
                <h3>🏥 Verificar estado de salud del sistema</h3>
                <p>Verifica el estado de todas las dependencias del sistema incluyendo conexión a base de datos MySQL, conectividad con WordPress, estado de Redis y configuración de Telegram.</p>
                
                <div class="response">
                  <h4>✅ Respuesta Exitosa (200)</h4>
                  <div class="response-code">200 - Sistema funcionando correctamente</div>
                  <div class="example">
                    <pre><code>{
  "success": true,
  "data": {
    "timestamp": "2024-01-15T12:00:00.000Z",
    "timezone": "America/Caracas",
    "environment": "production",
    "version": "1.0.0",
    "overall": {
      "status": "healthy",
      "message": "Sistema funcionando correctamente",
      "criticalChecksHealthy": true
    },
    "checks": {
      "database": { "status": "healthy" },
      "wordpress": { "status": "healthy" },
      "redis": { "status": "healthy" },
      "telegram": { "status": "configured" }
    },
    "responseTime": "150ms"
  },
  "traceId": "550e8400-e29b-41d4-a716-446655440000"
}</code></pre>
                  </div>
                </div>

                <a href="${baseUrl}/api/v1/health" class="try-button" target="_blank">🚀 Probar Endpoint</a>
              </div>
            </div>

            <div class="endpoint">
              <div class="endpoint-header">
                <span class="endpoint-method method-get">GET</span>
                <span class="endpoint-path">/api/v1/posts/history</span>
              </div>
              <div class="endpoint-description">
                <h3>📊 Buscar registros del historial de procesamiento</h3>
                <p>Busca registros del historial de procesamiento aplicando filtros opcionales y paginación. Permite filtrar por usuario, estado, fechas y otros criterios.</p>
                
                <div class="parameters">
                  <h4>📋 Parámetros de Consulta</h4>
                  <div class="parameter">
                    <span class="parameter-name">wp_post_id</span> <span class="parameter-type">(query, opcional)</span><br>
                    ID del post en WordPress
                  </div>
                  <div class="parameter">
                    <span class="parameter-name">created_by</span> <span class="parameter-type">(query, opcional)</span><br>
                    Usuario que creó el post (búsqueda parcial)
                  </div>
                  <div class="parameter">
                    <span class="parameter-name">status</span> <span class="parameter-type">(query, opcional)</span><br>
                    Estado del procesamiento: "processing", "completed", "failed", "deleted"
                  </div>
                  <div class="parameter">
                    <span class="parameter-name">page</span> <span class="parameter-type">(query, opcional)</span><br>
                    Número de página para paginación (por defecto 1)
                  </div>
                  <div class="parameter">
                    <span class="parameter-name">limit</span> <span class="parameter-type">(query, opcional)</span><br>
                    Cantidad de registros por página (máximo 100, por defecto 20)
                  </div>
                </div>

                <a href="${baseUrl}/api/v1/posts/history" class="try-button" target="_blank">🚀 Probar Endpoint</a>
              </div>
            </div>

            <div class="footer">
              <p><strong>Condo360 WordPress API</strong> - Documentación HTML Pura v3.0</p>
              <p>Para más información, consulta la <a href="/api-docs/json" target="_blank">especificación OpenAPI completa</a> o <a href="/api-docs/redoc" target="_blank">ReDoc</a></p>
              <p>Generado automáticamente - Sin JavaScript, sin dependencias externas</p>
            </div>
          </div>
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