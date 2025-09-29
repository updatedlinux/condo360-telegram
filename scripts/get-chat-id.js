#!/usr/bin/env node

/**
 * Script para obtener el ID del grupo de Telegram
 * 
 * Instrucciones:
 * 1. Agrega tu bot al grupo
 * 2. Ejecuta este script: node scripts/get-chat-id.js
 * 3. Envía cualquier mensaje al grupo
 * 4. El script mostrará el ID del grupo
 */

require('dotenv').config();
const axios = require('axios');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error('❌ Error: TELEGRAM_BOT_TOKEN no está configurado en .env');
  process.exit(1);
}

console.log('🤖 Bot Token configurado');
console.log('📱 Esperando mensajes del grupo...');
console.log('💡 Envía cualquier mensaje al grupo donde está el bot');
console.log('⏹️  Presiona Ctrl+C para salir\n');

let lastUpdateId = 0;

async function getUpdates() {
  try {
    const response = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`, {
      params: {
        offset: lastUpdateId + 1,
        timeout: 30
      }
    });

    const updates = response.data.result;
    
    for (const update of updates) {
      lastUpdateId = update.update_id;
      
      if (update.message) {
        const chat = update.message.chat;
        const user = update.message.from;
        
        console.log('📨 Mensaje recibido:');
        console.log(`   👤 Usuario: ${user.first_name} ${user.last_name || ''} (@${user.username || 'sin username'})`);
        console.log(`   💬 Chat ID: ${chat.id}`);
        console.log(`   📝 Tipo de chat: ${chat.type}`);
        
        if (chat.type === 'group' || chat.type === 'supergroup') {
          console.log(`   🏷️  Nombre del grupo: ${chat.title}`);
          console.log(`   🔗 Username del grupo: @${chat.username || 'sin username'}`);
        }
        
        console.log(`   📄 Contenido: ${update.message.text || '[archivo/imagen/otro]'}`);
        console.log('   ' + '─'.repeat(50));
        
        // Mostrar el ID del grupo destacado
        if (chat.type === 'group' || chat.type === 'supergroup') {
          console.log(`\n🎯 ID DEL GRUPO PARA TU .env:`);
          console.log(`   TELEGRAM_GROUP_CHAT_ID=${chat.id}`);
          console.log(`\n📋 Copia esta línea a tu archivo .env\n`);
        }
      }
    }
  } catch (error) {
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      // Timeout normal, continuar
      return;
    }
    console.error('❌ Error:', error.message);
  }
}

// Ejecutar cada 2 segundos
const interval = setInterval(getUpdates, 2000);

// Manejar Ctrl+C
process.on('SIGINT', () => {
  console.log('\n👋 Saliendo...');
  clearInterval(interval);
  process.exit(0);
});
