const mysql = require('mysql2/promise');
const nodemailer = require('nodemailer');
const moment = require('moment-timezone');

class EmailQueueService {
  constructor() {
    this.transporter = null;
    this.isProcessing = false;
    this.batchSize = 30; // Enviar 30 correos por lote
    this.batchInterval = 2 * 60 * 1000; // Cada 2 minutos
    this.processingInterval = null;
  }

  /**
   * Inicializar el transporter SMTP
   */
  async initializeTransporter() {
    if (this.transporter) return;

    try {
      this.transporter = nodemailer.createTransport({
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

      console.log('✅ EmailQueueService: Transporter SMTP inicializado');
    } catch (error) {
      console.error('❌ EmailQueueService: Error al inicializar transporter:', error);
      throw error;
    }
  }

  /**
   * Agregar comunicado a la cola de envío
   */
  async queueCommunique(communiqueData) {
    try {
      const connection = await mysql.createConnection({
        host: process.env.WP_DB_HOST || 'localhost',
        port: parseInt(process.env.WP_DB_PORT) || 3306,
        user: process.env.WP_DB_USER,
        password: process.env.WP_DB_PASS,
        database: process.env.WP_DB_NAME || 'wordpress',
        timezone: '+00:00'
      });

      // Insertar en la cola
      const [result] = await connection.execute(
        `INSERT INTO condo360_email_queue 
         (communique_id, title, description, wp_post_url, status, created_at) 
         VALUES (?, ?, ?, ?, 'pending', NOW())`,
        [
          communiqueData.communique_id,
          communiqueData.title,
          communiqueData.description,
          communiqueData.wp_post_url
        ]
      );

      await connection.end();

      console.log(`📧 Comunicado ${communiqueData.communique_id} agregado a la cola de envío`);
      return result.insertId;

    } catch (error) {
      console.error('❌ Error al agregar comunicado a la cola:', error);
      throw error;
    }
  }

  /**
   * Obtener destinatarios de la base de datos
   */
  async getRecipients() {
    try {
      const connection = await mysql.createConnection({
        host: process.env.WP_DB_HOST || 'localhost',
        port: parseInt(process.env.WP_DB_PORT) || 3306,
        user: process.env.WP_DB_USER,
        password: process.env.WP_DB_PASS,
        database: process.env.WP_DB_NAME || 'wordpress',
        timezone: '+00:00'
      });

      const [rows] = await connection.execute(`
        SELECT u.user_email, u.display_name
        FROM wp_users u
        INNER JOIN wp_usermeta um ON u.ID = um.user_id
        WHERE um.meta_key = 'wp_capabilities'
        AND um.meta_value LIKE '%subscriber%'
        AND u.user_email IS NOT NULL
        AND u.user_email != ''
        AND u.user_email REGEXP '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'
        AND u.user_email LIKE '%@%.%'
      `);

      await connection.end();

      // Filtrar dominios conocidos para evitar errores SMTP
      const knownDomains = ['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com', 'live.com', 'bonaventurecclub.com'];
      const filteredRecipients = rows.filter(user => 
        knownDomains.some(domain => user.user_email.toLowerCase().includes(domain))
      );

      console.log(`📧 ${filteredRecipients.length} destinatarios encontrados para envío en lotes`);
      return filteredRecipients;

    } catch (error) {
      console.error('❌ Error al obtener destinatarios:', error);
      return [];
    }
  }

  /**
   * Generar template HTML para el correo
   */
  async generateEmailTemplate(communiqueData) {
    try {
      const { getSetting } = require('../config/database');
      
      // Leer configuraciones de la base de datos
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
              width: ${logoWidth}px;
              height: ${logoHeight}px;
              max-width: ${logoWidth}px;
              max-height: ${logoHeight}px;
              object-fit: contain;
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
   * Procesar lote de correos pendientes
   */
  async processBatch() {
    if (this.isProcessing) {
      console.log('⏳ Ya hay un lote procesándose, saltando...');
      return;
    }

    try {
      this.isProcessing = true;
      console.log('📧 Iniciando procesamiento de lote de correos...');

      // Verificar si está en modo de prueba
      if (process.env.NODE_ENV === 'development' || process.env.SMTP_TEST_MODE === 'true') {
        console.log('🧪 Modo de prueba: Simulando envío de lotes');
        return;
      }

      // Inicializar transporter
      await this.initializeTransporter();

      // Obtener comunicados pendientes
      const connection = await mysql.createConnection({
        host: process.env.WP_DB_HOST || 'localhost',
        port: parseInt(process.env.WP_DB_PORT) || 3306,
        user: process.env.WP_DB_USER,
        password: process.env.WP_DB_PASS,
        database: process.env.WP_DB_NAME || 'wordpress',
        timezone: '+00:00'
      });

      const [pendingCommuniques] = await connection.execute(`
        SELECT * FROM condo360_email_queue 
        WHERE status = 'pending' 
        ORDER BY created_at ASC 
        LIMIT 1
      `);

      if (pendingCommuniques.length === 0) {
        console.log('📧 No hay comunicados pendientes en la cola');
        await connection.end();
        return;
      }

      const communique = pendingCommuniques[0];
      console.log(`📧 Procesando comunicado ${communique.communique_id}: ${communique.title}`);

      // Obtener destinatarios
      const recipients = await this.getRecipients();
      if (recipients.length === 0) {
        console.log('⚠️  No se encontraron destinatarios');
        await connection.execute(
          'UPDATE condo360_email_queue SET status = ?, error_message = ? WHERE id = ?',
          ['failed', 'No se encontraron destinatarios', communique.id]
        );
        await connection.end();
        return;
      }

      console.log(`📧 ${recipients.length} destinatarios encontrados para envío en lotes`);

      // Dividir destinatarios en lotes de máximo 30
      const recipientBatches = [];
      for (let i = 0; i < recipients.length; i += this.batchSize) {
        recipientBatches.push(recipients.slice(i, i + this.batchSize));
      }

      console.log(`📧 ${recipients.length} destinatarios divididos en ${recipientBatches.length} lotes de máximo ${this.batchSize}`);

      // Generar template HTML para este comunicado
      const htmlContent = await this.generateEmailTemplate(communique);

      // Preparar datos del correo
      const mailOptions = {
        from: process.env.MAIL_FROM || 'comunicados@bonaventurecclub.com',
        subject: `Comunicado de la Junta: ${communique.title}`,
        html: htmlContent,
      };

      // Procesar cada lote de destinatarios
      let totalSent = 0;
      let totalFailed = 0;
      const errors = [];

      for (let batchIndex = 0; batchIndex < recipientBatches.length; batchIndex++) {
        const recipientBatch = recipientBatches[batchIndex];
        console.log(`📧 Procesando lote ${batchIndex + 1}/${recipientBatches.length} (${recipientBatch.length} destinatarios)`);

        // Enviar a cada destinatario del lote
        for (const recipient of recipientBatch) {
          try {
            await this.transporter.sendMail({
              ...mailOptions,
              to: recipient.user_email
            });

            // Registrar envío exitoso
            await connection.execute(
              `INSERT INTO condo360_communiques_notifications 
               (communique_id, email, status, sent_at) 
               VALUES (?, ?, 'sent', NOW())`,
              [communique.communique_id, recipient.user_email]
            );

            totalSent++;
            console.log(`✅ Enviado a: ${recipient.user_email}`);

          } catch (error) {
            console.error(`❌ Error al enviar a ${recipient.user_email}:`, error.message);

            // Registrar error
            await connection.execute(
              `INSERT INTO condo360_communiques_notifications 
               (communique_id, email, status, message, sent_at) 
               VALUES (?, ?, 'error', ?, NOW())`,
              [communique.communique_id, recipient.user_email, error.message]
            );

            totalFailed++;
            errors.push(`${recipient.user_email}: ${error.message}`);
          }
        }

        // Esperar 2 minutos entre lotes (excepto en el último)
        if (batchIndex < recipientBatches.length - 1) {
          console.log(`⏳ Esperando 2 minutos antes del siguiente lote...`);
          await new Promise(resolve => setTimeout(resolve, this.batchInterval));
        }
      }

      // Marcar el comunicado como completado
      await connection.execute(
        'UPDATE condo360_email_queue SET status = ?, processed_at = NOW() WHERE id = ?',
        ['completed', communique.id]
      );

      await connection.end();

      console.log(`📊 Resumen del envío:`);
      console.log(`  ✅ Enviados: ${totalSent}`);
      console.log(`  ❌ Fallidos: ${totalFailed}`);
      console.log(`  📧 Total destinatarios: ${recipients.length}`);
      console.log(`  📄 Comunicado procesado: ${communique.title}`);

    } catch (error) {
      console.error('❌ Error en procesamiento de lote:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Iniciar el procesador de cola
   */
  startQueueProcessor() {
    console.log('🚀 Iniciando procesador de cola de correos...');
    console.log(`📧 Configuración: Lotes de ${this.batchSize} correos cada ${this.batchInterval / 1000 / 60} minutos`);

    // Procesar inmediatamente al inicio
    this.processBatch();

    // Luego procesar cada 2 minutos
    this.processingInterval = setInterval(() => {
      this.processBatch();
    }, this.batchInterval);
  }

  /**
   * Detener el procesador de cola
   */
  stopQueueProcessor() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      console.log('⏹️  Procesador de cola detenido');
    }
  }
}

module.exports = EmailQueueService;
