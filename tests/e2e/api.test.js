/**
 * Tests end-to-end para la API completa
 */

const request = require('supertest');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Mock de servicios externos
jest.mock('../src/services/docxService');
jest.mock('../src/services/wordpressService');
jest.mock('../src/config/database');

const docxService = require('../src/services/docxService');
const wordpressService = require('../src/services/wordpressService');
const { db, testConnection } = require('../src/config/database');

// Importar aplicación completa
const app = require('../src/app');

describe('API End-to-End', () => {
  beforeEach(() => {
    // Limpiar mocks
    jest.clearAllMocks();
    
    // Mock de servicios funcionando
    testConnection.mockResolvedValue(true);
    wordpressService.checkConnection.mockResolvedValue(true);
  });

  describe('Health Endpoints', () => {
    it('debería responder en /api/v1/health', async () => {
      const response = await request(app)
        .get('/api/v1/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('overall');
      expect(response.body.data).toHaveProperty('checks');
    });

    it('debería responder en /api/v1/health/simple', async () => {
      const response = await request(app)
        .get('/api/v1/health/simple');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('API Information', () => {
    it('debería responder en /api/v1 con información de la API', async () => {
      const response = await request(app)
        .get('/api/v1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('version');
      expect(response.body.data).toHaveProperty('endpoints');
      expect(response.body.data.endpoints).toHaveProperty('docx');
      expect(response.body.data.endpoints).toHaveProperty('posts');
      expect(response.body.data.endpoints).toHaveProperty('health');
    });
  });

  describe('Documentation', () => {
    it('debería servir documentación Swagger en /api-docs', async () => {
      const response = await request(app)
        .get('/api-docs');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
    });

    it('debería servir especificación OpenAPI en JSON', async () => {
      const response = await request(app)
        .get('/api-docs/json');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.body).toHaveProperty('openapi');
      expect(response.body).toHaveProperty('info');
      expect(response.body.info.title).toContain('Condo360');
    });

    it('debería servir especificación OpenAPI en YAML', async () => {
      const response = await request(app)
        .get('/api-docs/yaml');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/yaml');
    });

    it('debería servir documentación ReDoc', async () => {
      const response = await request(app)
        .get('/api-docs/redoc');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
    });
  });

  describe('Error Handling', () => {
    it('debería manejar rutas no encontradas', async () => {
      const response = await request(app)
        .get('/api/v1/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Endpoint no encontrado');
      expect(response.body).toHaveProperty('availableEndpoints');
    });

    it('debería manejar métodos no permitidos', async () => {
      const response = await request(app)
        .patch('/api/v1/health');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Security Headers', () => {
    it('debería incluir headers de seguridad', async () => {
      const response = await request(app)
        .get('/api/v1/health');

      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });
  });

  describe('CORS', () => {
    it('debería incluir headers CORS', async () => {
      const response = await request(app)
        .options('/api/v1/health');

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
  });

  describe('Rate Limiting', () => {
    it('debería aplicar rate limiting en endpoints protegidos', async () => {
      // Hacer múltiples requests rápidos
      const requests = Array(10).fill().map(() => 
        request(app)
          .post('/api/v1/docx/upload')
          .set('X-API-KEY', 'test-key')
      );

      const responses = await Promise.all(requests);
      
      // Al menos uno debería ser rate limited
      const rateLimited = responses.some(r => r.status === 429);
      expect(rateLimited).toBe(true);
    });
  });

  describe('Request Logging', () => {
    it('debería incluir traceId en respuestas', async () => {
      const response = await request(app)
        .get('/api/v1/health');

      expect(response.body).toHaveProperty('traceId');
      expect(response.body.traceId).toBeDefined();
    });
  });

  describe('Content Type Validation', () => {
    it('debería rechazar requests con content-type inválido', async () => {
      const response = await request(app)
        .post('/api/v1/docx/upload')
        .set('Content-Type', 'text/plain')
        .set('X-API-KEY', 'test-key')
        .send('invalid content');

      expect(response.status).toBe(400);
    });
  });

  describe('API Versioning', () => {
    it('debería responder correctamente a rutas versionadas', async () => {
      const response = await request(app)
        .get('/api/v1');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('version', '1.0.0');
    });

    it('debería manejar rutas no versionadas', async () => {
      const response = await request(app)
        .get('/api');

      expect(response.status).toBe(404);
    });
  });

  describe('Environment Configuration', () => {
    it('debería incluir información de entorno en respuestas', async () => {
      const response = await request(app)
        .get('/api/v1/health');

      expect(response.body.data).toHaveProperty('environment');
      expect(response.body.data).toHaveProperty('timezone');
      expect(response.body.data.timezone).toBe('America/Caracas');
    });
  });
});

