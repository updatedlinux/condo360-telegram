# Sistema de Comunicados Condo360

Sistema completo para que la Junta de Condominio pueda subir comunicados (archivos .docx o .pdf) que se publiquen automáticamente en el blog de WordPress y notifiquen por correo a todos los propietarios.

## 📋 Características Principales

- **Backend Node.js + Express** corriendo en puerto 6000
- **Plugin WordPress** con shortcode `[junta_comunicados]`
- **Procesamiento automático** de archivos .docx y .pdf
- **Sistema de cola inteligente** para notificaciones por correo
- **Envío en lotes progresivos** (máximo 30 destinatarios cada 2 minutos)
- **Integración con WordPress REST API** usando Application Password
- **Documentación Swagger UI** disponible en `/api-docs`
- **Interfaz responsive** compatible con tema Astra
- **Todas las respuestas en español** con fechas en GMT-4

## 🏗️ Arquitectura del Sistema

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   WordPress     │    │   Backend       │    │   Base de       │
│   Plugin        │───▶│   Node.js        │───▶│   Datos         │
│   (Frontend)    │    │   (Puerto 6000)  │    │   MySQL         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Shortcode     │    │   WP REST API   │    │   Sistema de     │
│   [junta_       │    │   + Worker      │    │   Cola de        │
│   comunicados]  │    │   de Correos    │    │   Correos        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                       │
                                │                       │
                                ▼                       ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   Envío en      │    │   Notificaciones│
                       │   Lotes (30     │    │   Progresivas   │
                       │   cada 2 min)   │    │   por SMTP      │
                       └─────────────────┘    └─────────────────┘
```

## 📧 Sistema de Cola de Correos

### Características del Sistema de Cola

El sistema implementa un **worker automático** que procesa las notificaciones por correo de manera inteligente:

- **Procesamiento asíncrono**: Los comunicados se publican inmediatamente, las notificaciones se procesan en segundo plano
- **Envío en lotes**: Máximo 30 destinatarios por lote cada 2 minutos
- **Escalabilidad**: Maneja 300+ destinatarios sin sobrecargar el servidor SMTP
- **Confiabilidad**: Sistema de reintentos y manejo de errores
- **Transparencia**: El usuario recibe feedback inmediato sobre el estado

### Flujo del Sistema de Cola

1. **Usuario sube comunicado** → Se publica inmediatamente en WordPress
2. **Comunicado se agrega a la cola** → Estado "pending" en `condo360_email_queue`
3. **Worker procesa automáticamente** → Cada 2 minutos verifica comunicados pendientes
4. **Envío en lotes progresivos** → 30 destinatarios por lote con intervalo de 2 minutos
5. **Registro de resultados** → Cada envío se registra en `condo360_communiques_notifications`
6. **Actualización de estado** → Comunicado marcado como "completed" o "failed"

### Tablas de Base de Datos

```sql
-- Cola de comunicados pendientes
condo360_email_queue:
- id, communique_id, title, description, wp_post_url
- status (pending/processing/completed/failed)
- created_at, processed_at, error_message

-- Registro de notificaciones enviadas
condo360_communiques_notifications:
- id, communique_id, email, status (sent/error)
- message, sent_at, created_at
```

### Configuración del Worker

El worker se inicia automáticamente con el servidor y puede configurarse mediante variables de entorno:

```env
# Configuración del sistema de cola
SMTP_TEST_MODE=false  # true para simular envíos en desarrollo
```

## 🚀 Instalación y Configuración

### 1. Configuración del Backend Node.js

#### Requisitos Previos
- Node.js >= 18.0.0
- MySQL/MariaDB
- Acceso a servidor SMTP
- WordPress con Application Password configurado

#### Instalación del Backend

```bash
# Clonar o descargar el proyecto
cd /ruta/del/proyecto

# Instalar dependencias
npm install

# Copiar archivo de configuración
cp env.example .env

# Editar variables de entorno
nano .env
```

#### Variables de Entorno (.env)

```env
# Puerto del servidor
PORT=6000

# Entorno de ejecución
NODE_ENV=production

# Credenciales WordPress REST API (Application Password)
WP_REST_USER=admin
WP_REST_APP_PASSWORD=tu_app_password_aqui

# Configuración de base de datos WordPress
WP_DB_HOST=localhost
WP_DB_PORT=3306
WP_DB_USER=wp_user
WP_DB_PASS=wp_password
WP_DB_NAME=wordpress_db

# Configuración SMTP para notificaciones
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASS=tu_app_password_email
MAIL_FROM=comunicados@bonaventurecclub.com

# Estado por defecto de los posts en WordPress
POST_STATUS=publish

# URL base de WordPress
WP_BASE_URL=https://bonaventurecclub.com

# Configuración de archivos temporales
TEMP_UPLOAD_DIR=./temp/uploads
MAX_FILE_SIZE=26214400

# Configuración de base de datos propia (opcional)
DB_HOST=localhost
DB_PORT=3306
DB_USER=wp_user
DB_PASS=wp_password
DB_NAME=condo360_communiques
```

#### Crear Base de Datos

```bash
# Ejecutar script SQL para crear tablas (incluye sistema de cola)
mysql -u root -p < database/schema.sql
```

**Tablas creadas:**
- `condo360_communiques` - Registro de comunicados
- `condo360_communiques_notifications` - Registro de notificaciones enviadas
- `condo360_email_queue` - Cola de comunicados pendientes de envío
- `condo360_settings` - Configuraciones del sistema

#### Iniciar el Servidor

```bash
# Modo desarrollo
npm run dev

# Modo producción
npm start
```

### 2. Configuración de Nginx Proxy Manager

Configurar el proxy para el dominio `blogapi.bonaventurecclub.com`:

```nginx
# Configuración en Nginx Proxy Manager
server {
    listen 80;
    server_name blogapi.bonaventurecclub.com;
    
    location / {
        proxy_pass http://localhost:6000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Configuración para archivos grandes
        client_max_body_size 25M;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

### 3. Configuración de WordPress

#### Crear Application Password

1. Ir a **Usuarios > Perfil** en WordPress
2. Scroll hasta **Application Passwords**
3. Crear nueva contraseña con nombre "Condo360 Backend"
4. Copiar la contraseña generada al archivo `.env`

#### Instalar el Plugin

1. Subir la carpeta `wordpress-plugin` a `/wp-content/plugins/`
2. Renombrar a `condo360-comunicados`
3. Activar el plugin en **Plugins > Plugins Instalados**
4. Configurar en **Configuración > Comunicados Condo360**

#### Configuración del Plugin

- **URL del Backend**: `https://blogapi.bonaventurecclub.com`
- **Tamaño máximo**: 25MB
- **Tipos permitidos**: docx,pdf

### 4. Configuración SMTP

#### Para Gmail
1. Habilitar autenticación de 2 factores
2. Generar contraseña de aplicación
3. Usar en variables `SMTP_USER` y `SMTP_PASS`

#### Para otros proveedores
Configurar según las especificaciones del proveedor SMTP.

## 📖 Uso del Sistema

### Para Administradores

1. **Acceder al formulario**: Usar el shortcode `[junta_comunicados]` en cualquier página
2. **Completar datos**:
   - Título del comunicado (obligatorio)
   - Descripción corta (opcional)
   - Archivo .docx o .pdf (obligatorio, máximo 25MB)
3. **Enviar**: El sistema procesará automáticamente el archivo

### Flujo Automático

1. **Validación**: El plugin valida permisos y archivo
2. **Envío**: Archivo se envía al backend via `wp_remote_post`
3. **Procesamiento**: 
   - **DOCX**: Conversión a HTML con imágenes embebidas
   - **PDF**: Subida como media con iframe embebido
4. **Publicación**: Post creado en WordPress via REST API
5. **Cola de Notificaciones**: Comunicado agregado a cola de envío automático
6. **Envío Progresivo**: Worker envía notificaciones en lotes de 30 cada 2 minutos
7. **Registro**: Datos guardados en base de datos propia

## 🔧 API Endpoints

### Backend (Puerto 6000)

#### Subir Comunicado
```http
POST /communiques/upload
Content-Type: multipart/form-data

file: [archivo .docx o .pdf]
title: "Título del comunicado"
description: "Descripción opcional"
wp_user_id: 123
user_display_name: "Nombre del usuario"
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "Comunicado subido y publicado exitosamente. Las notificaciones por correo se enviarán de forma progresiva.",
  "data": {
    "communique_id": 123,
    "wp_post_id": 456,
    "wp_post_url": "https://bonaventurecclub.com/comunicado-123",
    "queued_for_email": true,
    "batch_info": {
      "batch_size": 30,
      "interval_minutes": 2,
      "message": "Los correos se enviarán progresivamente en lotes para asegurar entrega confiable"
    },
    "file_type": "docx",
    "created_at": "2025-01-30T18:30:00-04:00"
  }
}
```

#### Listar Comunicados
```http
GET /communiques?page=1&limit=10&file_type=docx
```

#### Obtener Comunicado por ID
```http
GET /communiques/123
```

#### Estadísticas
```http
GET /communiques/stats
```

#### Salud del Sistema
```http
GET /health
```

#### Documentación Swagger
```
GET /api-docs
```

## 🗄️ Esquema de Base de Datos

### Tabla: `condo360_communiques`
```sql
- id (BIGINT, AUTO_INCREMENT, PRIMARY KEY)
- wp_user_id (BIGINT UNSIGNED)
- title (VARCHAR(255))
- description (TEXT)
- original_filename (VARCHAR(255))
- file_type (ENUM('docx', 'pdf'))
- wp_post_id (BIGINT UNSIGNED)
- wp_post_url (VARCHAR(255))
- wp_media_id (BIGINT UNSIGNED)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Tabla: `condo360_communiques_notifications`
```sql
- id (BIGINT, AUTO_INCREMENT, PRIMARY KEY)
- communique_id (BIGINT, FOREIGN KEY)
- email (VARCHAR(255))
- status (ENUM('sent', 'error'))
- message (TEXT)
- sent_at (TIMESTAMP)
- created_at (TIMESTAMP)
```

### Tabla: `condo360_email_queue`
```sql
- id (BIGINT, AUTO_INCREMENT, PRIMARY KEY)
- communique_id (BIGINT, FOREIGN KEY)
- title (VARCHAR(255))
- description (TEXT)
- wp_post_url (VARCHAR(500))
- status (ENUM('pending', 'processing', 'completed', 'failed'))
- created_at (TIMESTAMP)
- processed_at (TIMESTAMP)
- error_message (TEXT)
```

### Tabla: `condo360_settings`
```sql
- id (INT, AUTO_INCREMENT, PRIMARY KEY)
- setting_key (VARCHAR(100), UNIQUE)
- setting_value (TEXT)
- description (VARCHAR(255))
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

## 🧪 Pruebas del Sistema

### Pruebas con cURL

#### 1. Verificar salud del sistema
```bash
curl -X GET https://blogapi.bonaventurecclub.com/health
```

#### 2. Subir comunicado de prueba
```bash
curl -X POST https://blogapi.bonaventurecclub.com/communiques/upload \
  -F "file=@comunicado_prueba.pdf" \
  -F "title=Comunicado de Prueba" \
  -F "description=Este es un comunicado de prueba" \
  -F "wp_user_id=1" \
  -F "user_display_name=Administrador"
```

#### 3. Listar comunicados
```bash
curl -X GET https://blogapi.bonaventurecclub.com/communiques
```

#### 4. Obtener estadísticas
```bash
curl -X GET https://blogapi.bonaventurecclub.com/communiques/stats
```

### Pruebas del Plugin WordPress

1. **Crear página de prueba** con el shortcode `[junta_comunicados]`
2. **Acceder como administrador**
3. **Subir archivo de prueba** (.docx o .pdf)
4. **Verificar publicación** en el blog
5. **Verificar notificaciones** por correo

## 🔍 Monitoreo y Logs

### Logs del Backend
```bash
# Ver logs en tiempo real
tail -f logs/app.log

# Ver logs de errores
tail -f logs/error.log
```

### Verificar Estado del Sistema
```bash
# Verificar procesos Node.js
ps aux | grep node

# Verificar puerto 6000
netstat -tlnp | grep 6000

# Verificar conexión a base de datos
mysql -u wp_user -p -e "SELECT COUNT(*) FROM condo360_communiques;"
```

## 🛠️ Mantenimiento

### Limpieza de Archivos Temporales
```bash
# Limpiar archivos temporales (ejecutar diariamente)
find ./temp/uploads -type f -mtime +1 -delete
```

### Backup de Base de Datos
```bash
# Backup completo
mysqldump -u root -p --all-databases > backup_$(date +%Y%m%d).sql

# Backup solo tablas del sistema
mysqldump -u root -p condo360_communiques > backup_communiques_$(date +%Y%m%d).sql
```

### Actualización del Sistema
```bash
# Actualizar dependencias
npm update

# Reiniciar servicio
pm2 restart condo360-backend
```

## 🚨 Solución de Problemas

### Problemas Comunes

#### 1. Error de conexión al backend
- Verificar que el servidor esté corriendo en puerto 6000
- Verificar configuración de Nginx Proxy Manager
- Revisar logs del backend

#### 2. Error de Application Password
- Verificar credenciales en `.env`
- Crear nueva Application Password en WordPress
- Verificar permisos del usuario

#### 3. Error de SMTP
- Verificar configuración SMTP en `.env`
- Probar conexión SMTP manualmente
- Revisar logs de nodemailer

#### 4. Error de procesamiento de archivos
- Verificar permisos de carpeta `temp/uploads`
- Verificar espacio en disco
- Revisar logs de procesamiento

#### 5. Plugin no muestra formulario
- Verificar permisos de usuario (debe ser administrador)
- Verificar que el shortcode esté correctamente insertado
- Revisar errores de JavaScript en consola del navegador

### Comandos de Diagnóstico

```bash
# Verificar estado del sistema
curl -X GET https://blogapi.bonaventurecclub.com/health

# Probar conexión a WordPress
curl -X GET https://bonaventurecclub.com/wp-json/wp/v2/posts

# Verificar logs del sistema
journalctl -u condo360-backend -f

# Verificar espacio en disco
df -h

# Verificar memoria
free -h
```

## 📞 Soporte

Para soporte técnico o reportar problemas:

1. **Revisar logs** del sistema
2. **Verificar configuración** de variables de entorno
3. **Probar endpoints** con cURL
4. **Contactar al equipo técnico** con detalles del error

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver archivo `LICENSE` para más detalles.

## 🔄 Changelog

### v1.0.0 (2025-01-XX)
- ✅ Implementación inicial del sistema completo
- ✅ Backend Node.js con Express
- ✅ Plugin WordPress con shortcode
- ✅ Procesamiento de archivos .docx y .pdf
- ✅ Notificaciones por correo
- ✅ Documentación Swagger UI
- ✅ Interfaz responsive compatible con Astra
- ✅ Sistema de logs y monitoreo

---

**Sistema desarrollado para Bonaventure Country Club - Condo360**
