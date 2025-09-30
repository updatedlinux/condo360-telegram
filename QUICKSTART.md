# 🚀 Instalación Rápida - Sistema de Comunicados Condo360

## ⚡ Inicio Rápido (5 minutos)

### 1. Preparar el Backend
```bash
# Clonar/descargar el proyecto
cd /ruta/del/proyecto

# Instalar dependencias
npm install

# Configurar variables de entorno
cp env.example .env
nano .env  # Editar con tus datos

# Crear base de datos
mysql -u root -p < database/schema.sql

# Iniciar servidor
./start.sh dev
```

### 2. Configurar WordPress
```bash
# Subir plugin a WordPress
# Ruta: /wp-content/plugins/condo360-comunicados/

# Activar plugin en WordPress Admin
# Configurar en: Configuración > Comunicados Condo360
```

### 3. Configurar Proxy (Nginx)
```nginx
# En Nginx Proxy Manager
server_name: blogapi.bonaventurecclub.com
proxy_pass: http://localhost:6000
```

## 🔧 Configuración Esencial

### Variables de Entorno (.env)
```env
# WordPress REST API
WP_REST_USER=admin
WP_REST_APP_PASSWORD=tu_app_password

# Base de datos WordPress
WP_DB_HOST=localhost
WP_DB_USER=wp_user
WP_DB_PASS=wp_password
WP_DB_NAME=wordpress_db

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_USER=tu_email@gmail.com
SMTP_PASS=tu_app_password_email
MAIL_FROM=comunicados@bonaventurecclub.com
```

### Application Password en WordPress
1. Ir a **Usuarios > Perfil**
2. Scroll a **Application Passwords**
3. Crear: "Condo360 Backend"
4. Copiar contraseña a `.env`

## 📝 Uso Básico

### Para Administradores
1. Crear página con shortcode: `[junta_comunicados]`
2. Subir archivo .docx o .pdf (≤25MB)
3. Completar título y descripción
4. Enviar - El sistema hace el resto automáticamente

### Verificar Funcionamiento
```bash
# Salud del sistema
curl https://blogapi.bonaventurecclub.com/health

# Listar comunicados
curl https://blogapi.bonaventurecclub.com/communiques

# Documentación API
https://blogapi.bonaventurecclub.com/api-docs
```

## 🚨 Solución Rápida de Problemas

### Backend no inicia
```bash
# Verificar puerto
netstat -tlnp | grep 6000

# Verificar logs
tail -f logs/error.log

# Reiniciar
./start.sh prod
```

### Plugin no funciona
- Verificar permisos de usuario (debe ser administrator)
- Verificar configuración del plugin
- Revisar consola del navegador para errores JS

### No llegan emails
- Verificar configuración SMTP en `.env`
- Probar conexión SMTP manualmente
- Revisar logs de nodemailer

## 📞 Soporte
- **Logs**: `tail -f logs/combined.log`
- **Estado**: `curl https://blogapi.bonaventurecclub.com/health`
- **Documentación**: Ver `README.md` completo

---
**¡Sistema listo para usar!** 🎉
