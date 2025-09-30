const nodemailer = require('nodemailer');
const moment = require('moment-timezone');
const { getWpUsers, getSetting } = require('../config/database');

/**
 * Servicio para envío de notificaciones por correo
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
  }

  /**
   * Inicializar el transporter de nodemailer
   */
  async initializeTransporter() {
    if (this.initialized) {
      return;
    }

    try {
      // Verificar que las variables de entorno estén disponibles
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        throw new Error('Variables de entorno SMTP no configuradas');
      }

      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true' || parseInt(process.env.SMTP_PORT) === 465, // SSL/TLS
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false', // SSL/TLS seguro
          ciphers: 'SSLv3',
        },
        requireTLS: true, // Forzar TLS
        connectionTimeout: 60000, // 60 segundos
        greetingTimeout: 30000, // 30 segundos
        socketTimeout: 60000, // 60 segundos
      });

      this.initialized = true;
      console.log('✅ Servicio de correo inicializado');
    } catch (error) {
      console.error('❌ Error al inicializar servicio de correo:', error);
      throw error;
    }
  }

  /**
   * Verificar conexión SMTP
   */
  async verifyConnection() {
    try {
      await this.initializeTransporter();
      await this.transporter.verify();
      console.log('✅ Conexión SMTP verificada');
      return true;
    } catch (error) {
      console.error('❌ Error al verificar conexión SMTP:', error);
      return false;
    }
  }

  /**
   * Obtener lista de destinatarios desde WordPress
   */
  async getRecipients() {
    try {
      const roleFilter = await getSetting('notification_role_filter', 'subscriber');
      const users = await getWpUsers(roleFilter);
      
      // Filtrar usuarios con email válido y dominios conocidos
      const validDomains = ['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com', 'bonaventurecclub.com'];
      
      const recipients = users
        .filter(user => {
          if (!user.user_email || !user.user_email.includes('@')) {
            return false;
          }
          
          const domain = user.user_email.split('@')[1];
          return validDomains.includes(domain.toLowerCase());
        })
        .map(user => ({
          email: user.user_email,
          name: user.display_name || user.user_login,
          id: user.ID,
        }));

      console.log(`📧 ${recipients.length} destinatarios válidos encontrados (de ${users.length} total)`);
      return recipients;
    } catch (error) {
      console.error('❌ Error al obtener destinatarios:', error);
      throw error;
    }
  }

  /**
   * Generar template HTML para el correo
   */
  async generateEmailTemplate(communiqueData) {
    try {
      const logoUrl = await getSetting('email_template_logo_url', 'https://bonaventurecclub.com/wp-content/uploads/2025/09/2.png');
      const logoWidth = await getSetting('email_template_logo_width', '281');
      const logoHeight = await getSetting('email_template_logo_height', '94');
      
      const currentDate = moment().tz('America/Caracas').format('dddd, D [de] MMMM [de] YYYY [a las] h:mm A');
      
      return `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Comunicado de la Junta</title>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f8f9fa;
            }
            .email-container {
              background-color: #ffffff;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              overflow: hidden;
            }
            .header {
              background: linear-gradient(135deg, #007cba 0%, #005a87 100%);
              padding: 30px 20px;
              text-align: center;
            }
            .logo {
              max-width: ${logoWidth}px;
              max-height: ${logoHeight}px;
              height: auto;
              filter: brightness(0) invert(1);
              -webkit-filter: brightness(0) invert(1);
            }
            .content {
              padding: 30px;
            }
            .title {
              color: #2c3e50;
              font-size: 24px;
              margin-bottom: 20px;
              text-align: center;
            }
            .description {
              background-color: #f8f9fa;
              padding: 15px;
              border-left: 4px solid #3498db;
              margin: 20px 0;
              font-style: italic;
            }
            .cta-button {
              display: inline-block;
              background-color: #3498db;
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
              text-align: center;
              font-weight: bold;
            }
            .cta-button:hover {
              background-color: #2980b9;
            }
            .footer {
              background-color: #34495e;
              color: white;
              padding: 20px;
              text-align: center;
              font-size: 14px;
            }
            .date-info {
              color: #7f8c8d;
              font-size: 14px;
              margin-top: 20px;
              text-align: center;
            }
            .divider {
              border-top: 1px solid #ecf0f1;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="header">
              <img src="${logoUrl}" alt="Bonaventure Country Club" class="logo">
            </div>
            
            <div class="content">
              <h1 class="title">Comunicado de la Junta</h1>
              
              <p>Estimado(a) propietario(a),</p>
              
              <p>La Junta de Condominio ha publicado un nuevo comunicado que requiere su atención:</p>
              
              <div class="description">
                <strong>${communiqueData.title}</strong><br>
                ${communiqueData.description || ''}
              </div>
              
              <div style="text-align: center;">
                <a href="${communiqueData.wp_post_url}" class="cta-button">
                  Ver Comunicado Completo
                </a>
              </div>
              
              <div class="divider"></div>
              
              <p>Por favor, revise este comunicado en su totalidad para mantenerse informado sobre los asuntos importantes de nuestro condominio.</p>
              
              <div class="date-info">
                <strong>Fecha de publicación:</strong> ${currentDate} (GMT -4)
              </div>
            </div>
            
            <div class="footer">
              <p><strong>Junta de Condominio</strong><br>
              Bonaventure Country Club</p>
              
              <p style="font-size: 12px; margin-top: 15px;">
                Este es un mensaje automático del sistema de comunicados.<br>
                Por favor, no responda a este correo.
              </p>
            </div>
          </div>
        </body>
        </html>
      `;
    } catch (error) {
      console.error('❌ Error al generar template de correo:', error);
      throw error;
    }
  }

  /**
   * Enviar notificación de comunicado
   */
  async sendCommuniqueNotification(communiqueData) {
    try {
      console.log('📧 Iniciando envío de notificaciones...');
      
      // Verificar si está en modo de prueba
      if (process.env.NODE_ENV === 'development' || process.env.SMTP_TEST_MODE === 'true') {
        console.log('🧪 Modo de prueba: Simulando envío de notificaciones');
        return {
          sent: 0,
          failed: 0,
          errors: ['Modo de prueba activado'],
          total: 0,
        };
      }
      
      // Inicializar transporter
      await this.initializeTransporter();
      
      // Verificar conexión SMTP
      const isConnected = await this.verifyConnection();
      if (!isConnected) {
        throw new Error('No se pudo establecer conexión con el servidor SMTP');
      }

      // Obtener destinatarios
      const recipients = await this.getRecipients();
      if (recipients.length === 0) {
        console.log('⚠️  No se encontraron destinatarios para notificar');
        return { sent: 0, failed: 0, errors: [] };
      }

      // Generar template HTML
      const htmlContent = await this.generateEmailTemplate(communiqueData);
      
      // Preparar datos del correo
      const mailOptions = {
        from: process.env.MAIL_FROM || 'comunicados@bonaventurecclub.com',
        subject: `Comunicado de la Junta: ${communiqueData.title}`,
        html: htmlContent,
      };

      let sentCount = 0;
      let failedCount = 0;
      const errors = [];

      // Enviar correos individualmente
      for (const recipient of recipients) {
        try {
          const recipientMailOptions = {
            ...mailOptions,
            to: recipient.email,
          };

          await this.transporter.sendMail(recipientMailOptions);
          sentCount++;
          console.log(`✅ Correo enviado a: ${recipient.email}`);
          
          // Pequeña pausa para evitar spam
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          failedCount++;
          const errorMsg = `Error al enviar a ${recipient.email}: ${error.message}`;
          errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
      }

      console.log(`📊 Resumen de envío: ${sentCount} enviados, ${failedCount} fallidos`);
      
      return {
        sent: sentCount,
        failed: failedCount,
        errors,
        total: recipients.length,
      };

    } catch (error) {
      console.error('❌ Error en envío de notificaciones:', error);
      throw error;
    }
  }

  /**
   * Enviar correo de prueba
   */
  async sendTestEmail(testEmail) {
    try {
      await this.initializeTransporter();
      
      const mailOptions = {
        from: process.env.MAIL_FROM || 'comunicados@bonaventurecclub.com',
        to: testEmail,
        subject: 'Prueba de Sistema de Comunicados - Condo360',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2c3e50;">Prueba de Sistema de Comunicados</h2>
            <p>Este es un correo de prueba para verificar que el sistema de notificaciones está funcionando correctamente.</p>
            <p><strong>Fecha:</strong> ${moment().tz('America/Caracas').format('dddd, D [de] MMMM [de] YYYY [a las] h:mm A')}</p>
            <p>Si recibió este correo, el sistema está funcionando correctamente.</p>
            <hr>
            <p style="color: #7f8c8d; font-size: 12px;">
              Sistema de Comunicados Condo360<br>
              Bonaventure Country Club
            </p>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Correo de prueba enviado a: ${testEmail}`);
      return true;
    } catch (error) {
      console.error('❌ Error al enviar correo de prueba:', error);
      throw error;
    }
  }
}

module.exports = EmailService;
