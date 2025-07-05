const express = require('express');
const app = express();
const fs = require('fs');

// Health-check (Render Free)
app.get('/', (req, res) => res.send('OK'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`HTTP server listening on port ${PORT}`));

// Carga/guarda estado de chats
let state = {};
try {
  state = JSON.parse(fs.readFileSync('state.json', 'utf-8'));
} catch (e) {
  state = {};
}
function saveState() {
  fs.writeFileSync('state.json', JSON.stringify(state), 'utf-8');
}

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// FAQs y triggers
const faqs = JSON.parse(fs.readFileSync('faq.json', 'utf-8'));
const triggers = ["quiero contratar", "precio final", "cómo contrato", "agendar cita"];

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

  // 0) Comandos de control (solo desde tu número)
  if (chatId === '17864579286@c.us') {
    if (texto === '!reanudar' || texto === '!activar') {
      state[chatId] = 'active';
      saveState();
      return msg.reply('🔔 Respuestas automáticas reactivadas. Carlos M. está de nuevo disponible.');
    }
  }

  // 1) Modo pausa: si está pausado, ignoramos
  if (state[chatId] === 'paused') return;

  // 2) Reconocimiento de nombres de expertos
  if (texto.includes('gustavo')) {
    return msg.reply('🧑‍💼 Gustavo Martínez es nuestro experto en Visas de Trabajo.');
  }
  if (texto.includes('vianny')) {
    return msg.reply('👩‍⚕️ Vianny Jiménez es nuestra experta en Asilos.');
  }

  let responded = false;

  // 3) Responder FAQs
  for (let pregunta in faqs) {
    if (texto.includes(pregunta.toLowerCase())) {
      await msg.reply(faqs[pregunta]);
      responded = true;
      break;
    }
  }

  // 4) Triggers de notificación
  if (!responded) {
    for (let word of triggers) {
      if (texto.includes(word)) {
        await client.sendMessage(
          '17864579286@c.us',
          `⚡ ¡Prospecto Calificado! Mensaje: "${msg.body}"`
        );
        responded = true;
        break;
      }
    }
  }

  // 5) Fallback: pasa a experto y pausa el bot
  if (!responded) {
    await msg.reply('¡Genial que estés aquí! 😊 Te voy a agendar con un experto que te dará la mejor información. 🚀');
    state[chatId] = 'paused';
    saveState();
  }
});

client.initialize();
