const express = require('express');
const app = express();
const fs = require('fs');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// ————— Health-check para Render —————
app.get('/', (req, res) => res.send('OK'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`HTTP server listening on port ${PORT}`));

// ————— Carga/GUARDA estado de chats —————
let state = {};
try {
  state = JSON.parse(fs.readFileSync('state.json', 'utf-8'));
} catch {
  state = {};
}
function saveState() {
  fs.writeFileSync('state.json', JSON.stringify(state), 'utf-8');
}

// ————— FAQs y triggers —————
const faqs = JSON.parse(fs.readFileSync('faq.json', 'utf-8'));
const triggers = ["quiero contratar", "precio final", "cómo contrato", "agendar cita"];

// ————— Admin (tú) —————
const ADMIN_CHAT = '16784579286@c.us';  // tu número

// ————— Cliente WhatsApp —————
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { args: ['--no-sandbox','--disable-setuid-sandbox'] }
});

client.on('qr', qr => {
  const encoded = encodeURIComponent(qr);
  console.log('QR_LINK:', `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encoded}`);
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => console.log('✅ ¡Bot listo y conectado!'));

client.on('message', async msg => {
  const chatId = msg.from;
  const texto = msg.body.toLowerCase();

  // 0) Control de pausar/reanudar (solo tú)
  if (chatId === ADMIN_CHAT) {
    if (texto === '!activar' || texto === '!reanudar') {
      state[chatId] = 'active';
      saveState();
      return msg.reply('🔔 Respuestas automáticas REACTIVADAS. Carlos M. está disponible.');
    }
    if (texto === '!pausar' || texto === '!detener') {
      state[chatId] = 'paused';
      saveState();
      return msg.reply('⏸️ Respuestas automáticas PAUSADAS. Usa !activar para volver.');
    }
  }

  // 1) Si este chat está pausado, no respondemos
  if (state[chatId] === 'paused') return;

  // 2) Reconocimiento de expertos en el vuelo
  if (texto.includes('gustavo')) {
    return msg.reply('🧑‍💼 Gustavo Martínez es nuestro experto en Visas de Trabajo.');
  }
  if (texto.includes('vianny')) {
    return msg.reply('👩‍⚕️ Vianny Jiménez es nuestra experta en Asilos.');
  }

  let responded = false;

  // 3) Responder FAQ
  for (let pregunta in faqs) {
    if (texto.includes(pregunta.toLowerCase())) {
      await msg.reply(faqs[pregunta]);
      responded = true;
      break;
    }
  }

  // 4) Triggers de notificación
  if (!responded) {
    for (let t of triggers) {
      if (texto.includes(t)) {
        await client.sendMessage(
          ADMIN_CHAT,
          `⚡ ¡Prospecto Calificado! Mensaje de ${chatId}: "${msg.body}"`
        );
        responded = true;
        break;
      }
    }
  }

  // 5) Fallback: agendar con un experto y pausar este chat
  if (!responded) {
    await msg.reply('¡Genial que estés aquí! 😊 Te voy a agendar con un experto que te dará la mejor información. 🚀');
    state[chatId] = 'paused';
    saveState();
  }
});

client.initialize();
