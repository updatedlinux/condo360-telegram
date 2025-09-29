/**
 * Tests de integración para DocxController
 */

const request = require('supertest');
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Mock de servicios externos
jest.mock('../../src/services/docxService');
jest.mock('../../src/services/wordpressService');
jest.mock('../../src/config/database');

const docxService = require('../../src/services/docxService');
const wordpressService = require('../../src/services/wordpressService');
const { db } = require('../../src/config/database');

// Importar controlador
const docxController = require('../../src/controllers/docxController');

describe('DocxController - Integración', () => {
  let app;

  beforeEach(() => {
    app = express();
    
    // Configurar multer para testing
    const upload = multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 } // 5MB
    });

    // Configurar middleware básico
    app.use(express.json());
    app.use((req, res, next) => {
      req.traceId = 'test-trace-id';
      next();
    });

    // Configurar rutas de prueba
    app.post('/upload', upload.single('file'), docxController.uploadDocx);
    app.delete('/posts/:wp_post_id', docxController.deletePost);
    app.get('/posts/history/:history_id', docxController.getHistoryById);
    app.get('/posts/history', docxController.searchHistory);

    // Limpiar mocks
    jest.clearAllMocks();
  });

  describe('POST /upload', () => {
    it('debería procesar archivo .docx exitosamente', async () => {
      // Mock de servicios
      docxService.convertToHtml.mockResolvedValue({
        html: '<p>Contenido convertido</p>',
        images: [],
        metadata: { htmlLength: 25, imagesCount: 0 }
      });

      wordpressService.uploadImages.mockResolvedValue({
        successful: [],
        failed: [],
        all: []
      });

      wordpressService.createPost.mockResolvedValue({
        wpPostId: 456,
        title: 'Test Document',
        status: 'draft',
        link: 'https://wordpress.com/test-document/',
        featuredMedia: null
      });

      db.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{ id: 123 }])
        }),
        where: jest.fn().mockReturnValue({
          update: jest.fn().mockResolvedValue()
        })
      });

      // Crear archivo de prueba
      const testFile = Buffer.from('PK\x03\x04\x14\x00\x00\x00\x08\x00', 'binary');

      const response = await request(app)
        .post('/upload')
        .attach('file', testFile, 'test.docx')
        .field('title', 'Test Document')
        .field('status', 'draft')
        .field('created_by', 'test-user');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('history_id');
      expect(response.body.data).toHaveProperty('wp_post_id', 456);
      expect(response.body.data).toHaveProperty('title', 'Test Document');
    });

    it('debería manejar error cuando no se proporciona archivo', async () => {
      const response = await request(app)
        .post('/upload')
        .field('title', 'Test Document');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('No se proporcionó ningún archivo');
    });

    it('debería manejar error cuando el archivo es demasiado grande', async () => {
      // Crear archivo grande (simulado)
      const largeFile = Buffer.alloc(6 * 1024 * 1024); // 6MB

      const response = await request(app)
        .post('/upload')
        .attach('file', largeFile, 'large.docx');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('demasiado grande');
    });

    it('debería manejar error en conversión de archivo', async () => {
      // Mock de error en conversión
      docxService.convertToHtml.mockRejectedValue(new Error('Error de conversión'));

      const testFile = Buffer.from('PK\x03\x04\x14\x00\x00\x00\x08\x00', 'binary');

      const response = await request(app)
        .post('/upload')
        .attach('file', testFile, 'test.docx');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Error interno del servidor');
    });
  });

  describe('DELETE /posts/:wp_post_id', () => {
    it('debería eliminar post exitosamente', async () => {
      // Mock de base de datos
      db.mockReturnValue({
        where: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValue({
            id: 123,
            wp_post_id: 456,
            media_ids: JSON.stringify([789, 790])
          }),
          update: jest.fn().mockResolvedValue()
        })
      });

      // Mock de servicios de WordPress
      wordpressService.deleteMedia.mockResolvedValue({
        mediaId: 789,
        success: true,
        result: { deleted: true }
      });

      wordpressService.deletePost.mockResolvedValue({
        wpPostId: 456,
        deleted: true
      });

      const response = await request(app)
        .delete('/posts/456')
        .query({ delete_media: 'true' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('wp_post_id', 456);
      expect(response.body.data).toHaveProperty('wp_deleted', true);
    });

    it('debería manejar error cuando el post no existe', async () => {
      // Mock de base de datos - post no encontrado
      db.mockReturnValue({
        where: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValue(null)
        })
      });

      const response = await request(app)
        .delete('/posts/999');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Post no encontrado en el historial');
    });

    it('debería manejar error con ID inválido', async () => {
      const response = await request(app)
        .delete('/posts/invalid');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('ID de post inválido');
    });
  });

  describe('GET /posts/history/:history_id', () => {
    it('debería obtener historial por ID exitosamente', async () => {
      const mockHistoryRecord = {
        id: 123,
        wp_post_id: 456,
        title: 'Test Document',
        status: 'completed',
        created_by: 'test-user',
        file_name: 'test.docx',
        media_ids: JSON.stringify([789, 790]),
        wp_response: JSON.stringify({ wpPostId: 456, title: 'Test Document' }),
        error_message: null,
        created_at: '2024-01-15T10:00:00',
        updated_at: '2024-01-15T10:05:00',
        timezone: 'America/Caracas'
      };

      db.mockReturnValue({
        where: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValue(mockHistoryRecord)
        })
      });

      const response = await request(app)
        .get('/posts/history/123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', 123);
      expect(response.body.data).toHaveProperty('wp_post_id', 456);
      expect(response.body.data).toHaveProperty('title', 'Test Document');
    });

    it('debería manejar error cuando el historial no existe', async () => {
      db.mockReturnValue({
        where: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValue(null)
        })
      });

      const response = await request(app)
        .get('/posts/history/999');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Registro de historial no encontrado');
    });

    it('debería manejar error con ID inválido', async () => {
      const response = await request(app)
        .get('/posts/history/invalid');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('ID de historial inválido');
    });
  });

  describe('GET /posts/history', () => {
    it('debería buscar historial con filtros exitosamente', async () => {
      const mockRecords = [
        {
          id: 123,
          wp_post_id: 456,
          title: 'Test Document 1',
          status: 'completed',
          created_by: 'user1',
          created_at: '2024-01-15T10:00:00'
        },
        {
          id: 124,
          wp_post_id: 457,
          title: 'Test Document 2',
          status: 'completed',
          created_by: 'user2',
          created_at: '2024-01-15T11:00:00'
        }
      ];

      const mockCount = { count: 2 };

      db.mockReturnValue({
        where: jest.fn().mockReturnValue({
          offset: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockResolvedValue(mockRecords)
            })
          }),
          count: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue(mockCount)
          })
        })
      });

      const response = await request(app)
        .get('/posts/history')
        .query({
          status: 'completed',
          page: 1,
          limit: 20
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('records');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.records).toHaveLength(2);
      expect(response.body.data.pagination).toHaveProperty('total', 2);
    });

    it('debería manejar búsqueda sin resultados', async () => {
      db.mockReturnValue({
        where: jest.fn().mockReturnValue({
          offset: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockResolvedValue([])
            })
          }),
          count: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue({ count: 0 })
          })
        })
      });

      const response = await request(app)
        .get('/posts/history')
        .query({
          status: 'nonexistent'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.records).toHaveLength(0);
      expect(response.body.data.pagination.total).toBe(0);
    });
  });
});

