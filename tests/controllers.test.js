/**
 * Tests simplificados para controladores
 */

// Mock de dependencias
jest.mock('../../src/services/docxService');
jest.mock('../../src/services/wordpressService');
jest.mock('../../src/services/telegramService');
jest.mock('../../src/config/database');
jest.mock('../../src/config/logger');

describe('Controladores - Tests Simplificados', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('DocxController', () => {
    test('debería tener función uploadDocx', () => {
      const docxController = require('../../src/controllers/docxController');
      expect(typeof docxController.uploadDocx).toBe('function');
    });

    test('debería tener función deletePost', () => {
      const docxController = require('../../src/controllers/docxController');
      expect(typeof docxController.deletePost).toBe('function');
    });

    test('debería tener función getHistoryById', () => {
      const docxController = require('../../src/controllers/docxController');
      expect(typeof docxController.getHistoryById).toBe('function');
    });

    test('debería tener función searchHistory', () => {
      const docxController = require('../../src/controllers/docxController');
      expect(typeof docxController.searchHistory).toBe('function');
    });
  });

  describe('HealthController', () => {
    test('debería tener función checkHealth', () => {
      const healthController = require('../../src/controllers/healthController');
      expect(typeof healthController.checkHealth).toBe('function');
    });

    test('debería tener función simpleHealth', () => {
      const healthController = require('../../src/controllers/healthController');
      expect(typeof healthController.simpleHealth).toBe('function');
    });
  });

  describe('TelegramController', () => {
    test('debería tener función webhook', () => {
      const telegramController = require('../../src/controllers/telegramController');
      expect(typeof telegramController.webhook).toBe('function');
    });

    test('debería tener función setWebhook', () => {
      const telegramController = require('../../src/controllers/telegramController');
      expect(typeof telegramController.setWebhook).toBe('function');
    });

    test('debería tener función getWebhookInfo', () => {
      const telegramController = require('../../src/controllers/telegramController');
      expect(typeof telegramController.getWebhookInfo).toBe('function');
    });
  });
});
