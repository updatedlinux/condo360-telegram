/**
 * Test muy simple para verificar importación
 */

describe('Test de Importación Simple', () => {
  test('debería poder importar path', () => {
    const path = require('path');
    expect(path).toBeDefined();
    expect(typeof path.join).toBe('function');
  });

  test('debería poder importar fs', () => {
    const fs = require('fs');
    expect(fs).toBeDefined();
    expect(typeof fs.readFileSync).toBe('function');
  });

  test('debería poder importar configuración usando require directo', () => {
    // Intentar importar directamente desde el directorio actual
    const config = require('../src/config/index.js');
    expect(config).toBeDefined();
  });
});
