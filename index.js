const express = require('express');
const fs = require('fs');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// ——— Servidor HTTP para Render ———
const app = express();
app.get('/', (_req, res) => res.send('✅ Carlos está activo'));
let lastQr = '';
app.get('/qr', (_req, res) => {
  if (!lastQr) return res.status(404).send('QR no disponible aún');
  const url = encodeURIComponent(lastQr);
  res.redirect(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${url}`);
});
app.listen(process.env.PORT || 3000, () => console.log('🌐 Servidor activo'));

// ——— Estado del chat ———
const STATE_FILE = 'state.json';
let state = {};
try { state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')); } catch { state = {}; }
function saveState() {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

// ——— Datos ———
const ADMIN = '16784579286@c.us';
const WEB = 'https://gmmigration.com';
const GUIA = 'https://guias.gmmigration.com/';
const EMBUDO_EB2 = 'https://tally.so/r/3qq962';
const EMAIL = 'contacto@gmmigration.com';

// ——— Cliente WhatsApp ———
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
});
client.on('qr', qr => {
  lastQr = qr;
  qrcode.generate(qr, { small: true });
  console.log('🟢 Escanea el QR en: https://bot-whatsapp-render-42jc.onrender.com/qr');
});
client.on('ready', () => console.log('✅ Carlos listo y conectado'));

// ——— Función principal ———
client.on('message', async msg => {
  const chat = msg.from;
  const text = (msg.body || '').trim();
  if (!state[chat]) {
    state[chat] = { step: 'welcome', data: {}, last: Date.now(), tries: 0 };
  }
  const now = Date.now();
  if (now - state[chat].last > 300000) {
    state[chat].step = 'welcome';
    state[chat].tries = 0;
  }
  state[chat].last = now;
  saveState();

  const S = state[chat];

  switch (S.step) {
    case 'welcome':
      await msg.reply(
        `👋 ¡Hola! Soy *Carlos*, tu asistente virtual de GM Migration.\n\n` +
        `💡 ¿Cómo puedo ayudarte hoy?\n\n` +
        `1️⃣ Asilos\n` +
        `2️⃣ Visa EB-2 NIW\n` +
        `3️⃣ Visa L-1A\n` +
        `4️⃣ Visa F-1\n` +
        `5️⃣ Ya soy cliente con caso abierto\n` +
        `6️⃣ Es otro asunto\n\n` +
        `✍️ Responde solo con el número (1-6)`
      );
      S.step = 'menu';
      saveState();
      return;

    case 'menu':
      if (!/^[1-6]$/.test(text)) {
        S.step = 'welcome';
        saveState();
        return client.emit('message', msg);
      }
      const opciones = {
        '1': 'asilo',
        '2': 'eb2',
        '3': 'l1a',
        '4': 'f1',
        '5': 'cliente',
        '6': 'otro'
      };
      S.step = opciones[text];
      saveState();
      return client.emit('message', msg);

    case 'asilo':
      await msg.reply(
        `🛡️ *Beneficios del Asilo:*\n` +
        `- Protección ante persecución\n` +
        `- Permiso de trabajo a los 150 días\n` +
        `- Puedes incluir a tu familia\n` +
        `- Permanencia legal durante el proceso\n\n` +
        `👉 Para más info visita: ${GUIA}`
      );
      S.step = 'welcome';
      saveState();
      return;

    case 'eb2':
      await msg.reply(
        `📚 *Visa EB-2 NIW*\n\n` +
        `¿Quieres saber si tu perfil aplica?\n` +
        `Haz clic aquí: ${EMBUDO_EB2}\n\n` +
        `🌟 *Beneficios:* \n` +
        `- No necesitas oferta de empleo\n` +
        `- Self-petition\n` +
        `- Incluye a cónyuge e hijos menores de 21\n\n` +
        `🧠 Más detalles en: ${GUIA}`
      );
      S.step = 'welcome';
      saveState();
      return;

    case 'l1a':
      await msg.reply(
        `💼 *Visa L-1A*\n\n` +
        `🌟 *Beneficios:* \n` +
        `- Traslado interno para ejecutivos o gerentes\n` +
        `- Cónyuge con permiso de trabajo\n` +
        `- Camino rápido a Green Card\n\n` +
        `📖 Más info: ${GUIA}`
      );
      S.step = 'welcome';
      saveState();
      return;

    case 'f1':
      await msg.reply(
        `🎓 *Visa F-1 (Estudiante)*\n\n` +
        `🌟 *Beneficios:* \n` +
        `- Estudiar en una institución acreditada\n` +
        `- Trabajo dentro del campus (20h/semana)\n` +
        `- OPT post-graduación hasta 12-36 meses\n` +
        `- Networking internacional\n\n` +
        `📘 Guía completa: ${GUIA}`
      );
      S.step = 'welcome';
      saveState();
      return;

    case 'cliente':
      await msg.reply(
        `🙋 ¿Quién está llevando tu caso?\n\n` +
        `1️⃣ Gustavo M.\n2️⃣ Vianny J.\n3️⃣ Arelys J.\n4️⃣ Steven P.\n` +
        `5️⃣ Michael J.\n6️⃣ Cindy P.\n7️⃣ No recuerdo\n\n` +
        `📌 Responde con el número (1-7)`
      );
      S.step = 'clienteAtendido';
      saveState();
      return;

    case 'clienteAtendido':
      const asesores = {
        '1': 'Gustavo M.',
        '2': 'Vianny J.',
        '3': 'Arelys J.',
        '4': 'Steven P.',
        '5': 'Michael J.',
        '6': 'Cindy P.',
        '7': 'Sin identificar'
      };
      S.data.experto = asesores[text] || 'Sin identificar';
      await msg.reply(
        `✅ Gracias. Notificaré a *${S.data.experto}* que estás en línea.\n` +
        `Por favor escribe tu nombre, correo y número 📩`
      );
      S.step = 'datosCliente';
      saveState();
      return;

    case 'datosCliente':
      S.data.contacto = text;
      await client.sendMessage(
        ADMIN,
        `📣 *CLIENTE ACTIVO*\n` +
        `👤 Contacto: ${chat}\n` +
        `👥 Atendido por: ${S.data.experto}\n` +
        `📬 Datos: ${S.data.contacto}`
      );
      await msg.reply('🙏 ¡Gracias! Un asesor se pondrá en contacto contigo pronto.');
      delete state[chat];
      saveState();
      return;

    case 'otro':
      await msg.reply(
        `📨 Si tu caso es diferente, por favor escribe tu mensaje detallado aquí o envíalo al correo 📧 *${EMAIL}*\n\n` +
        `✉️ Te responderemos lo antes posible.`
      );
      S.step = 'welcome';
      saveState();
      return;

    default:
      S.step = 'welcome';
      saveState();
      return client.emit('message', msg);
  }
});

client.initialize();
