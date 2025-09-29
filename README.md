# Condo360 WordPress API

Backend en Node.js (Express) que automatiza la creación y eliminación de posts en WordPress desde archivos .docx, con soporte opcional para Telegram Bot.

## 🚀 Características

- **Conversión de .docx a HTML**: Preserva TODOS los estilos del documento Word sin modificaciones
- **Procesamiento de imágenes**: Extrae y sube imágenes embebidas al Media Library de WordPress
- **API REST completa**: Endpoints para upload, eliminación y consulta de historial
- **Integración con Telegram**: Bot opcional para procesar documentos enviados por chat
- **Trazabilidad completa**: Registro de todas las operaciones en base de datos MySQL
- **Documentación Swagger**: API documentada completamente en español
- **Logging avanzado**: Winston con rotación diaria y zona horaria GMT-4
- **Seguridad robusta**: Rate limiting, validaciones y sanitización de inputs
- **Tests completos**: Suite de tests unitarios, de integración y end-to-end

## 📋 Requisitos

- **Node.js**: >= 18.0.0
- **MySQL**: >= 5.7 (misma base de datos de WordPress)
- **WordPress**: >= 5.0 con REST API habilitada
- **Redis**: Opcional, para colas de trabajo en background

## 🛠️ Instalación

### 1. Clonar el repositorio

```bash
git clone <repository-url>
cd condo360-telegram
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

```bash
cp env.example .env
```

Editar el archivo `.env` con tus configuraciones:

```env
# Configuración del servidor
PORT=6000
NODE_ENV=production

# Configuración de WordPress
WP_URL=https://tu-dominio-wordpress.com
WP_USER=usuario_app
WP_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx

# Configuración de base de datos MySQL (misma DB de WordPress)
DB_HOST=localhost
DB_PORT=3306
DB_USER=tu_usuario_db
DB_PASSWORD=tu_password_db
DB_NAME=wordpress_db

# Zona horaria
TIMEZONE=America/Caracas

# Configuración de Telegram (opcional)
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=

# Configuración de Redis (opcional)
REDIS_URL=redis://localhost:6379

# Configuración de optimización de imágenes
ENABLE_IMAGE_OPTIMIZATION=true

# Directorio de logs
LOG_DIR=./logs

# Clave API para autenticación
ADMIN_API_KEY=tu_clave_api_secreta_aqui

# Límites de archivo
MAX_FILE_SIZE_MB=10
```

### 4. Crear tabla de historial

```bash
npm run create-table
```

O usando el script de migración:

```bash
npm run migrate-db up
```

### 5. Ejecutar en desarrollo

```bash
npm run dev
```

### 6. Ejecutar en producción

```bash
npm start
```

## 🔧 Configuración de WordPress

### Crear Application Password

1. Ve a **Usuarios > Perfil** en tu WordPress
2. Desplázate hasta **Application Passwords**
3. Crea una nueva contraseña de aplicación:
   - **Nombre**: `Condo360 API`
   - **Permisos**: `Leer/Escribir`
4. Copia la contraseña generada (formato: `xxxx-xxxx-xxxx-xxxx`)
5. Configura las variables `WP_USER` y `WP_APP_PASSWORD` en tu `.env`

### Permisos requeridos

El usuario de WordPress debe tener permisos para:
- Crear y editar posts
- Subir archivos al Media Library
- Eliminar posts y medios

## 📡 Endpoints de la API

### Documentos

#### `POST /api/v1/docx/upload`
Subir archivo .docx y crear post en WordPress.

**Headers requeridos:**
```
Content-Type: multipart/form-data
```

**Body (multipart/form-data):**
- `file`: archivo .docx (requerido)
- `title`: título del post (opcional)
- `status`: estado del post - 'draft' o 'publish' (opcional, por defecto 'draft')
- `created_by`: identificador del usuario (opcional)

**Ejemplo con curl:**
```bash
curl -X POST "http://localhost:6000/api/v1/docx/upload" \
  -F "file=@./documento.docx" \
  -F "title=Mi Documento Importante" \
  -F "status=draft" \
  -F "created_by=usuario123"
```

### Posts

#### `DELETE /api/v1/posts/:wp_post_id`
Eliminar post de WordPress y opcionalmente sus medios asociados.

**Headers requeridos:**
```
Content-Type: application/json
```

**Parámetros de consulta:**
- `delete_media`: 'true' o 'false' para eliminar medios asociados (opcional, por defecto 'false')

**Ejemplo con curl:**
```bash
curl -X DELETE "http://localhost:6000/api/v1/posts/123?delete_media=true"
```

### Historial

#### `GET /api/v1/posts/history/:history_id`
Obtener registro específico del historial de procesamiento.

#### `GET /api/v1/posts/history`
Buscar registros del historial con filtros.

**Parámetros de consulta:**
- `wp_post_id`: ID del post en WordPress (opcional)
- `created_by`: usuario que creó el post (opcional, búsqueda parcial)
- `status`: estado del procesamiento (opcional)
- `start_date`/`end_date`: rango de fechas (opcional, formato ISO)
- `page`/`limit`: paginación (opcional)

### Telegram (Opcional)

#### `POST /api/v1/telegram/webhook`
Webhook para recibir updates de Telegram.

#### `POST /api/v1/telegram/set-webhook`
Configurar webhook de Telegram.

#### `GET /api/v1/telegram/webhook-info`
Obtener información del webhook configurado.

### Salud del Sistema

#### `GET /api/v1/health`
Verificar estado de todas las dependencias del sistema.

#### `GET /api/v1/health/simple`
Verificación simple de salud para load balancers.

## 🤖 Configuración de Telegram Bot (Opcional)

### 1. Crear Bot de Telegram

1. Habla con [@BotFather](https://t.me/botfather) en Telegram
2. Ejecuta `/newbot`
3. Sigue las instrucciones para crear tu bot
4. Copia el token del bot
5. Configura `TELEGRAM_BOT_TOKEN` en tu `.env`

### 2. Configurar Webhook

```bash
curl -X POST "http://localhost:6000/api/v1/telegram/set-webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook_url": "https://tu-dominio.com/api/v1/telegram/webhook",
    "secret_token": "tu_token_secreto",
    "allowed_updates": ["message", "channel_post"]
  }'
```

### 3. Usar el Bot

- Envía un archivo .docx al bot
- El bot procesará automáticamente el documento
- Creará un post en WordPress como borrador
- Te enviará el enlace del post creado

## 🗄️ Base de Datos

### Tabla: `condo360_posts_history`

```sql
CREATE TABLE condo360_posts_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  wp_post_id BIGINT UNSIGNED NULL,
  title VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL, -- draft, publish, trashed, failed
  created_by VARCHAR(255) NULL, -- telegram user id o email del remitente
  telegram_chat_id VARCHAR(50) NULL,
  telegram_message_id VARCHAR(50) NULL,
  file_name VARCHAR(255) NULL,
  media_ids JSON NULL, -- array JSON de media IDs subidos a WP
  wp_response JSON NULL, -- respuesta cruda de WP al crear post
  error_message TEXT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  timezone VARCHAR(50) NOT NULL DEFAULT 'America/Caracas',
  
  INDEX idx_wp_post_id (wp_post_id),
  INDEX idx_created_by (created_by),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Scripts de Migración

```bash
# Crear tabla
npm run create-table

# Ejecutar migraciones
npm run migrate-db up

# Ver estado de migraciones
npm run migrate-db status

# Revertir migraciones
npm run migrate-db down
```

## 📊 Logging

Los logs se guardan en el directorio `./logs` con rotación diaria:

- `condo360-YYYY-MM-DD.log`: Logs generales
- `condo360-error-YYYY-MM-DD.log`: Solo errores
- Logs en consola en desarrollo

**Formato de logs:**
```
2024-01-15 10:30:00.123 [INFO] Request recibida {"method":"POST","path":"/api/v1/docx/upload","ip":"127.0.0.1","traceId":"550e8400-e29b-41d4-a716-446655440000"}
```

**Zona horaria:** Todos los logs usan GMT-4 (Caracas)

## 🧪 Testing

### Ejecutar Tests

```bash
# Todos los tests
npm test

# Tests en modo watch
npm run test:watch

# Tests con cobertura
npm test -- --coverage
```

### Tipos de Tests

- **Unitarios**: Servicios individuales (`tests/unit/`)
- **Integración**: Controladores con mocks (`tests/integration/`)
- **End-to-End**: API completa (`tests/e2e/`)

### Cobertura Mínima

- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

## 🔓 API Abierta

Esta API está configurada como **completamente abierta** sin autenticación por API Key. Todos los endpoints son accesibles públicamente con CORS habilitado para cualquier origen.

### Configuración de Seguridad

- **CORS**: Habilitado para cualquier origen (`*`)
- **Rate Limiting**: 100 requests por 15 minutos por IP
- **Validaciones**: Sanitización de inputs y validación de archivos
- **Telegram Webhook**: Header `X-Telegram-Secret` para validación de webhooks

### Rate Limiting

- **Upload**: 10 requests por 15 minutos
- **General**: 100 requests por 15 minutos
- **Delete**: 5 requests por hora

### Validaciones

- **Archivos**: Solo .docx, máximo 10MB por defecto
- **Inputs**: Sanitización automática de datos
- **Headers**: Validación de content-type y headers requeridos

## 📚 Documentación

### Swagger UI

La documentación interactiva está disponible en:
- **Desarrollo**: http://localhost:6000/api-docs
- **Producción**: https://tu-dominio.com/api-docs

### Especificación OpenAPI

- **JSON**: `/api-docs/json`
- **YAML**: `/api-docs/yaml`
- **ReDoc**: `/api-docs/redoc`

## 🚀 Despliegue

### Docker (Recomendado)

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run create-table

EXPOSE 6000
CMD ["npm", "start"]
```

### Nginx Proxy Manager

Configurar proxy reverso:

```nginx
location /blog/ {
    proxy_pass http://localhost:6000/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

**URLs resultantes:**
- API: `https://tu-dominio.com/blog/api/v1/`
- Documentación: `https://tu-dominio.com/blog/api-docs`

### Variables de Entorno de Producción

```env
NODE_ENV=production
PORT=6000
LOG_DIR=/var/log/condo360
MAX_FILE_SIZE_MB=10
ENABLE_IMAGE_OPTIMIZATION=true
```

## 🔧 Desarrollo

### Estructura del Proyecto

```
src/
├── config/           # Configuración (DB, logger, etc.)
├── controllers/      # Controladores de endpoints
├── middleware/       # Middlewares (auth, validation, security)
├── routes/           # Definición de rutas
├── services/         # Lógica de negocio
├── swagger/          # Documentación Swagger
├── utils/            # Utilidades
└── app.js            # Aplicación principal

tests/
├── unit/             # Tests unitarios
├── integration/      # Tests de integración
├── e2e/              # Tests end-to-end
├── fixtures/         # Archivos de prueba
├── env.js            # Variables de entorno para testing
└── setup.js          # Setup global de tests

scripts/
├── create-table.js   # Crear tabla de historial
└── migrate-db.js     # Script de migración
```

### Scripts Disponibles

```bash
npm start              # Iniciar en producción
npm run dev            # Iniciar en desarrollo con nodemon
npm test               # Ejecutar tests
npm run test:watch     # Tests en modo watch
npm run migrate-db up   # Ejecutar migraciones
npm run create-table   # Crear tabla de historial
npm run lint           # Linter
npm run lint:fix       # Corregir problemas de linting
```

### Contribuir

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crea un Pull Request

## 🐛 Solución de Problemas

### Error de Conexión a Base de Datos

```bash
❌ No se pudo conectar a la base de datos MySQL
```

**Solución:**
1. Verifica que MySQL esté ejecutándose
2. Confirma las credenciales en `.env`
3. Asegúrate de que la base de datos existe
4. Verifica que el usuario tiene permisos

### Error de Conexión a WordPress

```bash
❌ Error de conexión a WordPress
```

**Solución:**
1. Verifica que `WP_URL` sea correcta
2. Confirma que `WP_USER` y `WP_APP_PASSWORD` sean válidos
3. Asegúrate de que WordPress REST API esté habilitada
4. Verifica que el usuario tiene permisos de escritura

### Error de Procesamiento de Archivo

```bash
❌ Error al convertir archivo .docx
```

**Solución:**
1. Verifica que el archivo sea un .docx válido
2. Confirma que el archivo no esté corrupto
3. Verifica que el tamaño no exceda el límite
4. Revisa los logs para más detalles

### Error de Rate Limiting

```bash
❌ Demasiadas solicitudes
```

**Solución:**
1. Espera el tiempo indicado en `retryAfter`
2. Reduce la frecuencia de requests
3. Considera implementar colas para procesamiento masivo

## 📞 Soporte

Para soporte técnico:

1. **Issues**: Crea un issue en GitHub
2. **Documentación**: Revisa la documentación Swagger
3. **Logs**: Revisa los logs en `./logs/`
4. **Health Check**: Usa `/api/v1/health` para diagnóstico

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🙏 Agradecimientos

- **Mammoth.js**: Conversión de .docx a HTML
- **Express**: Framework web
- **Winston**: Sistema de logging
- **Swagger**: Documentación de API
- **Jest**: Framework de testing

---

**Desarrollado con ❤️ para Condo360**

