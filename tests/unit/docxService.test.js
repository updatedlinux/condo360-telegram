/**
 * Tests unitarios para DocxService
 */

// Mock mammoth antes de importar el servicio
jest.mock('mammoth', () => ({
  convertToHtml: jest.fn(),
  images: {
    inline: jest.fn()
  }
}));

const docxService = require('../../src/services/docxService');
const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

describe('DocxService', () => {
  let sampleDocxBuffer;

  beforeAll(() => {
    // Crear un buffer de prueba para .docx
    // En un test real, esto sería un archivo .docx válido
    sampleDocxBuffer = Buffer.from('PK\x03\x04\x14\x00\x00\x00\x08\x00', 'binary');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('convertToHtml', () => {
    it('debería convertir un archivo .docx a HTML', async () => {
      // Configurar mock de mammoth
      mammoth.convertToHtml.mockResolvedValue({
        value: '<p>Contenido de prueba</p>',
        messages: []
      });
      mammoth.images.inline.mockReturnValue([]);

      const result = await docxService.convertToHtml(sampleDocxBuffer);

      expect(result).toHaveProperty('html');
      expect(result).toHaveProperty('images');
      expect(result).toHaveProperty('metadata');
      expect(result.html).toBe('<p>Contenido de prueba</p>');
      expect(Array.isArray(result.images)).toBe(true);
      expect(mammoth.convertToHtml).toHaveBeenCalledWith(sampleDocxBuffer, expect.any(Object));
    });

    it('debería manejar errores de conversión', async () => {
      // Configurar mock de mammoth que falla
      mammoth.convertToHtml.mockRejectedValue(new Error('Error de conversión'));

      await expect(docxService.convertToHtml(sampleDocxBuffer))
        .rejects
        .toThrow('Error al convertir archivo .docx');
    });
  });

  describe('getImageExtension', () => {
    it('debería retornar la extensión correcta para diferentes tipos MIME', () => {
      expect(docxService.getImageExtension('image/jpeg')).toBe('.jpg');
      expect(docxService.getImageExtension('image/png')).toBe('.png');
      expect(docxService.getImageExtension('image/gif')).toBe('.gif');
      expect(docxService.getImageExtension('image/webp')).toBe('.webp');
      expect(docxService.getImageExtension('image/bmp')).toBe('.bmp');
      expect(docxService.getImageExtension('image/tiff')).toBe('.tiff');
    });

    it('debería retornar .jpg por defecto para tipos MIME desconocidos', () => {
      expect(docxService.getImageExtension('image/unknown')).toBe('.jpg');
      expect(docxService.getImageExtension('application/octet-stream')).toBe('.jpg');
    });
  });

  describe('replaceImageReferences', () => {
    it('debería reemplazar referencias temporales con URLs de WordPress', () => {
      const html = '<img src="temp://image1.jpg" alt="Imagen 1"><img src="temp://image2.png" alt="Imagen 2">';
      const imageMappings = [
        {
          tempFileName: 'image1.jpg',
          wpUrl: 'https://wordpress.com/wp-content/uploads/image1.jpg',
          imageId: 'img1'
        },
        {
          tempFileName: 'image2.png',
          wpUrl: 'https://wordpress.com/wp-content/uploads/image2.png',
          imageId: 'img2'
        }
      ];

      const result = docxService.replaceImageReferences(html, imageMappings);

      expect(result).toContain('https://wordpress.com/wp-content/uploads/image1.jpg');
      expect(result).toContain('https://wordpress.com/wp-content/uploads/image2.png');
      expect(result).not.toContain('temp://image1.jpg');
      expect(result).not.toContain('temp://image2.png');
    });

    it('debería retornar HTML sin cambios si no hay mapeos', () => {
      const html = '<p>Contenido sin imágenes</p>';
      const result = docxService.replaceImageReferences(html, []);

      expect(result).toBe(html);
    });
  });

  describe('cleanupTempFiles', () => {
    it('debería limpiar archivos temporales', async () => {
      // Crear archivo temporal de prueba
      const tempDir = './tests/temp';
      const tempFile = path.join(tempDir, 'test-temp-file.txt');
      
      fs.writeFileSync(tempFile, 'contenido temporal');

      // Verificar que el archivo existe
      expect(fs.existsSync(tempFile)).toBe(true);

      // Limpiar archivo temporal
      await docxService.cleanupTempFiles([tempFile]);

      // Verificar que el archivo fue eliminado
      expect(fs.existsSync(tempFile)).toBe(false);
    });

    it('debería manejar archivos que no existen sin errores', async () => {
      const nonExistentFile = './tests/temp/non-existent-file.txt';
      
      // No debería lanzar error
      await expect(docxService.cleanupTempFiles([nonExistentFile]))
        .resolves
        .toBeUndefined();
    });
  });
});

