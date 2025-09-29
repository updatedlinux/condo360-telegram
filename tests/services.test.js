/**
 * Tests simplificados para servicios
 */

// Mock de dependencias externas
jest.mock('mammoth', () => ({
  convertToHtml: jest.fn(),
  images: {
    inline: jest.fn()
  }
}));

jest.mock('axios', () => ({
  create: jest.fn(),
  post: jest.fn(),
  get: jest.fn(),
  delete: jest.fn()
}));

describe('Servicios - Tests Simplificados', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('DocxService', () => {
    test('debería tener función getImageExtension', () => {
      const docxService = require('../../src/services/docxService');
      expect(typeof docxService.getImageExtension).toBe('function');
    });

    test('getImageExtension debería retornar extensiones correctas', () => {
      const docxService = require('../../src/services/docxService');
      
      expect(docxService.getImageExtension('image/jpeg')).toBe('.jpg');
      expect(docxService.getImageExtension('image/png')).toBe('.png');
      expect(docxService.getImageExtension('image/gif')).toBe('.gif');
      expect(docxService.getImageExtension('image/webp')).toBe('.webp');
    });

    test('getImageExtension debería retornar .jpg por defecto', () => {
      const docxService = require('../../src/services/docxService');
      
      expect(docxService.getImageExtension('image/unknown')).toBe('.jpg');
      expect(docxService.getImageExtension('application/octet-stream')).toBe('.jpg');
    });

    test('debería tener función replaceImageReferences', () => {
      const docxService = require('../../src/services/docxService');
      expect(typeof docxService.replaceImageReferences).toBe('function');
    });

    test('replaceImageReferences debería reemplazar URLs correctamente', () => {
      const docxService = require('../../src/services/docxService');
      
      const html = '<img src="temp://image1.jpg" alt="Test">';
      const mappings = [{
        tempFileName: 'image1.jpg',
        wpUrl: 'https://wp.com/image1.jpg',
        imageId: 'img1'
      }];
      
      const result = docxService.replaceImageReferences(html, mappings);
      expect(result).toContain('https://wp.com/image1.jpg');
      expect(result).not.toContain('temp://image1.jpg');
    });
  });

  describe('WordPressService', () => {
    test('debería tener función checkConnection', () => {
      const wordpressService = require('../../src/services/wordpressService');
      expect(typeof wordpressService.checkConnection).toBe('function');
    });

    test('debería tener función createPost', () => {
      const wordpressService = require('../../src/services/wordpressService');
      expect(typeof wordpressService.createPost).toBe('function');
    });

    test('debería tener función deletePost', () => {
      const wordpressService = require('../../src/services/wordpressService');
      expect(typeof wordpressService.deletePost).toBe('function');
    });

    test('debería tener función uploadImage', () => {
      const wordpressService = require('../../src/services/wordpressService');
      expect(typeof wordpressService.uploadImage).toBe('function');
    });
  });

  describe('TelegramService', () => {
    test('debería tener función setWebhook', () => {
      const telegramService = require('../../src/services/telegramService');
      expect(typeof telegramService.setWebhook).toBe('function');
    });

    test('debería tener función getWebhookInfo', () => {
      const telegramService = require('../../src/services/telegramService');
      expect(typeof telegramService.getWebhookInfo).toBe('function');
    });

    test('debería tener función sendMessage', () => {
      const telegramService = require('../../src/services/telegramService');
      expect(typeof telegramService.sendMessage).toBe('function');
    });
  });
});
