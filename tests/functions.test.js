/**
 * Tests básicos de funciones de servicios
 */

describe('Funciones de Servicios', () => {
  test('DocxService debería tener funciones básicas', () => {
    const docxService = require('../src/services/docxService.js');
    
    expect(typeof docxService.getImageExtension).toBe('function');
    expect(typeof docxService.replaceImageReferences).toBe('function');
    expect(typeof docxService.cleanupTempFiles).toBe('function');
  });

  test('WordPressService debería tener funciones básicas', () => {
    const wordpressService = require('../src/services/wordpressService.js');
    
    expect(typeof wordpressService.checkConnection).toBe('function');
    expect(typeof wordpressService.createPost).toBe('function');
    expect(typeof wordpressService.deletePost).toBe('function');
    expect(typeof wordpressService.uploadImage).toBe('function');
  });

  test('TelegramService debería tener funciones básicas', () => {
    const telegramService = require('../src/services/telegramService.js');
    
    expect(typeof telegramService.isEnabled).toBe('function');
    expect(typeof telegramService.sendMessage).toBe('function');
    expect(typeof telegramService.processMessage).toBe('function');
    expect(typeof telegramService.downloadFile).toBe('function');
  });

  test('Controladores deberían tener funciones básicas', () => {
    const docxController = require('../src/controllers/docxController.js');
    const healthController = require('../src/controllers/healthController.js');
    const telegramController = require('../src/controllers/telegramController.js');
    
    expect(typeof docxController.uploadDocx).toBe('function');
    expect(typeof docxController.deletePost).toBe('function');
    expect(typeof healthController.checkHealth).toBe('function');
    expect(typeof telegramController.webhook).toBe('function');
  });
});
