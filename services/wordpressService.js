const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');

/**
 * Servicio para interactuar con WordPress REST API
 */
class WordPressService {
  constructor() {
    this.baseUrl = process.env.WP_BASE_URL || 'https://bonaventurecclub.com';
    this.username = process.env.WP_REST_USER;
    this.password = process.env.WP_REST_APP_PASSWORD;
    
    if (!this.username || !this.password) {
      throw new Error('Credenciales de WordPress no configuradas (WP_REST_USER, WP_REST_APP_PASSWORD)');
    }
    
    // Configurar autenticación básica
    this.auth = Buffer.from(`${this.username}:${this.password}`).toString('base64');
  }

  /**
   * Subir archivo como media a WordPress
   */
  async uploadMedia(filePath, filename, mimeType) {
    try {
      const fileBuffer = await fs.readFile(filePath);
      
      const formData = new FormData();
      formData.append('file', new Blob([fileBuffer], { type: mimeType }), filename);
      
      const response = await axios.post(
        `${this.baseUrl}/wp-json/wp/v2/media`,
        formData,
        {
          headers: {
            'Authorization': `Basic ${this.auth}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      return {
        id: response.data.id,
        url: response.data.source_url,
        link: response.data.link,
        title: response.data.title.rendered,
      };
    } catch (error) {
      console.error('❌ Error al subir media a WordPress:', error.response?.data || error.message);
      throw new Error(`Error al subir archivo a WordPress: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Crear post en WordPress
   */
  async createPost(postData) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/wp-json/wp/v2/posts`,
        {
          title: postData.title,
          content: postData.content,
          status: process.env.POST_STATUS || 'publish',
          author: postData.author || 1,
          featured_media: postData.featured_media || 0,
          meta: postData.meta || {},
        },
        {
          headers: {
            'Authorization': `Basic ${this.auth}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      return {
        id: response.data.id,
        url: response.data.link,
        title: response.data.title.rendered,
        status: response.data.status,
      };
    } catch (error) {
      console.error('❌ Error al crear post en WordPress:', error.response?.data || error.message);
      throw new Error(`Error al crear post en WordPress: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Obtener información de un usuario por ID
   */
  async getUserById(userId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/wp-json/wp/v2/users/${userId}`,
        {
          headers: {
            'Authorization': `Basic ${this.auth}`,
          },
        }
      );
      
      return {
        id: response.data.id,
        name: response.data.name,
        slug: response.data.slug,
        email: response.data.email,
      };
    } catch (error) {
      console.error('❌ Error al obtener usuario de WordPress:', error.response?.data || error.message);
      return null;
    }
  }
}

/**
 * Servicio para procesamiento de archivos
 */
class FileProcessingService {
  constructor() {
    this.tempDir = process.env.TEMP_UPLOAD_DIR || './temp/uploads';
  }

  /**
   * Procesar archivo DOCX y convertir a HTML
   */
  async processDocx(filePath) {
    try {
      console.log('📄 Procesando archivo DOCX:', filePath);
      
      const result = await mammoth.convertToHtml({ path: filePath });
      const html = result.value;
      const messages = result.messages;
      
      // Log de mensajes de conversión
      if (messages.length > 0) {
        console.log('📝 Mensajes de conversión DOCX:', messages);
      }
      
      // Extraer imágenes embebidas
      const images = await this.extractImagesFromDocx(filePath);
      
      return {
        html,
        images,
        messages,
      };
    } catch (error) {
      console.error('❌ Error al procesar DOCX:', error);
      throw new Error(`Error al procesar archivo DOCX: ${error.message}`);
    }
  }

  /**
   * Extraer imágenes de archivo DOCX
   */
  async extractImagesFromDocx(filePath) {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      // Por ahora retornamos array vacío, mammoth no extrae imágenes directamente
      // En una implementación más avanzada se podría usar 'officegen' o similar
      return [];
    } catch (error) {
      console.error('❌ Error al extraer imágenes de DOCX:', error);
      return [];
    }
  }

  /**
   * Procesar archivo PDF y extraer texto
   */
  async processPdf(filePath) {
    try {
      console.log('📄 Procesando archivo PDF:', filePath);
      
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdfParse(dataBuffer);
      
      return {
        text: data.text,
        pages: data.numpages,
        info: data.info,
      };
    } catch (error) {
      console.error('❌ Error al procesar PDF:', error);
      throw new Error(`Error al procesar archivo PDF: ${error.message}`);
    }
  }

  /**
   * Limpiar archivos temporales
   */
  async cleanupTempFile(filePath) {
    try {
      await fs.unlink(filePath);
      console.log('🗑️  Archivo temporal eliminado:', filePath);
    } catch (error) {
      console.error('❌ Error al eliminar archivo temporal:', error);
    }
  }

  /**
   * Generar HTML para PDF
   */
  generatePdfHtml(title, description, pdfUrl, filename) {
    return `
      <div class="pdf-communique">
        <h2>${title}</h2>
        ${description ? `<p class="description">${description}</p>` : ''}
        <div class="pdf-download">
          <a href="${pdfUrl}" target="_blank" class="pdf-link">
            📄 Descargar comunicado: ${filename}
          </a>
        </div>
        <div class="pdf-embed">
          <iframe src="${pdfUrl}" width="100%" height="600px" frameborder="0">
            <p>Su navegador no soporta iframes. <a href="${pdfUrl}" target="_blank">Haga clic aquí para ver el PDF</a></p>
          </iframe>
        </div>
      </div>
    `;
  }

  /**
   * Generar HTML para DOCX procesado
   */
  generateDocxHtml(title, description, content) {
    return `
      <div class="docx-communique">
        <h2>${title}</h2>
        ${description ? `<p class="description">${description}</p>` : ''}
        <div class="content">
          ${content}
        </div>
      </div>
    `;
  }
}

module.exports = {
  WordPressService,
  FileProcessingService,
};
