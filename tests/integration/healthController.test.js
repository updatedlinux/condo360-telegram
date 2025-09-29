/**
 * Tests de integración para HealthController
 */

const request = require('supertest');
const express = require('express');

// Mock de servicios externos
jest.mock('../../src/services/wordpressService');
jest.mock('../../src/config/database');

const wordpressService = require('../../src/services/wordpressService');
const { testConnection } = require('../../src/config/database');

// Importar controlador
const healthController = require('../../src/controllers/healthController');

describe('HealthController - Integración', () => {
  let app;

  beforeEach(() => {
    app = express();
    
    // Configurar middleware básico
    app.use(express.json());
    app.use((req, res, next) => {
      req.traceId = 'test-trace-id';
      next();
    });

    // Configurar rutas de prueba
    app.get('/health', healthController.checkHealth);
    app.get('/health/simple', healthController.simpleHealth);

    // Limpiar mocks
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('debería retornar estado saludable cuando todas las dependencias funcionan', async () => {
      // Mock de servicios funcionando
      testConnection.mockResolvedValue(true);
      wordpressService.checkConnection.mockResolvedValue(true);

      const response = await request(app)
        .get('/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('overall');
      expect(response.body.data.overall.status).toBe('healthy');
      expect(response.body.data.overall.criticalChecksHealthy).toBe(true);
      expect(response.body.data.checks).toHaveProperty('database');
      expect(response.body.data.checks).toHaveProperty('wordpress');
      expect(response.body.data.checks.database.status).toBe('healthy');
      expect(response.body.data.checks.wordpress.status).toBe('healthy');
    });

    it('debería retornar estado no saludable cuando hay problemas críticos', async () => {
      // Mock de servicios con problemas
      testConnection.mockResolvedValue(false);
      wordpressService.checkConnection.mockResolvedValue(false);

      const response = await request(app)
        .get('/health');

      expect(response.status).toBe(503);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('overall');
      expect(response.body.data.overall.status).toBe('unhealthy');
      expect(response.body.data.overall.criticalChecksHealthy).toBe(false);
      expect(response.body.data.checks.database.status).toBe('unhealthy');
      expect(response.body.data.checks.wordpress.status).toBe('unhealthy');
    });

    it('debería manejar errores en verificaciones individuales', async () => {
      // Mock de error en verificación de base de datos
      testConnection.mockRejectedValue(new Error('Database connection failed'));
      wordpressService.checkConnection.mockResolvedValue(true);

      const response = await request(app)
        .get('/health');

      expect(response.status).toBe(503);
      expect(response.body.success).toBe(true);
      expect(response.body.data.overall.status).toBe('unhealthy');
      expect(response.body.data.checks.database.status).toBe('unhealthy');
      expect(response.body.data.checks.database.error).toBe('Database connection failed');
      expect(response.body.data.checks.wordpress.status).toBe('healthy');
    });

    it('debería incluir información de Redis cuando está configurado', async () => {
      // Mock de servicios funcionando
      testConnection.mockResolvedValue(true);
      wordpressService.checkConnection.mockResolvedValue(true);

      // Mock de Redis funcionando
      const mockRedis = {
        ping: jest.fn().mockResolvedValue('PONG'),
        disconnect: jest.fn().mockResolvedValue()
      };

      jest.doMock('ioredis', () => {
        return jest.fn().mockImplementation(() => mockRedis);
      });

      const response = await request(app)
        .get('/health');

      expect(response.status).toBe(200);
      expect(response.body.data.checks).toHaveProperty('redis');
      expect(response.body.data.checks.redis.status).toBe('healthy');
    });

    it('debería incluir información de Telegram cuando está configurado', async () => {
      // Mock de servicios funcionando
      testConnection.mockResolvedValue(true);
      wordpressService.checkConnection.mockResolvedValue(true);

      const response = await request(app)
        .get('/health');

      expect(response.status).toBe(200);
      expect(response.body.data.checks).toHaveProperty('telegram');
      expect(response.body.data.checks.telegram.status).toBe('configured');
    });

    it('debería incluir información de configuración de archivos e imágenes', async () => {
      // Mock de servicios funcionando
      testConnection.mockResolvedValue(true);
      wordpressService.checkConnection.mockResolvedValue(true);

      const response = await request(app)
        .get('/health');

      expect(response.status).toBe(200);
      expect(response.body.data.checks).toHaveProperty('files');
      expect(response.body.data.checks).toHaveProperty('images');
      expect(response.body.data.checks.files.status).toBe('healthy');
      expect(response.body.data.checks.images.status).toBe('healthy');
    });

    it('debería incluir tiempo de respuesta', async () => {
      // Mock de servicios funcionando
      testConnection.mockResolvedValue(true);
      wordpressService.checkConnection.mockResolvedValue(true);

      const response = await request(app)
        .get('/health');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('responseTime');
      expect(response.body.data.responseTime).toMatch(/\d+ms/);
    });

    it('debería manejar errores internos del servidor', async () => {
      // Mock de error interno
      testConnection.mockRejectedValue(new Error('Internal server error'));

      const response = await request(app)
        .get('/health');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Error interno del servidor');
    });
  });

  describe('GET /health/simple', () => {
    it('debería retornar estado simple exitosamente', async () => {
      const response = await request(app)
        .get('/health/simple');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.uptime).toBeGreaterThan(0);
    });

    it('debería manejar errores en verificación simple', async () => {
      // Simular error interno
      const originalUptime = process.uptime;
      process.uptime = jest.fn().mockImplementation(() => {
        throw new Error('Uptime error');
      });

      const response = await request(app)
        .get('/health/simple');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message');

      // Restaurar función original
      process.uptime = originalUptime;
    });

    it('debería incluir timestamp en formato ISO', async () => {
      const response = await request(app)
        .get('/health/simple');

      expect(response.status).toBe(200);
      expect(response.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });
});

