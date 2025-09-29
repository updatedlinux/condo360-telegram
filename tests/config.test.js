/**
 * Tests simplificados para configuración
 */

// Mock de dotenv
jest.mock('dotenv', () => ({
  config: jest.fn()
}));

describe('Configuración - Tests Simplificados', () => {
  test('debería poder importar configuración principal', () => {
    const config = require('../../src/config');
    expect(config).toBeDefined();
    expect(config.app).toBeDefined();
    expect(config.database).toBeDefined();
    expect(config.wordpress).toBeDefined();
  });

  test('debería poder importar configuración de base de datos', () => {
    const dbConfig = require('../../src/config/database');
    expect(dbConfig).toBeDefined();
  });

  test('debería poder importar configuración de logger', () => {
    const loggerConfig = require('../../src/config/logger');
    expect(loggerConfig).toBeDefined();
  });
});
