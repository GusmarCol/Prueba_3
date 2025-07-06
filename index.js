// index.js
const express = require('express');
const app = express();
const fs = require('fs');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// ——— Health-check para Render ———
app.get('/', (_req, res) => res.send('OK'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`HTTP server listening on port ${PORT}`));

// ——— Carga/GUARDA estado de chats ———
const STATE_FILE = 'state.json';
let state = {};
try {
  state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
} catch {
  state = {};
}
function saveState() {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

// ——— Carga FAQs y triggers ———
const faqsRaw = JSON.parse(fs.readFileSync('faq.json', 'utf-8'));
const triggers = ["quiero contratar", "precio final", "cómo contrato", "agendar cita"];

// Pre-normaliza las FAQs para matching
function normalize(str = '') {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[¿?¡!.,]/g, '')
    .trim();
}
const faqMap = {};
for (const q in faqsRaw) {
  faqMap[ normalize(q) ] = faqsRaw[q];
}

// ——— Admin ———
const ADMIN = '16784579286@c.us';  // tu número

// ——— Inicializa el cliente ———
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { args: ['--no-sandbox','--disable-setuid-sandbox'] }
});

client.on('qr', qr => {
  const url = encodeURIComponent(qr);
  console.log('QR_LINK:', `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${url}`);
  qrcode.generate(qr, { small: true });
});
client.on('ready', () => console.log('✅ ¡Bot listo y conectado!'));

client.on('message', async msg => {
  const chat = msg.from;
  const text = msg.body.trim();

  // Asegurarnos de tener estado inicial para este chat
  if (!state[chat]) {
    state[chat] = { step: null, status: 'active', name: null, interest: null };
  }

  // 0) Comandos admin para pausar/reanudar
  if (chat === ADMIN) {
    const cmd = text.toLowerCase();
    if (cmd === '!pausar' || cmd === '!detener') {
      state[chat].status = 'paused';
      saveState();
      return msg.reply('⏸️ Respuestas automáticas PAUSADAS. Escribe !activar para reanudar.');
    }
    if (cmd === '!activar' || cmd === '!reanudar') {
      state[chat].status = 'active';
      saveState();
      return msg.reply('🔔 Respuestas automáticas REACTIVADAS. Carlos M. está disponible.');
    }
  }

  // 1) Si este chat está pausado, no respondemos
  if (state[chat].status === 'paused') return;

  // ——— Flujo de onboarding simplificado ———
  switch (state[chat].step) {
    case null:
      // saludo + pide solo el nombre
      await msg.reply('¡Hola! 👋 Soy Carlos M. de GM Migration. ¿Cómo te llamas?');
      state[chat].step = 'askName';
      saveState();
      return;

    case 'askName':
      state[chat].name = text;
      state[chat].step = 'askInterest';
      saveState();
      await msg.reply(`Ok, ${state[chat].name}.`);
      return msg.reply(
        `¿En qué servicio estás interesado? (Asilos, Visas de trabajo, Visas de estudiante u Otros)`
      );

    case 'askInterest':
      state[chat].interest = text;
      state[chat].step = 'ready';
      saveState();
      await msg.reply(
        `Perfecto, ${state[chat].name}. Veo que te interesa "${state[chat].interest}". ¿En qué puedo ayudarte con respecto a eso?`
      );
      return;
  }

  // 2) Reconocimiento de expertos
  const ltext = text.toLowerCase();
  if (ltext.includes('gustavo')) {
    return msg.reply('🧑‍💼 Gustavo Martínez es nuestro experto en Visas de Trabajo.');
  }
  if (ltext.includes('vianny')) {
    return msg.reply('👩‍⚕️ Vianny Jiménez es nuestra experta en Asilos.');
  }

  let responded = false;

  // 3) Responder FAQs con lógica fuzzy
  for (const key in faqMap) {
    const tokens = key.split(' ').filter(w => w.length > 3);
    const norm = normalize(text);
    const hits = tokens.filter(w => norm.includes(w)).length;
    if (hits >= Math.ceil(tokens.length / 2)) {
      await msg.reply(faqMap[key]);
      responded = true;
      break;
    }
  }

  // 4) Triggers de notificación
  if (!responded) {
    for (const trg of triggers) {
      if (normalize(text).includes(normalize(trg))) {
        await client.sendMessage(
          ADMIN,
          `⚡ Prospective (${state[chat].name}): "${msg.body}"`
        );
        responded = true;
        break;
      }
    }
  }

  // 5) Fallback → pasa a experto y pausa el chat
  if (!responded) {
    await msg.reply('¡Genial que estés aquí! 😊 Te voy a agendar con un experto que te dará la mejor información. 🚀');
    state[chat].status = 'paused';
    saveState();
    await client.sendMessage(
      ADMIN,
      `🔕 Chat pausado: ${state[chat].name} (interés: ${state[chat].interest}). Usa !activar para reanudar.`
    );
  }
});

client.initialize();
