const nodemailer = require('nodemailer');
require('dotenv').config();

async function testSMTP() {
  console.log('🔍 Probando configuración SMTP...');
  
  try {
    // Crear transporter con configuración SSL
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true' || parseInt(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false',
        ciphers: 'SSLv3',
      },
      requireTLS: true,
      connectionTimeout: 60000,
      greetingTimeout: 30000,
      socketTimeout: 60000,
    });

    console.log('📧 Configuración SMTP:', {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER,
      from: process.env.MAIL_FROM,
      secure: process.env.SMTP_SECURE === 'true' || parseInt(process.env.SMTP_PORT) === 465,
      tlsRejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false'
    });

    // Verificar conexión
    console.log('🔗 Verificando conexión...');
    await transporter.verify();
    console.log('✅ Conexión SMTP verificada');

    // Enviar correo de prueba
    const testEmail = process.env.SMTP_USER; // Enviar a sí mismo
    console.log(`📤 Enviando correo de prueba a: ${testEmail}`);
    
    const result = await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: testEmail,
      subject: 'Prueba de Sistema de Comunicados - Condo360',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2c3e50;">✅ Prueba de Sistema de Comunicados</h2>
          <p>Este es un correo de prueba para verificar que el sistema de notificaciones está funcionando correctamente.</p>
          <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-VE', { timeZone: 'America/Caracas' })}</p>
          <p>Si recibió este correo, el sistema está funcionando correctamente.</p>
          <hr>
          <p style="color: #7f8c8d; font-size: 12px;">
            Sistema de Comunicados Condo360<br>
            Bonaventure Country Club
          </p>
        </div>
      `,
    });

    console.log('✅ Correo enviado exitosamente:', result.messageId);
    console.log('📋 Respuesta del servidor:', result.response);

  } catch (error) {
    console.error('❌ Error en prueba SMTP:', error.message);
    
    if (error.code === 'EAUTH') {
      console.log('💡 Solución: Verificar credenciales SMTP (usuario/contraseña)');
    } else if (error.code === 'ECONNECTION') {
      console.log('💡 Solución: Verificar host y puerto SMTP');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('💡 Solución: Verificar conectividad de red');
    } else {
      console.log('💡 Solución: Revisar configuración SMTP completa');
    }
  }
}

testSMTP();
