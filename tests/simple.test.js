/**
 * Tests básicos para verificar que Jest funciona correctamente
 */

describe('Tests Básicos', () => {
  test('debería sumar números correctamente', () => {
    expect(2 + 2).toBe(4);
  });

  test('debería verificar que un string contiene texto', () => {
    const texto = 'Hola mundo';
    expect(texto).toContain('mundo');
  });

  test('debería verificar que un array tiene elementos', () => {
    const array = [1, 2, 3];
    expect(array).toHaveLength(3);
    expect(array).toContain(2);
  });

  test('debería manejar promesas', async () => {
    const promesa = Promise.resolve('éxito');
    await expect(promesa).resolves.toBe('éxito');
  });

  test('debería manejar errores', () => {
    const funcionQueFalla = () => {
      throw new Error('Error de prueba');
    };
    expect(funcionQueFalla).toThrow('Error de prueba');
  });
});

describe('Configuración de Entorno', () => {
  test('debería cargar variables de entorno', () => {
    // Verificar que las variables de entorno están disponibles
    expect(process.env.NODE_ENV).toBeDefined();
  });

  test('debería tener acceso a módulos de Node', () => {
    const fs = require('fs');
    const path = require('path');
    
    expect(fs).toBeDefined();
    expect(path).toBeDefined();
    expect(typeof fs.readFileSync).toBe('function');
    expect(typeof path.join).toBe('function');
  });
});
