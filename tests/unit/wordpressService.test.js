/**
 * Tests unitarios para WordPressService
 */

const wordpressService = require('../../src/services/wordpressService');
const axios = require('axios');

// Mock de axios
jest.mock('axios');
const mockedAxios = axios;

describe('WordPressService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkConnection', () => {
    it('debería verificar conexión exitosa con WordPress', async () => {
      mockedAxios.create.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          status: 200,
          data: { name: 'Test WordPress Site' }
        }),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() }
        }
      });

      const result = await wordpressService.checkConnection();

      expect(result).toBe(true);
    });

    it('debería manejar errores de conexión', async () => {
      mockedAxios.create.mockReturnValue({
        get: jest.fn().mockRejectedValue(new Error('Connection failed')),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() }
        }
      });

      const result = await wordpressService.checkConnection();

      expect(result).toBe(false);
    });
  });

  describe('uploadImage', () => {
    it('debería subir imagen exitosamente', async () => {
      const mockImageData = {
        imageId: 'img1',
        fileName: 'test.jpg',
        contentType: 'image/jpeg',
        buffer: Buffer.from('fake-image-data')
      };

      const mockResponse = {
        data: {
          id: 123,
          source_url: 'https://wordpress.com/wp-content/uploads/test.jpg',
          guid: { rendered: 'https://wordpress.com/wp-content/uploads/test.jpg' },
          title: { rendered: 'test' },
          alt_text: 'Test image'
        }
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await wordpressService.uploadImage(mockImageData, 'Test image');

      expect(result).toHaveProperty('wpMediaId', 123);
      expect(result).toHaveProperty('wpUrl', 'https://wordpress.com/wp-content/uploads/test.jpg');
      expect(result).toHaveProperty('originalImageId', 'img1');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/media'),
        expect.any(Object),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Basic')
          })
        })
      );
    });

    it('debería manejar errores de subida de imagen', async () => {
      const mockImageData = {
        imageId: 'img1',
        fileName: 'test.jpg',
        contentType: 'image/jpeg',
        buffer: Buffer.from('fake-image-data')
      };

      mockedAxios.post.mockRejectedValue(new Error('Upload failed'));

      await expect(wordpressService.uploadImage(mockImageData))
        .rejects
        .toThrow('Error al subir imagen a WordPress');
    });
  });

  describe('createPost', () => {
    it('debería crear post exitosamente', async () => {
      const mockPostData = {
        title: 'Test Post',
        content: '<p>Test content</p>',
        status: 'draft',
        featured_media: 123
      };

      const mockResponse = {
        data: {
          id: 456,
          title: { rendered: 'Test Post' },
          content: { rendered: '<p>Test content</p>' },
          status: 'draft',
          link: 'https://wordpress.com/2024/01/15/test-post/',
          featured_media: 123,
          date: '2024-01-15T10:00:00',
          modified: '2024-01-15T10:00:00'
        }
      };

      mockedAxios.create.mockReturnValue({
        post: jest.fn().mockResolvedValue(mockResponse),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() }
        }
      });

      const result = await wordpressService.createPost(mockPostData);

      expect(result).toHaveProperty('wpPostId', 456);
      expect(result).toHaveProperty('title', 'Test Post');
      expect(result).toHaveProperty('status', 'draft');
      expect(result).toHaveProperty('link', 'https://wordpress.com/2024/01/15/test-post/');
    });

    it('debería manejar errores de creación de post', async () => {
      const mockPostData = {
        title: 'Test Post',
        content: '<p>Test content</p>',
        status: 'draft'
      };

      mockedAxios.create.mockReturnValue({
        post: jest.fn().mockRejectedValue(new Error('Creation failed')),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() }
        }
      });

      await expect(wordpressService.createPost(mockPostData))
        .rejects
        .toThrow('Error al crear post en WordPress');
    });
  });

  describe('deletePost', () => {
    it('debería eliminar post exitosamente', async () => {
      const wpPostId = 456;
      const mockResponse = {
        data: {
          deleted: true,
          previous: { id: wpPostId, title: 'Test Post' }
        }
      };

      mockedAxios.create.mockReturnValue({
        delete: jest.fn().mockResolvedValue(mockResponse),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() }
        }
      });

      const result = await wordpressService.deletePost(wpPostId, true);

      expect(result).toHaveProperty('wpPostId', wpPostId);
      expect(result).toHaveProperty('deleted', true);
      expect(result).toHaveProperty('previous');
    });

    it('debería manejar errores de eliminación de post', async () => {
      const wpPostId = 456;

      mockedAxios.create.mockReturnValue({
        delete: jest.fn().mockRejectedValue(new Error('Deletion failed')),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() }
        }
      });

      await expect(wordpressService.deletePost(wpPostId))
        .rejects
        .toThrow('Error al eliminar post de WordPress');
    });
  });

  describe('deleteMedia', () => {
    it('debería eliminar media exitosamente', async () => {
      const mediaId = 123;
      const mockResponse = {
        data: {
          deleted: true,
          previous: { id: mediaId, title: 'Test Image' }
        }
      };

      mockedAxios.create.mockReturnValue({
        delete: jest.fn().mockResolvedValue(mockResponse),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() }
        }
      });

      const result = await wordpressService.deleteMedia(mediaId, true);

      expect(result).toHaveProperty('mediaId', mediaId);
      expect(result).toHaveProperty('deleted', true);
      expect(result).toHaveProperty('previous');
    });

    it('debería manejar errores de eliminación de media', async () => {
      const mediaId = 123;

      mockedAxios.create.mockReturnValue({
        delete: jest.fn().mockRejectedValue(new Error('Media deletion failed')),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() }
        }
      });

      await expect(wordpressService.deleteMedia(mediaId))
        .rejects
        .toThrow('Error al eliminar media de WordPress');
    });
  });

  describe('getPost', () => {
    it('debería obtener post exitosamente', async () => {
      const wpPostId = 456;
      const mockResponse = {
        data: {
          id: wpPostId,
          title: { rendered: 'Test Post' },
          content: { rendered: '<p>Test content</p>' },
          status: 'draft'
        }
      };

      mockedAxios.create.mockReturnValue({
        get: jest.fn().mockResolvedValue(mockResponse),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() }
        }
      });

      const result = await wordpressService.getPost(wpPostId);

      expect(result).toHaveProperty('id', wpPostId);
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('status');
    });

    it('debería manejar errores al obtener post', async () => {
      const wpPostId = 456;

      mockedAxios.create.mockReturnValue({
        get: jest.fn().mockRejectedValue(new Error('Post not found')),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() }
        }
      });

      await expect(wordpressService.getPost(wpPostId))
        .rejects
        .toThrow('Error al obtener post de WordPress');
    });
  });

  describe('getMedia', () => {
    it('debería obtener media exitosamente', async () => {
      const mediaId = 123;
      const mockResponse = {
        data: {
          id: mediaId,
          source_url: 'https://wordpress.com/wp-content/uploads/test.jpg',
          title: { rendered: 'Test Image' },
          alt_text: 'Test image'
        }
      };

      mockedAxios.create.mockReturnValue({
        get: jest.fn().mockResolvedValue(mockResponse),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() }
        }
      });

      const result = await wordpressService.getMedia(mediaId);

      expect(result).toHaveProperty('id', mediaId);
      expect(result).toHaveProperty('source_url');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('alt_text');
    });

    it('debería manejar errores al obtener media', async () => {
      const mediaId = 123;

      mockedAxios.create.mockReturnValue({
        get: jest.fn().mockRejectedValue(new Error('Media not found')),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() }
        }
      });

      await expect(wordpressService.getMedia(mediaId))
        .rejects
        .toThrow('Error al obtener media de WordPress');
    });
  });
});

