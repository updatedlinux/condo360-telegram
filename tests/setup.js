/**
 * Setup global para tests con Jest
 * Se ejecuta después de configurar el entorno de testing
 */

const path = require('path');
const fs = require('fs');

// Crear directorios necesarios para testing
const testDirs = [
  './tests/logs',
  './tests/temp',
  './tests/fixtures'
];

testDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configurar timeouts globales
jest.setTimeout(30000);

// Mock de console para evitar spam en tests
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  // Mantener solo errores y warnings importantes
  log: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  warn: originalConsole.warn,
  error: originalConsole.error
};

// Limpiar mocks después de cada test
afterEach(() => {
  jest.clearAllMocks();
});

// Limpiar archivos temporales después de cada test
afterEach(() => {
  const tempDir = './tests/temp';
  if (fs.existsSync(tempDir)) {
    const files = fs.readdirSync(tempDir);
    files.forEach(file => {
      const filePath = path.join(tempDir, file);
      if (fs.statSync(filePath).isFile()) {
        fs.unlinkSync(filePath);
      }
    });
  }
});

// Limpiar todo después de todos los tests
afterAll(() => {
  // Restaurar console original
  global.console = originalConsole;
  
  // Limpiar directorios de testing
  testDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

console.log('🧪 Setup global de testing configurado');

