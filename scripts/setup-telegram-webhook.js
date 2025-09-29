#!/usr/bin/env node

/**
 * Script para configurar el webhook de Telegram
 * 
 * Instrucciones:
 * 1. Configura las variables en .env
 * 2. Ejecuta: node scripts/setup-telegram-webhook.js
 */

require('dotenv').config();
const axios = require('axios');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://tu-dominio.com/api/v1/telegram/webhook';

if (!BOT_TOKEN) {
  console.error('❌ Error: TELEGRAM_BOT_TOKEN no está configurado en .env');
  process.exit(1);
}

if (!WEBHOOK_SECRET) {
  console.error('❌ Error: TELEGRAM_WEBHOOK_SECRET no está configurado en .env');
  process.exit(1);
}

async function setupWebhook() {
  try {
    console.log('🤖 Configurando webhook de Telegram...');
    console.log(`📡 URL del webhook: ${WEBHOOK_URL}`);
    console.log(`🔐 Secreto del webhook: ${WEBHOOK_SECRET}\n`);

    const response = await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
      url: WEBHOOK_URL,
      secret_token: WEBHOOK_SECRET,
      allowed_updates: ['message', 'channel_post']
    });

    if (response.data.ok) {
      console.log('✅ Webhook configurado exitosamente!');
      console.log(`📋 Descripción: ${response.data.description}`);
    } else {
      console.error('❌ Error al configurar webhook:', response.data.description);
    }

    // Verificar información del webhook
    console.log('\n🔍 Verificando configuración del webhook...');
    const infoResponse = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
    
    if (infoResponse.data.ok) {
      const info = infoResponse.data.result;
      console.log('📊 Información del webhook:');
      console.log(`   URL: ${info.url}`);
      console.log(`   Certificado personalizado: ${info.has_custom_certificate ? 'Sí' : 'No'}`);
      console.log(`   Updates pendientes: ${info.pending_update_count}`);
      console.log(`   Última fecha de error: ${info.last_error_date || 'Nunca'}`);
      console.log(`   Último mensaje de error: ${info.last_error_message || 'Ninguno'}`);
      console.log(`   Última fecha de sincronización: ${info.last_synchronization_error_date || 'Nunca'}`);
      console.log(`   IPs permitidas: ${info.allowed_updates ? info.allowed_updates.join(', ') : 'Todas'}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('📄 Respuesta:', error.response.data);
    }
  }
}

async function deleteWebhook() {
  try {
    console.log('🗑️ Eliminando webhook de Telegram...');
    
    const response = await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`);
    
    if (response.data.ok) {
      console.log('✅ Webhook eliminado exitosamente!');
    } else {
      console.error('❌ Error al eliminar webhook:', response.data.description);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Verificar argumentos de línea de comandos
const command = process.argv[2];

if (command === 'delete') {
  deleteWebhook();
} else {
  setupWebhook();
}
