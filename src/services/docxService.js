const mammoth = require('mammoth');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');
const config = require('../config');

/**
 * Servicio para conversión de archivos .docx a HTML
 * Preserva TODOS los estilos tal como están en Word sin modificaciones
 */
class DocxService {
  constructor() {
    this.tempDir = path.join(process.cwd(), 'temp');
    this.ensureTempDir();
  }

  /**
   * Crear directorio temporal si no existe
   */
  ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Convertir archivo .docx a HTML preservando estilos exactos
   * @param {Buffer} docxBuffer - Buffer del archivo .docx
   * @param {Object} options - Opciones de conversión
   * @returns {Promise<Object>} - { html, images, metadata }
   */
  async convertToHtml(docxBuffer, options = {}) {
    try {
      logger.info('Iniciando conversión de .docx a HTML', {
        bufferSize: docxBuffer.length,
        options
      });

      // Configuración de mammoth para preservar estilos exactamente
      const mammothOptions = {
        // Mapeo básico de estilos sin modificar contenido
        styleMap: [
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
          "p[style-name='Heading 4'] => h4:fresh",
          "p[style-name='Heading 5'] => h5:fresh",
          "p[style-name='Heading 6'] => h6:fresh",
          "p[style-name='Normal'] => p:fresh"
        ],
        // Preservar estilos inline sin modificaciones
        includeEmbeddedStyleMap: true,
        // Convertir imágenes embebidas
        convertImage: mammoth.images.inline(this.handleImage.bind(this))
      };

      // Realizar conversión
      const result = await mammoth.convertToHtml({ buffer: docxBuffer }, mammothOptions);
      
      // Procesar imágenes extraídas
      const processedImages = await this.processExtractedImages(result.messages);

      logger.info('Conversión completada exitosamente', {
        htmlLength: result.value.length,
        imagesCount: processedImages.length,
        warnings: result.messages.filter(m => m.type === 'warning').length
      });

      return {
        html: result.value,
        images: processedImages,
        metadata: {
          originalSize: docxBuffer.length,
          htmlLength: result.value.length,
          imagesCount: processedImages.length,
          warnings: result.messages.filter(m => m.type === 'warning'),
          conversionTime: new Date().toISOString()
        }
      };

    } catch (error) {
      logger.error('Error en conversión de .docx a HTML', {
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Error al convertir archivo .docx: ${error.message}`);
    }
  }

  /**
   * Manejar imágenes durante la conversión de mammoth
   * @param {Object} element - Elemento de imagen de mammoth
   * @returns {Promise<Object>} - Objeto con src de la imagen
   */
  async handleImage(element) {
    try {
      const imageBuffer = await element.read('base64');
      const contentType = element.contentType;
      
      // Generar nombre único para la imagen
      const imageId = uuidv4();
      const extension = this.getImageExtension(contentType);
      const fileName = `${imageId}${extension}`;
      
      // Guardar imagen temporalmente
      const tempPath = path.join(this.tempDir, fileName);
      const buffer = Buffer.from(imageBuffer, 'base64');
      
      await fs.promises.writeFile(tempPath, buffer);
      
      logger.debug('Imagen extraída del .docx', {
        imageId,
        fileName,
        contentType,
        size: buffer.length
      });

      return {
        src: `temp://${fileName}`, // Referencia temporal que será reemplazada
        imageId,
        fileName,
        contentType,
        buffer,
        tempPath
      };

    } catch (error) {
      logger.error('Error al procesar imagen del .docx', {
        error: error.message,
        contentType: element.contentType
      });
      
      // Retornar imagen placeholder en caso de error
      return {
        src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        error: error.message
      };
    }
  }

  /**
   * Procesar imágenes extraídas del documento
   * @param {Array} messages - Mensajes de mammoth
   * @returns {Promise<Array>} - Array de imágenes procesadas
   */
  async processExtractedImages(messages) {
    const images = [];
    
    for (const message of messages) {
      if (message.type === 'image' && message.image) {
        try {
          const processedImage = await this.processImage(message.image);
          images.push(processedImage);
        } catch (error) {
          logger.error('Error al procesar imagen extraída', {
            error: error.message,
            imageId: message.image.imageId
          });
        }
      }
    }
    
    return images;
  }

  /**
   * Procesar una imagen individual
   * @param {Object} imageData - Datos de la imagen
   * @returns {Promise<Object>} - Imagen procesada
   */
  async processImage(imageData) {
    try {
      let processedBuffer = imageData.buffer;
      
      // Optimizar imagen si está habilitado
      if (config.images.optimizationEnabled) {
        processedBuffer = await this.optimizeImage(imageData.buffer, imageData.contentType);
      }
      
      return {
        imageId: imageData.imageId,
        fileName: imageData.fileName,
        contentType: imageData.contentType,
        originalSize: imageData.buffer.length,
        optimizedSize: processedBuffer.length,
        buffer: processedBuffer,
        tempPath: imageData.tempPath,
        optimized: config.images.optimizationEnabled
      };
      
    } catch (error) {
      logger.error('Error al procesar imagen individual', {
        error: error.message,
        imageId: imageData.imageId
      });
      throw error;
    }
  }

  /**
   * Optimizar imagen usando Sharp
   * @param {Buffer} imageBuffer - Buffer de la imagen original
   * @param {string} contentType - Tipo de contenido de la imagen
   * @returns {Promise<Buffer>} - Buffer de la imagen optimizada
   */
  async optimizeImage(imageBuffer, contentType) {
    try {
      const sharpInstance = sharp(imageBuffer);
      
      // Obtener metadatos de la imagen
      const metadata = await sharpInstance.metadata();
      
      // Redimensionar si es necesario
      if (metadata.width > config.images.maxWidth || metadata.height > config.images.maxHeight) {
        sharpInstance.resize(config.images.maxWidth, config.images.maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }
      
      // Optimizar según el tipo de imagen
      switch (contentType) {
        case 'image/jpeg':
          sharpInstance.jpeg({ 
            quality: config.images.quality,
            progressive: true
          });
          break;
        case 'image/png':
          sharpInstance.png({ 
            quality: config.images.quality,
            progressive: true
          });
          break;
        case 'image/webp':
          sharpInstance.webp({ 
            quality: config.images.quality
          });
          break;
        default:
          // Convertir a JPEG si no es un formato soportado
          sharpInstance.jpeg({ 
            quality: config.images.quality,
            progressive: true
          });
      }
      
      const optimizedBuffer = await sharpInstance.toBuffer();
      
      logger.debug('Imagen optimizada', {
        originalSize: imageBuffer.length,
        optimizedSize: optimizedBuffer.length,
        compressionRatio: ((imageBuffer.length - optimizedBuffer.length) / imageBuffer.length * 100).toFixed(2) + '%',
        contentType
      });
      
      return optimizedBuffer;
      
    } catch (error) {
      logger.error('Error al optimizar imagen', {
        error: error.message,
        contentType
      });
      
      // Retornar imagen original si falla la optimización
      return imageBuffer;
    }
  }

  /**
   * Obtener extensión de archivo basada en el tipo de contenido
   * @param {string} contentType - Tipo de contenido MIME
   * @returns {string} - Extensión de archivo
   */
  getImageExtension(contentType) {
    const extensions = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/bmp': '.bmp',
      'image/tiff': '.tiff'
    };
    
    return extensions[contentType] || '.jpg';
  }

  /**
   * Limpiar archivos temporales
   * @param {Array} imagePaths - Rutas de imágenes temporales
   */
  async cleanupTempFiles(imagePaths = []) {
    try {
      for (const imagePath of imagePaths) {
        if (fs.existsSync(imagePath)) {
          await fs.promises.unlink(imagePath);
          logger.debug('Archivo temporal eliminado', { path: imagePath });
        }
      }
    } catch (error) {
      logger.error('Error al limpiar archivos temporales', {
        error: error.message,
        paths: imagePaths
      });
    }
  }

  /**
   * Reemplazar referencias temporales de imágenes en HTML con URLs de WordPress
   * @param {string} html - HTML con referencias temporales
   * @param {Array} imageMappings - Mapeo de imágenes temporales a URLs de WordPress
   * @returns {string} - HTML con URLs de WordPress
   */
  replaceImageReferences(html, imageMappings) {
    let updatedHtml = html;
    
    for (const mapping of imageMappings) {
      const tempReference = `temp://${mapping.tempFileName}`;
      const wpUrl = mapping.wpUrl;
      
      updatedHtml = updatedHtml.replace(new RegExp(tempReference, 'g'), wpUrl);
      
      logger.debug('Referencia de imagen reemplazada', {
        tempReference,
        wpUrl,
        imageId: mapping.imageId
      });
    }
    
    return updatedHtml;
  }
}

module.exports = new DocxService();

