# Diagrama de Arquitectura del Sistema de Comunicados Condo360

```mermaid
graph TB
    subgraph "Frontend - WordPress"
        A[Plugin WordPress<br/>condo360-comunicados] --> B[Shortcode<br/>[junta_comunicados]]
        B --> C[Formulario de Subida<br/>HTML/CSS/JS]
        C --> D[Validación Frontend<br/>Permisos + Archivo]
    end
    
    subgraph "Backend - Node.js (Puerto 6000)"
        E[Express Server<br/>server.js] --> F[Rutas API<br/>/communiques/*]
        F --> G[Controlador<br/>communiquesController]
        G --> H[Servicios]
        
        subgraph "Servicios"
            I[WordPressService<br/>REST API Client]
            J[FileProcessingService<br/>DOCX/PDF Processing]
            K[EmailService<br/>SMTP Notifications]
        end
        
        H --> I
        H --> J
        H --> K
    end
    
    subgraph "Base de Datos MySQL"
        L[WordPress DB<br/>wp_users, wp_usermeta]
        M[App DB<br/>condo360_communiques<br/>condo360_notifications<br/>condo360_settings]
    end
    
    subgraph "WordPress"
        N[WP REST API<br/>Posts & Media]
        O[Blog Posts<br/>Publicación Automática]
    end
    
    subgraph "Notificaciones"
        P[SMTP Server<br/>Gmail/Outlook/etc]
        Q[Propietarios<br/>Lista de Emails]
    end
    
    subgraph "Proxy & Infraestructura"
        R[Nginx Proxy Manager<br/>blogapi.bonaventurecclub.com]
        S[Archivos Temporales<br/>temp/uploads/]
    end
    
    %% Flujo principal
    D -->|wp_remote_post<br/>multipart/form-data| E
    G -->|Procesar archivo| J
    J -->|DOCX: mammoth.js<br/>PDF: pdf-parse| S
    G -->|Subir media| I
    I -->|Basic Auth<br/>Application Password| N
    N -->|Crear post| O
    G -->|Enviar notificaciones| K
    K -->|Leer usuarios| L
    K -->|Enviar emails| P
    P -->|Notificar| Q
    G -->|Guardar registro| M
    
    %% Conexiones de datos
    I -.->|Credenciales| L
    K -.->|Configuración| M
    E -.->|Variables ENV| M
    
    %% Proxy
    R -->|proxy_pass<br/>localhost:6000| E
    
    %% Estilos
    classDef frontend fill:#e1f5fe
    classDef backend fill:#f3e5f5
    classDef database fill:#e8f5e8
    classDef wordpress fill:#fff3e0
    classDef notification fill:#fce4ec
    classDef infrastructure fill:#f1f8e9
    
    class A,B,C,D frontend
    class E,F,G,H,I,J,K backend
    class L,M database
    class N,O wordpress
    class P,Q notification
    class R,S infrastructure
```

## Flujo de Datos Detallado

### 1. Subida de Comunicado
1. **Administrador** accede al shortcode `[junta_comunicados]`
2. **Plugin WordPress** valida permisos (administrator/junta)
3. **Formulario** envía archivo via `wp_remote_post` al backend
4. **Backend** recibe archivo en `/communiques/upload`

### 2. Procesamiento de Archivo
1. **Validación** de tipo (.docx/.pdf) y tamaño (≤25MB)
2. **Guardado temporal** en `temp/uploads/`
3. **Procesamiento**:
   - **DOCX**: Conversión a HTML con `mammoth.js`
   - **PDF**: Extracción de texto con `pdf-parse`
4. **Subida a WordPress** como media via REST API

### 3. Publicación en WordPress
1. **Creación de post** con contenido procesado
2. **Estado**: publish (configurable)
3. **Autor**: Usuario que subió el comunicado
4. **URL**: Generada automáticamente

### 4. Notificaciones por Correo
1. **Lectura de usuarios** desde `wp_users` con rol subscriber
2. **Generación de template** HTML con logo (281×94px)
3. **Envío masivo** via SMTP (nodemailer)
4. **Registro de resultados** en `condo360_notifications`

### 5. Almacenamiento de Datos
1. **Registro principal** en `condo360_communiques`
2. **Log de notificaciones** en `condo360_notifications`
3. **Configuración** en `condo360_settings`

## Tecnologías Utilizadas

### Backend
- **Node.js** ≥ 18.0.0
- **Express.js** - Framework web
- **Multer** - Manejo de archivos multipart
- **Mammoth.js** - Conversión DOCX a HTML
- **pdf-parse** - Procesamiento de PDF
- **Axios** - Cliente HTTP para WordPress REST API
- **Nodemailer** - Envío de correos SMTP
- **MySQL2** - Conexión a base de datos
- **Swagger** - Documentación API

### Frontend (WordPress Plugin)
- **PHP** 7.4+
- **WordPress** 5.0+
- **jQuery** - Interactividad
- **CSS3** - Estilos responsive
- **AJAX** - Comunicación con backend

### Infraestructura
- **Nginx Proxy Manager** - Proxy reverso
- **MySQL/MariaDB** - Base de datos
- **SMTP** - Servidor de correo
- **PM2** - Gestión de procesos Node.js
- **Systemd** - Servicio del sistema

## Seguridad

### Autenticación
- **Application Password** de WordPress para REST API
- **Validación de permisos** en plugin (administrator/junta)
- **Nonce verification** en AJAX requests

### Validación
- **Tipo de archivo** (.docx/.pdf únicamente)
- **Tamaño máximo** (25MB)
- **Sanitización** de inputs
- **Rate limiting** en API

### Protección
- **CORS** configurado
- **Helmet.js** para headers de seguridad
- **Validación de archivos** en múltiples capas
- **Limpieza automática** de archivos temporales
