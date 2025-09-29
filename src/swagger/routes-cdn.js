const express = require('express');
const swaggerSpec = require('./index');
const logger = require('../config/logger');
const { publicEndpoint } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api-docs
 * Endpoint principal de documentación Swagger completamente local
 * No hace requests externos, todo está embebido localmente
 */
router.get('/',
  publicEndpoint,
  (req, res, next) => {
    logger.info('Acceso a documentación Swagger local', {
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
    
    logger.info('Generando Swagger UI local', {
      baseUrl,
      originalUrl: req.originalUrl
    });

    // Especificación OpenAPI embebida directamente
    const spec = JSON.stringify(swaggerSpec);

    const swaggerHtml = `
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="UTF-8">
          <title>Condo360 WordPress API - Documentación</title>
          <style>
            html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
            *, *:before, *:after { box-sizing: inherit; }
            body { margin:0; background: #fafafa; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
            .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
            .header { background: #2c3e50; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 2em; }
            .header p { margin: 10px 0 0 0; opacity: 0.9; }
            .endpoint { background: white; border: 1px solid #e1e5e9; border-radius: 8px; margin-bottom: 20px; overflow: hidden; }
            .endpoint-header { background: #f8f9fa; padding: 15px 20px; border-bottom: 1px solid #e1e5e9; }
            .endpoint-method { display: inline-block; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 0.8em; margin-right: 10px; }
            .method-post { background: #28a745; color: white; }
            .method-get { background: #007bff; color: white; }
            .method-delete { background: #dc3545; color: white; }
            .endpoint-path { font-family: monospace; font-size: 1.1em; }
            .endpoint-description { padding: 20px; }
            .endpoint-description h3 { margin-top: 0; color: #2c3e50; }
            .parameters { background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0; }
            .parameter { margin-bottom: 10px; }
            .parameter-name { font-weight: bold; font-family: monospace; }
            .parameter-type { color: #6c757d; font-size: 0.9em; }
            .response { background: #e8f5e8; padding: 15px; border-radius: 4px; margin: 15px 0; }
            .response-code { font-weight: bold; color: #28a745; }
            .example { background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0; }
            .example pre { margin: 0; overflow-x: auto; }
            .example pre code { font-family: monospace; font-size: 0.9em; }
            .server-info { background: #e3f2fd; padding: 15px; border-radius: 4px; margin: 20px 0; }
            .server-info h3 { margin-top: 0; color: #1976d2; }
            .server-list { list-style: none; padding: 0; }
            .server-list li { padding: 5px 0; font-family: monospace; }
            .try-button { background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-size: 1em; }
            .try-button:hover { background: #0056b3; }
            .footer { text-align: center; margin-top: 40px; padding: 20px; color: #6c757d; border-top: 1px solid #e1e5e9; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${swaggerSpec.info.title}</h1>
              <p>${swaggerSpec.info.description}</p>
              <p>Versión: ${swaggerSpec.info.version}</p>
            </div>

            <div class="server-info">
              <h3>Servidores Disponibles</h3>
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
                <h3>Subir archivo .docx y crear post en WordPress</h3>
                <p>Procesa un archivo .docx, convierte su contenido a HTML preservando todos los estilos, extrae imágenes embebidas, las sube al Media Library de WordPress y crea un post con el contenido HTML resultante.</p>
                
                <div class="parameters">
                  <h4>Parámetros</h4>
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
                  <h4>Respuesta Exitosa (201)</h4>
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

                <button class="try-button" onclick="tryEndpoint('POST', '/api/v1/docx/upload')">Probar Endpoint</button>
              </div>
            </div>

            <div class="endpoint">
              <div class="endpoint-header">
                <span class="endpoint-method method-delete">DELETE</span>
                <span class="endpoint-path">/api/v1/posts/{wp_post_id}</span>
              </div>
              <div class="endpoint-description">
                <h3>Eliminar post de WordPress y opcionalmente sus medios asociados</h3>
                <p>Elimina un post de WordPress por su ID. Opcionalmente puede eliminar también todos los medios asociados (imágenes) que fueron subidos durante la creación del post.</p>
                
                <div class="parameters">
                  <h4>Parámetros</h4>
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
                  <h4>Respuesta Exitosa (200)</h4>
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

                <button class="try-button" onclick="tryEndpoint('DELETE', '/api/v1/posts/456')">Probar Endpoint</button>
              </div>
            </div>

            <div class="endpoint">
              <div class="endpoint-header">
                <span class="endpoint-method method-get">GET</span>
                <span class="endpoint-path">/api/v1/health</span>
              </div>
              <div class="endpoint-description">
                <h3>Verificar estado de salud del sistema</h3>
                <p>Verifica el estado de todas las dependencias del sistema incluyendo conexión a base de datos MySQL, conectividad con WordPress, estado de Redis y configuración de Telegram.</p>
                
                <div class="response">
                  <h4>Respuesta Exitosa (200)</h4>
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

                <button class="try-button" onclick="tryEndpoint('GET', '/api/v1/health')">Probar Endpoint</button>
              </div>
            </div>

            <div class="endpoint">
              <div class="endpoint-header">
                <span class="endpoint-method method-get">GET</span>
                <span class="endpoint-path">/api/v1/posts/history</span>
              </div>
              <div class="endpoint-description">
                <h3>Buscar registros del historial de procesamiento</h3>
                <p>Busca registros del historial de procesamiento aplicando filtros opcionales y paginación. Permite filtrar por usuario, estado, fechas y otros criterios.</p>
                
                <div class="parameters">
                  <h4>Parámetros de Consulta</h4>
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

                <button class="try-button" onclick="tryEndpoint('GET', '/api/v1/posts/history')">Probar Endpoint</button>
              </div>
            </div>

            <div class="footer">
              <p>Condo360 WordPress API - Documentación generada automáticamente</p>
              <p>Para más información, consulta el <a href="/api-docs/json" target="_blank">especificación OpenAPI completa</a></p>
            </div>
          </div>

          <script>
            function tryEndpoint(method, path) {
              const baseUrl = window.location.origin + window.location.pathname.replace('/api-docs', '');
              const fullUrl = baseUrl + path;
              
              console.log('Probando endpoint:', method, fullUrl);
              
              if (method === 'GET') {
                window.open(fullUrl, '_blank');
              } else {
                alert('Para probar endpoints POST/DELETE, usa una herramienta como Postman o curl:\\n\\n' + 
                      'curl -X ' + method + ' "' + fullUrl + '"');
              }
            }
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