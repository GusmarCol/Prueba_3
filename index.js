// index.js
const express = require('express');
const fs = require('fs');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// --- Configuración básica ---
const app = express();
const ADMIN = '16784579286@c.us';
const STATE_FILE = 'state.json';
let state = {};
let lastQr = '';

// --- Health-check para Render ---
app.get('/', (_req, res) => res.send('OK'));

// --- Endpoint QR público ---
app.get('/qr', (_req, res) => {
  if (!lastQr) return res.status(404).send('Aún no hay QR generado');
  const url = encodeURIComponent(lastQr);
  res.redirect(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${url}`);
});

// --- Levanta servidor HTTP ---
app.listen(process.env.PORT || 3000, () => console.log('Servidor HTTP activo'));

// --- Cargar estado ---
try {
  state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
} catch {
  state = {};
}
function saveState() {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

// --- Inicializa cliente WhatsApp ---
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { args:['--no-sandbox','--disable-setuid-sandbox'] }
});

client.on('qr', qr => {
  lastQr = qr;
  console.log('QR disponible en: https://tu-api-deployada.com/qr');
});

client.on('ready', () => console.log('🤖 Carlos está listo para ayudar.'));

client.on('message', async msg => {
  const chat = msg.from;
  const text = (msg.body || '').trim();
  const now = Date.now();

  if (!state[chat]) state[chat] = { step: 'inicio', last: now };
  const S = state[chat];

  // Reinicio si inactivo > 3 min
  if (now - S.last > 180000) {
    await client.sendMessage(chat, '🕒 Parece que estás ocupado. Puedes volver cuando quieras; estoy a punto de cerrar el chat.');
    await client.sendMessage(chat, '🔁 ¡Listo! Puedes escribirme cualquier cosa y volveremos a empezar.');
    S.step = 'inicio';
  }
  S.last = now;
  saveState();

  if (S.step === 'inicio') {
    await msg.reply(
      `👋 ¡Hola! Soy *Carlos*, tu asistente virtual de GM Migration 🇺🇸.

💬 ¿En qué puedo ayudarte hoy?

1️⃣ Asilo
2️⃣ Visa EB-2 NIW
3️⃣ Visa L-1A
4️⃣ Visa F-1 (Estudiante)
5️⃣ Ya soy cliente con caso abierto
6️⃣ Es otro asunto

📌 *Responde solo con el número (1–6)*`
    );
    S.step = 'menu';
    saveState();
    return;
  }

  // FLUJOS DE RESPUESTA
  if (S.step === 'menu') {
    if (!/^[1-6]$/.test(text)) {
      return msg.reply('Por favor responde con un número del 1 al 6.');
    }
    const opciones = ['asilo', 'eb2', 'l1a', 'f1', 'cliente', 'otro'];
    S.step = opciones[parseInt(text)-1];
    saveState();
    return client.emit('message', msg);
  }

  // Respuesta para cualquier tipo de entrada no válida
  if (!/^[0-9]+$/.test(text)) {
    await client.sendMessage(chat, '🤖 Recuerda que debes responder con el *número* de la opción que deseas. Volveremos al menú principal.');
    S.step = 'inicio';
    saveState();
    return client.emit('message', msg);
  }

  // --- OPCIÓN 5: CLIENTES EXISTENTES ---
  if (S.step === 'cliente') {
    await msg.reply(
      `📂 ¿Quién está llevando tu caso?

1️⃣ Gustavo M.
2️⃣ Vianny J.
3️⃣ Arelys J.
4️⃣ Steven P.
5️⃣ Michael J.
6️⃣ Cindy P.
7️⃣ No lo recuerdo
8️⃣ Volver al menú principal`
    );
    S.step = 'cliente_opciones';
    saveState();
    return;
  }

  if (S.step === 'cliente_opciones') {
    const nombres = ['Gustavo M.', 'Vianny J.', 'Arelys J.', 'Steven P.', 'Michael J.', 'Cindy P.', 'Otro agente'];
    const i = parseInt(text);

    if (i === 8) {
      S.step = 'inicio';
      saveState();
      return client.emit('message', msg);
    }

    if (i >= 1 && i <= 7) {
      if (i === 7) {
        await msg.reply(`🧠 No te preocupes, yo lo averiguo por ti.

Solo necesito estos datos para ayudarte:

• Nombre completo
• Correo electrónico
• Mejor número para llamarte 📞

En breve un asesor te contactará y te confirmará quién lleva tu caso. ¡Gracias por tu confianza! ✨`);
      } else {
        await msg.reply(`✅ Gracias. Para agendarte con *${nombres[i-1]}*, por favor regálame esta información:

• Nombre completo
• Correo electrónico
• Mejor número para llamarte 📞

Con esto agendaremos tu consulta lo antes posible. ¡Gracias por confiar en GM Migration! 🇺🇸`);
      }
      // Enviar info al admin manualmente después
      S.step = 'inicio';
      saveState();
      return;
    }

    return msg.reply('Responde con un número válido (1–8).');
  }

  // --- OTROS CASOS ---
  if (S.step === 'otro') {
    await msg.reply(
      `📩 Para cualquier otro asunto, puedes escribirnos a contacto@gmmigration.com

Uno de nuestros asesores te responderá lo antes posible ✉️.`
    );
    S.step = 'inicio';
    saveState();
    return;
  }

  // --- FALLBACK ---
  await msg.reply('📍 Reiniciando conversación...');
  S.step = 'inicio';
  saveState();
  return client.emit('message', msg);
});

client.initialize();
