# Configuración SMTP para Sistema de Comunicados Condo360

## Opciones de Configuración SMTP

### 1. Gmail (Recomendado para pruebas)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASS=tu_app_password_gmail
MAIL_FROM=comunicados@bonaventurecclub.com
SMTP_SECURE=false
SMTP_TLS_REJECT_UNAUTHORIZED=true
```

### 1b. Gmail con SSL (Puerto 465)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=tu_email@gmail.com
SMTP_PASS=tu_app_password_gmail
MAIL_FROM=comunicados@bonaventurecclub.com
SMTP_SECURE=true
SMTP_TLS_REJECT_UNAUTHORIZED=true
```

### 2. Outlook/Hotmail
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=tu_email@outlook.com
SMTP_PASS=tu_password
MAIL_FROM=comunicados@bonaventurecclub.com
```

### 3. Yahoo
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_USER=tu_email@yahoo.com
SMTP_PASS=tu_app_password_yahoo
MAIL_FROM=comunicados@bonaventurecclub.com
```

### 4. Servidor Corporativo (Sin SSL)
```env
SMTP_HOST=mail.bonaventurecclub.com
SMTP_PORT=587
SMTP_USER=comunicados@bonaventurecclub.com
SMTP_PASS=password_del_servidor
MAIL_FROM=comunicados@bonaventurecclub.com
SMTP_SECURE=false
SMTP_TLS_REJECT_UNAUTHORIZED=false
```

### 5. Servidor Corporativo (Con SSL Requerido)
```env
SMTP_HOST=mail.bonaventurecclub.com
SMTP_PORT=465
SMTP_USER=comunicados@bonaventurecclub.com
SMTP_PASS=password_del_servidor
MAIL_FROM=comunicados@bonaventurecclub.com
SMTP_SECURE=true
SMTP_TLS_REJECT_UNAUTHORIZED=true
```

### 6. Servidor Corporativo (STARTTLS)
```env
SMTP_HOST=mail.bonaventurecclub.com
SMTP_PORT=587
SMTP_USER=comunicados@bonaventurecclub.com
SMTP_PASS=password_del_servidor
MAIL_FROM=comunicados@bonaventurecclub.com
SMTP_SECURE=false
SMTP_TLS_REJECT_UNAUTHORIZED=true
```

## Modo de Prueba (Sin enviar correos reales)
```env
SMTP_TEST_MODE=true
```

## Cómo Obtener App Passwords

### Gmail:
1. Ir a Configuración de Google Account
2. Seguridad > Verificación en 2 pasos (habilitar)
3. Contraseñas de aplicaciones
4. Generar nueva contraseña para "Mail"

### Outlook:
1. Ir a Configuración de Microsoft Account
2. Seguridad > Verificación en 2 pasos (habilitar)
3. Contraseñas de aplicaciones
4. Generar nueva contraseña

## Pruebas

### Probar configuración SMTP:
```bash
node test-smtp.js
```

### Verificar destinatarios:
```bash
curl -X GET 'https://blogapi.bonaventurecclub.com/communiques/stats'
```

## Solución de Problemas

### Error 550 - User unknown:
- El correo no existe en el servidor
- Usar correos válidos o configurar servidor SMTP correcto

### Error 554 - Delivery requirements:
- El servidor rechaza el mensaje
- Verificar autenticación SMTP
- Usar App Passwords en lugar de contraseñas normales

### Error EAUTH:
- Credenciales incorrectas
- Verificar usuario y contraseña SMTP

### Error ECONNECTION:
- Host o puerto incorrecto
- Verificar configuración de red
