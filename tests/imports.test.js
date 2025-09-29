/**
 * Tests básicos de importación de módulos
 */

describe('Importación de Módulos', () => {
  test('debería poder importar configuración principal', () => {
    const config = require('../src/config/index.js');
    expect(config).toBeDefined();
    expect(config.server).toBeDefined();
    expect(config.database).toBeDefined();
    expect(config.wordpress).toBeDefined();
  });

  test('debería poder importar configuración de base de datos', () => {
    const dbConfig = require('../src/config/database.js');
    expect(dbConfig).toBeDefined();
  });

  test('debería poder importar configuración de logger', () => {
    const loggerConfig = require('../src/config/logger.js');
    expect(loggerConfig).toBeDefined();
  });

  test('debería poder importar servicios', () => {
    const docxService = require('../src/services/docxService.js');
    const wordpressService = require('../src/services/wordpressService.js');
    const telegramService = require('../src/services/telegramService.js');
    
    expect(docxService).toBeDefined();
    expect(wordpressService).toBeDefined();
    expect(telegramService).toBeDefined();
  });

  test('debería poder importar controladores', () => {
    const docxController = require('../src/controllers/docxController.js');
    const healthController = require('../src/controllers/healthController.js');
    const telegramController = require('../src/controllers/telegramController.js');
    
    expect(docxController).toBeDefined();
    expect(healthController).toBeDefined();
    expect(telegramController).toBeDefined();
  });

  test('debería poder importar middlewares', () => {
    const auth = require('../src/middleware/auth.js');
    const security = require('../src/middleware/security.js');
    const validation = require('../src/middleware/validation.js');
    
    expect(auth).toBeDefined();
    expect(security).toBeDefined();
    expect(validation).toBeDefined();
  });

  test('debería poder importar rutas', () => {
    const docxRoutes = require('../src/routes/docxRoutes.js');
    const healthRoutes = require('../src/routes/healthRoutes.js');
    const telegramRoutes = require('../src/routes/telegramRoutes.js');
    const indexRoutes = require('../src/routes/index.js');
    
    expect(docxRoutes).toBeDefined();
    expect(healthRoutes).toBeDefined();
    expect(telegramRoutes).toBeDefined();
    expect(indexRoutes).toBeDefined();
  });
});
