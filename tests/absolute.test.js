/**
 * Tests básicos con rutas absolutas
 */

const path = require('path');

describe('Tests con Rutas Absolutas', () => {
  test('debería poder importar configuración usando rutas absolutas', () => {
    const configPath = path.join(__dirname, '../../src/config/index.js');
    const config = require(configPath);
    expect(config).toBeDefined();
  });

  test('debería poder importar configuración de base de datos', () => {
    const dbPath = path.join(__dirname, '../../src/config/database.js');
    const dbConfig = require(dbPath);
    expect(dbConfig).toBeDefined();
  });

  test('debería poder importar configuración de logger', () => {
    const loggerPath = path.join(__dirname, '../../src/config/logger.js');
    const loggerConfig = require(loggerPath);
    expect(loggerConfig).toBeDefined();
  });
});
