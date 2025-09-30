const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const path = require('path');
require('dotenv').config();

const communiquesRoutes = require('./routes/communiques');
const { errorHandler } = require('./middleware/errorHandler');
const { initializeDatabase } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 6000;

// Configuración de Swagger
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Condo360 Comunicados API',
      version: '1.0.0',
      description: 'API para gestión de comunicados de Junta de Condominio',
    },
    servers: [
      {
        url: 'https://blogapi.bonaventurecclub.com',
        description: 'Servidor de producción',
      },
      {
        url: `http://localhost:${PORT}`,
        description: 'Servidor de desarrollo',
      },
    ],
  },
  apis: ['./routes/*.js', './controllers/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Middleware de seguridad
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP por ventana
  message: {
    error: 'Demasiadas solicitudes desde esta IP, intente de nuevo más tarde.',
  },
});
app.use(limiter);

// CORS completamente abierto (como se solicitó)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  credentials: false,
  preflightContinue: false,
  optionsSuccessStatus: 200
}));

// Manejar solicitudes OPTIONS (preflight) manualmente
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With');
  res.sendStatus(200);
});

// Middleware para parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir archivos estáticos
app.use('/temp', express.static(path.join(__dirname, 'temp')));

// Rutas
app.use('/communiques', communiquesRoutes);

// Documentación Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Ruta de salud
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    message: 'API de Comunicados Condo360',
    version: '1.0.0',
    documentation: '/api-docs',
    endpoints: {
      upload: 'POST /communiques/upload',
      list: 'GET /communiques',
      detail: 'GET /communiques/:id',
      health: 'GET /health',
    },
  });
});

// Middleware de manejo de errores
app.use(errorHandler);

// Inicializar base de datos y arrancar servidor
async function startServer() {
  try {
    await initializeDatabase();
    console.log('✅ Base de datos inicializada correctamente');
    
    app.listen(PORT, () => {
      console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
      console.log(`📚 Documentación disponible en http://localhost:${PORT}/api-docs`);
      console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Error al inicializar el servidor:', error);
    process.exit(1);
  }
}

// Manejo de señales de terminación
process.on('SIGTERM', () => {
  console.log('🛑 Señal SIGTERM recibida, cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Señal SIGINT recibida, cerrando servidor...');
  process.exit(0);
});

startServer();

module.exports = app;
