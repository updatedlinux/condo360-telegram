/**
 * Tests simplificados para rutas
 */

// Mock de dependencias
jest.mock('../../src/controllers/docxController');
jest.mock('../../src/controllers/healthController');
jest.mock('../../src/controllers/telegramController');
jest.mock('../../src/middleware/auth');
jest.mock('../../src/middleware/security');
jest.mock('../../src/middleware/validation');

describe('Rutas - Tests Simplificados', () => {
  test('debería poder importar docxRoutes', () => {
    const docxRoutes = require('../../src/routes/docxRoutes');
    expect(docxRoutes).toBeDefined();
  });

  test('debería poder importar healthRoutes', () => {
    const healthRoutes = require('../../src/routes/healthRoutes');
    expect(healthRoutes).toBeDefined();
  });

  test('debería poder importar telegramRoutes', () => {
    const telegramRoutes = require('../../src/routes/telegramRoutes');
    expect(telegramRoutes).toBeDefined();
  });

  test('debería poder importar index routes', () => {
    const indexRoutes = require('../../src/routes/index');
    expect(indexRoutes).toBeDefined();
  });
});
