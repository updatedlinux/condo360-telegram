/**
 * Setup global para tests con Jest
 * Configuración básica para testing
 */

const path = require('path');
const fs = require('fs');

// Configurar variables de entorno para testing
process.env.NODE_ENV = 'test';
process.env.PORT = '6001';
process.env.LOG_DIR = './tests/logs';

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
jest.setTimeout(10000);

// Mock de logger para evitar errores en tests
jest.mock('../src/config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  logWithTrace: jest.fn()
}));

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
  // Limpiar directorios de testing
  testDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

console.log('🧪 Setup global de testing configurado');

