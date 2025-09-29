const axios = require('axios');
const FormData = require('form-data');
const logger = require('../config/logger');
const config = require('../config');

/**
 * Servicio para interactuar con la API REST de WordPress
 * Maneja creación de posts, subida de media y eliminación
 */
class WordPressService {
  constructor() {
    this.baseURL = config.wordpress.apiUrl;
    this.authHeader = `Basic ${config.wordpress.authHeader}`;
    
    // Configurar axios con headers por defecto
    this.apiClient = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
        'User-Agent': 'Condo360-WordPress-API/1.0'
      },
      timeout: 30000 // 30 segundos timeout
    });

    // Interceptor para logging de requests
    this.apiClient.interceptors.request.use(
      (config) => {
        logger.debug('Request a WordPress API', {
          method: config.method,
          url: config.url,
          headers: config.headers
        });
        return config;
      },
      (error) => {
        logger.error('Error en request a WordPress API', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Interceptor para logging de responses
    this.apiClient.interceptors.response.use(
      (response) => {
        logger.debug('Response de WordPress API', {
          status: response.status,
          url: response.config.url,
          dataSize: JSON.stringify(response.data).length
        });
        return response;
      },
      (error) => {
        logger.error('Error en response de WordPress API', {
          status: error.response?.status,
          url: error.config?.url,
          message: error.message,
          data: error.response?.data
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Verificar conectividad con WordPress
   * @returns {Promise<boolean>} - true si WordPress está accesible
   */
  async checkConnection() {
    try {
      const response = await this.apiClient.get('/');
      logger.info('✅ Conexión con WordPress establecida', {
        status: response.status,
        siteName: response.data?.name
      });
      return true;
    } catch (error) {
      logger.error('❌ Error al conectar con WordPress', {
        error: error.message,
        status: error.response?.status
      });
      return false;
    }
  }

  /**
   * Subir imagen al Media Library de WordPress
   * @param {Object} imageData - Datos de la imagen
   * @param {string} altText - Texto alternativo para la imagen
   * @returns {Promise<Object>} - Respuesta de WordPress con URL y ID
   */
  async uploadImage(imageData, altText = '') {
    try {
      logger.info('Subiendo imagen a WordPress Media Library', {
        imageId: imageData.imageId,
        fileName: imageData.fileName,
        contentType: imageData.contentType,
        size: imageData.buffer.length
      });

      // Crear FormData para subir archivo
      const formData = new FormData();
      formData.append('file', imageData.buffer, {
        filename: imageData.fileName,
        contentType: imageData.contentType
      });
      formData.append('alt_text', altText);
      formData.append('title', imageData.fileName.replace(/\.[^/.]+$/, ''));

      // Realizar upload
      const response = await axios.post(`${this.baseURL}/media`, formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': this.authHeader
        },
        timeout: 60000 // 60 segundos para uploads
      });

      const mediaData = response.data;
      
      logger.info('✅ Imagen subida exitosamente a WordPress', {
        imageId: imageData.imageId,
        wpMediaId: mediaData.id,
        wpUrl: mediaData.source_url,
        fileName: mediaData.title?.rendered
      });

      return {
        wpMediaId: mediaData.id,
        wpUrl: mediaData.source_url,
        wpGuid: mediaData.guid?.rendered,
        fileName: mediaData.title?.rendered,
        altText: mediaData.alt_text,
        originalImageId: imageData.imageId,
        tempFileName: imageData.fileName
      };

    } catch (error) {
      logger.error('❌ Error al subir imagen a WordPress', {
        imageId: imageData.imageId,
        fileName: imageData.fileName,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      throw new Error(`Error al subir imagen a WordPress: ${error.message}`);
    }
  }

  /**
   * Subir múltiples imágenes al Media Library
   * @param {Array} images - Array de datos de imágenes
   * @returns {Promise<Array>} - Array de respuestas de WordPress
   */
  async uploadImages(images) {
    const uploadPromises = images.map(async (imageData, index) => {
      try {
        const result = await this.uploadImage(imageData, `Imagen ${index + 1} del documento`);
        return result;
      } catch (error) {
        logger.error('Error al subir imagen individual', {
          imageId: imageData.imageId,
          index,
          error: error.message
        });
        // Retornar error pero continuar con las demás imágenes
        return {
          error: error.message,
          originalImageId: imageData.imageId,
          tempFileName: imageData.fileName
        };
      }
    });

    const results = await Promise.all(uploadPromises);
    
    // Separar resultados exitosos de errores
    const successful = results.filter(r => !r.error);
    const failed = results.filter(r => r.error);
    
    logger.info('Proceso de subida de imágenes completado', {
      total: images.length,
      successful: successful.length,
      failed: failed.length
    });

    return {
      successful,
      failed,
      all: results
    };
  }

  /**
   * Crear post en WordPress
   * @param {Object} postData - Datos del post
   * @returns {Promise<Object>} - Respuesta de WordPress con datos del post creado
   */
  async createPost(postData) {
    try {
      logger.info('Creando post en WordPress', {
        title: postData.title,
        status: postData.status,
        contentLength: postData.content?.length,
        featuredMedia: postData.featured_media
      });

      const response = await this.apiClient.post('/posts', {
        title: postData.title,
        content: postData.content,
        status: postData.status || 'draft',
        featured_media: postData.featured_media || null,
        format: 'standard'
      });

      const post = response.data;
      
      logger.info('✅ Post creado exitosamente en WordPress', {
        wpPostId: post.id,
        title: post.title?.rendered,
        status: post.status,
        link: post.link,
        featuredMedia: post.featured_media
      });

      return {
        wpPostId: post.id,
        title: post.title?.rendered,
        content: post.content?.rendered,
        status: post.status,
        link: post.link,
        featuredMedia: post.featured_media,
        createdAt: post.date,
        modifiedAt: post.modified
      };

    } catch (error) {
      logger.error('❌ Error al crear post en WordPress', {
        title: postData.title,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      throw new Error(`Error al crear post en WordPress: ${error.message}`);
    }
  }

  /**
   * Eliminar post de WordPress
   * @param {number} wpPostId - ID del post en WordPress
   * @param {boolean} forceDelete - Si true, elimina permanentemente; si false, mueve a papelera
   * @returns {Promise<Object>} - Respuesta de WordPress
   */
  async deletePost(wpPostId, forceDelete = false) {
    try {
      logger.info('Eliminando post de WordPress', {
        wpPostId,
        forceDelete
      });

      const response = await this.apiClient.delete(`/posts/${wpPostId}`, {
        params: {
          force: forceDelete
        }
      });

      logger.info('✅ Post eliminado exitosamente de WordPress', {
        wpPostId,
        forceDelete,
        deleted: response.data.deleted
      });

      return {
        wpPostId,
        deleted: response.data.deleted,
        previous: response.data.previous
      };

    } catch (error) {
      logger.error('❌ Error al eliminar post de WordPress', {
        wpPostId,
        forceDelete,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      throw new Error(`Error al eliminar post de WordPress: ${error.message}`);
    }
  }

  /**
   * Eliminar media de WordPress
   * @param {number} mediaId - ID del media en WordPress
   * @param {boolean} forceDelete - Si true, elimina permanentemente
   * @returns {Promise<Object>} - Respuesta de WordPress
   */
  async deleteMedia(mediaId, forceDelete = false) {
    try {
      logger.info('Eliminando media de WordPress', {
        mediaId,
        forceDelete
      });

      const response = await this.apiClient.delete(`/media/${mediaId}`, {
        params: {
          force: forceDelete
        }
      });

      logger.info('✅ Media eliminado exitosamente de WordPress', {
        mediaId,
        forceDelete,
        deleted: response.data.deleted
      });

      return {
        mediaId,
        deleted: response.data.deleted,
        previous: response.data.previous
      };

    } catch (error) {
      logger.error('❌ Error al eliminar media de WordPress', {
        mediaId,
        forceDelete,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      throw new Error(`Error al eliminar media de WordPress: ${error.message}`);
    }
  }

  /**
   * Obtener información de un post
   * @param {number} wpPostId - ID del post en WordPress
   * @returns {Promise<Object>} - Datos del post
   */
  async getPost(wpPostId) {
    try {
      const response = await this.apiClient.get(`/posts/${wpPostId}`);
      return response.data;
    } catch (error) {
      logger.error('Error al obtener post de WordPress', {
        wpPostId,
        error: error.message,
        status: error.response?.status
      });
      throw new Error(`Error al obtener post de WordPress: ${error.message}`);
    }
  }

  /**
   * Obtener información de media
   * @param {number} mediaId - ID del media en WordPress
   * @returns {Promise<Object>} - Datos del media
   */
  async getMedia(mediaId) {
    try {
      const response = await this.apiClient.get(`/media/${mediaId}`);
      return response.data;
    } catch (error) {
      logger.error('Error al obtener media de WordPress', {
        mediaId,
        error: error.message,
        status: error.response?.status
      });
      throw new Error(`Error al obtener media de WordPress: ${error.message}`);
    }
  }
}

module.exports = new WordPressService();

