module.exports = {
  // Entorno de testing
  testEnvironment: 'node',
  
  // Directorios de tests
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js'
  ],
  
  // Directorios a ignorar
  testPathIgnorePatterns: [
    '/node_modules/',
    '/logs/',
    '/temp/'
  ],
  
  // Cobertura de código (deshabilitada temporalmente)
  collectCoverage: false,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/app.js',
    '!src/config/index.js',
    '!**/node_modules/**',
    '!**/tests/**'
  ],
  
  // Umbrales de cobertura (reducidos para desarrollo inicial)
  coverageThreshold: {
    global: {
      branches: 30,
      functions: 30,
      lines: 30,
      statements: 30
    }
  },
  
  // Setup y teardown
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Timeout para tests
  testTimeout: 30000,
  
  // Variables de entorno para testing
  setupFiles: ['<rootDir>/tests/env.js'],
  
  // Transformaciones
  transform: {},
  
  // Mocks automáticos
  clearMocks: true,
  restoreMocks: true,
  
  // Verbose output
  verbose: true,
  
  // Detectar archivos abiertos
  detectOpenHandles: true,
  forceExit: true
};

