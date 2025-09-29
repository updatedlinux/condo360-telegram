const express = require('express');

// Importar controladores
const healthController = require('../controllers/healthController');

// Importar middlewares
const { publicEndpoint } = require('../middleware/auth');
const { sanitizeInputs, securityLogging } = require('../middleware/security');

const router = express.Router();

/**
 * GET /api/v1/health
 * Endpoint para verificar el estado de salud del sistema
 * Verifica conectividad con todas las dependencias (WordPress, MySQL, Redis, etc.)
 * 
 * Este endpoint es público y no requiere autenticación
 * Útil para monitoreo y load balancers
 */
router.get('/health',
  // Middlewares básicos (sin autenticación)
  publicEndpoint,
  securityLogging,
  sanitizeInputs,
  
  // Controlador
  healthController.checkHealth
);

/**
 * GET /api/v1/health/simple
 * Endpoint simple de salud para load balancers
 * Retorna solo estado básico sin verificaciones de dependencias
 * 
 * Este endpoint es público y no requiere autenticación
 * Optimizado para checks rápidos de load balancers
 */
router.get('/health/simple',
  // Middlewares básicos (sin autenticación)
  publicEndpoint,
  securityLogging,
  
  // Controlador
  healthController.simpleHealth
);

/**
 * Middleware para logging de rutas no encontradas en health
 */
router.use('*', (req, res) => {
  const traceId = req.traceId;
  
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada',
    message: `La ruta ${req.method} ${req.originalUrl} no existe en el módulo de salud`,
    availableRoutes: [
      'GET /api/v1/health',
      'GET /api/v1/health/simple'
    ],
    traceId
  });
});

module.exports = router;

