// index.js
const express = require('express');
const fs = require('fs/promises');          // Promises API
const { existsSync } = require('fs');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// 1) Health-check
const app = express();
app.get('/', (_req, res) => res.send('OK'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`HTTP server listening on port ${PORT}`));

// 2) Normalize util
function normalize(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[¿?¡!.,]/g, '')
    .trim();
}

// 3) Carga FAQs y crea un mapa pre-normalizado
const rawFaqs = JSON.parse(require('fs').readFileSync('faq.json', 'utf-8'));
const faqMap = {};
for (let q in rawFaqs) {
  faqMap[ normalize(q) ] = rawFaqs[q];
}

// 4) Estado de chats en memoria
let state = {};
const STATE_FILE = 'state.json';
(async () => {
  if (existsSync(STATE_FILE)) {
    state = JSON.parse(await fs.readFile(STATE_FILE, 'utf-8'));
  }
})();

// Función asíncrona para guardar estado
async function saveState() {
  await fs.writeFile(STATE_FILE, JSON.stringify(state), 'utf-8');
}

// 5) Triggers
const triggers = ["quiero contratar","precio final","como contrato","agendar cita"];

// 6) Inicializa cliente
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
  const txt = normalize(msg.body);

  // 0) Comandos de control (tu número)
  if (chatId === '17864579286@c.us' && (txt==='!activar' || txt==='!reanudar')) {
    state[chatId] = 'active';
    await saveState();
    return msg.reply('🔔 Respuestas automáticas reactivadas. Carlos M. ya está listo.');
  }

  // 1) Si está en pausa, no procesamos
  if (state[chatId] === 'paused') return;

  // 2) Reconocimiento de expertos (muy rápido)
  if (txt.includes('gustavo'))  return msg.reply('🧑‍💼 Gustavo Martínez es nuestro experto en Visas de Trabajo.');
  if (txt.includes('vianny'))   return msg.reply('👩‍⚕️ Vianny Jiménez es nuestra experta en Asilos.');

  let responded = false;

  // 3) Fuzzy FAQ (keys pre-normalizadas)
  for (let key in faqMap) {
    const tokens = key.split(' ').filter(w => w.length>3);
    let m=0;
    for (let t of tokens) if (txt.includes(t)) m++;
    if (m >= Math.ceil(tokens.length/2)) {
      await msg.reply(faqMap[key]);
      responded = true;
      break;
    }
  }

  // 4) Triggers
  if (!responded) {
    for (let trg of triggers) {
      if (txt.includes(normalize(trg))) {
        await client.sendMessage('17864579286@c.us', `⚡ ¡Prospecto calificado! Mensaje: "${msg.body}"`);
        responded = true;
        break;
      }
    }
  }

  // 5) Fallback
  if (!responded) {
    await msg.reply('¡Genial que estés aquí! 😊 Te voy a agendar con un experto que te dará la mejor información. 🚀');
    state[chatId] = 'paused';
    saveState();  // no await para no bloquear
  }
});

client.initialize();
