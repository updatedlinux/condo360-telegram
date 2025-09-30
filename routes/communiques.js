const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const communiquesController = require('../controllers/communiquesController');
const { validateFileUpload } = require('../middleware/fileValidation');

const router = express.Router();

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = process.env.TEMP_UPLOAD_DIR || './temp/uploads';
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Generar nombre único con timestamp
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    const sanitizedName = name.replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${sanitizedName}_${timestamp}${ext}`);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 25 * 1024 * 1024, // 25MB por defecto
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const allowedExtensions = ['.pdf', '.docx'];
    
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(file.mimeType) || allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo se aceptan archivos .docx y .pdf'), false);
    }
  },
});

/**
 * @swagger
 * /communiques/upload:
 *   post:
 *     summary: Subir comunicado
 *     description: Sube un archivo de comunicado (.docx o .pdf) y lo publica en WordPress
 *     tags: [Comunicados]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - title
 *               - wp_user_id
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Archivo .docx o .pdf (máximo 25MB)
 *               title:
 *                 type: string
 *                 description: Título del comunicado
 *               description:
 *                 type: string
 *                 description: Descripción corta del comunicado
 *               wp_user_id:
 *                 type: integer
 *                 description: ID del usuario de WordPress que envía el comunicado
 *               user_display_name:
 *                 type: string
 *                 description: Nombre del usuario que envía el comunicado
 *     responses:
 *       200:
 *         description: Comunicado subido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     communique_id:
 *                       type: integer
 *                     wp_post_id:
 *                       type: integer
 *                     wp_post_url:
 *                       type: string
 *                     notifications_sent:
 *                       type: integer
 *       400:
 *         description: Error de validación
 *       500:
 *         description: Error interno del servidor
 */
router.post('/upload', upload.single('file'), validateFileUpload, communiquesController.uploadCommunique);

/**
 * @swagger
 * /communiques:
 *   get:
 *     summary: Listar comunicados
 *     description: Obtiene una lista paginada de todos los comunicados
 *     tags: [Comunicados]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Número de elementos por página
 *       - in: query
 *         name: file_type
 *         schema:
 *           type: string
 *           enum: [docx, pdf]
 *         description: Filtrar por tipo de archivo
 *     responses:
 *       200:
 *         description: Lista de comunicados obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     communiques:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           title:
 *                             type: string
 *                           description:
 *                             type: string
 *                           file_type:
 *                             type: string
 *                           wp_post_url:
 *                             type: string
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 */
router.get('/', communiquesController.getCommuniques);

/**
 * @swagger
 * /communiques/{id}:
 *   get:
 *     summary: Obtener comunicado por ID
 *     description: Obtiene los detalles de un comunicado específico y sus notificaciones
 *     tags: [Comunicados]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del comunicado
 *     responses:
 *       200:
 *         description: Comunicado obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     communique:
 *                       type: object
 *                     notifications:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           email:
 *                             type: string
 *                           status:
 *                             type: string
 *                             enum: [sent, error]
 *                           sent_at:
 *                             type: string
 *                             format: date-time
 *       404:
 *         description: Comunicado no encontrado
 */
router.get('/:id', communiquesController.getCommuniqueById);

/**
 * @swagger
 * /communiques/stats:
 *   get:
 *     summary: Obtener estadísticas de comunicados
 *     description: Obtiene estadísticas generales de los comunicados
 *     tags: [Comunicados]
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     total_comunicados:
 *                       type: integer
 *                     comunicados_docx:
 *                       type: integer
 *                     comunicados_pdf:
 *                       type: integer
 *                     total_notifications:
 *                       type: integer
 *                     notifications_sent:
 *                       type: integer
 *                     notifications_failed:
 *                       type: integer
 */
router.get('/stats', communiquesController.getCommuniquesStats);

module.exports = router;
