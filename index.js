// index.js
const express = require('express');
const fs = require('fs');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// ——— Configuración básica ———
const app = express();
const STATE_FILE = 'state.json';
let state = {};
let lastQr = '';
const ADMIN = '16784579286@c.us';
const BASE_URL = 'https://bot-whatsapp-render-42jc.onrender.com';

// ——— Health-check ———
app.get('/', (_req, res) => res.send('OK'));

// ——— Endpoint QR público ———
app.get('/qr', (_req, res) => {
  if (!lastQr) return res.status(404).send('Aún no hay QR generado');
  const url = encodeURIComponent(lastQr);
  res.redirect(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${url}`);
});

// ——— Inicia servidor HTTP ———
app.listen(process.env.PORT || 3000, () => console.log('HTTP server listening'));

// ——— Carga estado desde disco ———
try {
  state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
} catch {
  state = {};
}
function saveState() {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

// ——— Inicializa cliente de WhatsApp ———
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { args: ['--no-sandbox','--disable-setuid-sandbox'] }
});

// Captura QR, guarda payload y muestra enlace público
client.on('qr', qr => {
  lastQr = qr;
  qrcode.generate(qr, { small: true });
  console.log('Escanea este enlace con tu teléfono:\n', `${BASE_URL}/qr`);
});

client.on('ready', () => console.log('✅ Carlos listo y conectado'));

// ——— Helpers ———
async function sendInicio(msg) {
  await msg.reply(
    `👋 ¡Hola! Soy *Carlos*, tu asistente virtual de GM Migration 🇺🇸.\n\n` +
    `💬 ¿En qué puedo ayudarte hoy?\n\n` +
    `1️⃣ Asilo  \n` +
    `2️⃣ Visa EB-2 NIW  \n` +
    `3️⃣ Visa L-1A  \n` +
    `4️⃣ Visa F-1 (Estudiante)  \n` +
    `5️⃣ Ya soy cliente con caso abierto  \n` +
    `6️⃣ Es otro asunto\n\n` +
    `📌 *Responde solo con el número (1–6)*`
  );
}

async function fallbackInvalid(msg) {
  await msg.reply(
    `⚠️ No entendí tu mensaje.\n` +
    `Por favor, responde con el número de cualquiera de las opciones que ves en pantalla,  \n` +
    `o escribe “hola” para volver al menú principal.`
  );
}

// ——— Flujo de conversación ———
client.on('message', async msg => {
  const chat = msg.from;
  const text = (msg.body || '').trim();
  const now = Date.now();

  // Inicializa estado si es primera vez
  if (!state[chat]) {
    state[chat] = { step: 'inicio', data: {}, last: now, status: 'active' };
  }
  const S = state[chat];

  // Inactividad > 3 min → mensaje y reset
  if (now - S.last > 180000) {
    await msg.reply(
      `⏳ Hola, parece que estás ocupado. Puedes volver cuando quieras; estoy a punto de cerrar el chat.\n` +
      `📍 Para reiniciar, solo dime “hola” o escribe cualquier cosa y volverás al menú principal.`
    );
    S.step = 'inicio';
    S.data = {};
    S.last = now;
    saveState();
    return;
  }

  // Actualiza timestamp
  S.last = now;
  saveState();

  // Comandos admin
  if (chat === ADMIN) {
    const cmd = text.toLowerCase();
    if (cmd === '!pausar') {
      S.status = 'paused'; saveState();
      return msg.reply('⏸️ Carlos PAUSADO. !activar para reanudar.');
    }
    if (cmd === '!activar') {
      S.status = 'active'; saveState();
      return msg.reply('🔔 Carlos REACTIVADO.');
    }
  }
  if (S.status === 'paused') return;

  switch (S.step) {
    case 'inicio':
      await sendInicio(msg);
      S.step = 'menu';
      saveState();
      return;

    case 'menu':
      if (!/^[1-6]$/.test(text)) {
        return fallbackInvalid(msg);
      }
      S.data.choice = text;
      S.step = {
        '1': 'asilo',
        '2': 'eb2',
        '3': 'l1a',
        '4': 'f1',
        '5': 'openCase',
        '6': 'other'
      }[text];
      saveState();
      return client.emit('message', msg);

    // ——— ASILO ———
    case 'asilo':
      await msg.reply(
        `🏛️ *Asilo*\n` +
        `• Protección ante persecución por motivos de raza, religión, nacionalidad, opinión política o pertenencia a un grupo social\n` +
        `• Permiso de trabajo a los 150 días de haber presentado la solicitud\n` +
        `• Derecho a permanecer legalmente en EE.UU. durante el proceso\n` +
        `• Posibilidad de derivar estatus a cónyuge e hijos menores de 21 años\n` +
        `• Acceso a servicios públicos y asistencia mientras tu caso está en trámite\n\n` +
        `🔗 Más información: https://guias.gmmigration.com/\n\n` +
        `¿Ya sabes a cuál es el tipo de asilo que tú aplicas?\n\n` +
        `1️⃣ Sí, asilo defensivo — proceder al pago  \n` +
        `2️⃣ Sí, asilo afirmativo — proceder al pago  \n` +
        `3️⃣ No lo tengo muy claro — prefiero hablar con alguien  \n` +
        `4️⃣ Volver al menú principal`
      );
      S.step = 'asiloOpt';
      saveState();
      return;

    case 'asiloOpt':
      if (!/^[1-4]$/.test(text)) {
        return fallbackInvalid(msg);
      }
      if (text === '1' || text === '2') {
        S.data.action = 'asiloPago';
        await msg.reply('Por favor, envíame tu nombre completo, email y país para proceder al pago.');
        S.step = 'collectContact';
      } else if (text === '3') {
        S.data.action = 'asiloExpert';
        await msg.reply('Por favor, envíame tu nombre completo, email y país. Gracias por la confianza; un agente especializado se pondrá en contacto contigo en breve.');
        S.step = 'collectContact';
      } else {
        S.step = 'inicio';
        saveState();
        return sendInicio(msg);
      }
      saveState();
      return;

    // ——— EB-2 NIW ———
    case 'eb2':
      await msg.reply(
        `💼 *Visa EB-2 NIW*\n` +
        `• No necesitas oferta de empleo ni certificación laboral\n` +
        `• Tú mismo presentas la petición (self-petition)\n` +
        `• Deriva estatus a cónyuge e hijos menores de 21 años\n` +
        `• Libertad de viaje una vez haces el ajuste de estatus\n` +
        `• Camino directo a la Green Card\n\n` +
        `🔗 Más información: https://guias.gmmigration.com/\n\n` +
        `✅ ¿Quieres avanzar con este proceso?\n\n` +
        `1️⃣ Quiero saber si califico a esta visa  \n` +
        `2️⃣ Yo califico, quiero elegir mi plan  \n` +
        `3️⃣ Volver al menú principal`
      );
      S.step = 'eb2Opt';
      saveState();
      return;

    case 'eb2Opt':
      if (!/^[1-3]$/.test(text)) {
        return fallbackInvalid(msg);
      }
      if (text === '1') {
        await msg.reply(
          `Test de calificación: https://tally.so/r/3qq962\n\n` +
          `Durante el mes de julio, tenemos una oferta exclusiva solo para las primeras 50 solicitudes. ¡Aprovecha el descuento antes de que se acaben los cupos!`
        );
        S.step = 'inicio';
        saveState();
      } else if (text === '2') {
        S.data.action = 'eb2Plan';
        await msg.reply('Por favor, envíame tu nombre completo, email y país para elegir tu plan.');
        S.step = 'collectContact';
        saveState();
      } else {
        S.step = 'inicio';
        saveState();
        return sendInicio(msg);
      }
      return;

    // ——— L-1A ———
    case 'l1a':
      await msg.reply(
        `🌐 *Visa L-1A*\n` +
        `• Permite trasladar ejecutivos o gerentes de tu empresa extranjera a EE.UU.\n` +
        `• Visa rápida (meses en vez de años)\n` +
        `• Cónyuge con L-2 puede obtener permiso de trabajo abierto\n` +
        `• Facilita expansión de tu negocio en EE.UU.\n` +
        `• Vía preferente y ágil para solicitar la Green Card a futuro\n\n` +
        `🔗 Más información: https://guias.gmmigration.com/\n\n` +
        `¿Quieres avanzar con este proceso?\n\n` +
        `1️⃣ Sí, ya me decidí — proceder al pago  \n` +
        `2️⃣ Quiero saber si mi perfil aplica a esta visa  \n` +
        `3️⃣ Volver al menú principal`
      );
      S.step = 'l1aOpt';
      saveState();
      return;

    case 'l1aOpt':
      if (!/^[1-3]$/.test(text)) {
        return fallbackInvalid(msg);
      }
      if (text === '1') {
        S.data.action = 'l1aPago';
        await msg.reply('Por favor, envíame tu nombre completo, email y país para proceder al pago.');
        S.step = 'collectContact';
      } else if (text === '2') {
        S.data.action = 'l1aExpert';
        await msg.reply('Por favor, envíame tu nombre completo, email y país. Gracias; un agente especializado en visas L-1A se pondrá en contacto contigo en breve.');
        S.step = 'collectContact';
      } else {
        S.step = 'inicio';
        saveState();
        return sendInicio(msg);
      }
      saveState();
      return;

    // ——— F-1 ———
    case 'f1':
      await msg.reply(
        `🎓 *Visa F-1*\n` +
        `• Estudiar en una institución acreditada\n` +
        `• Trabajo en campus (20h/sem)\n` +
        `• OPT: trabajo a tiempo completo hasta 12 meses tras graduarte\n` +
        `• Networking y oportunidades académicas\n` +
        `• Plataforma de lanzamiento para otros visados\n\n` +
        `🔗 Más información: https://guias.gmmigration.com/\n\n` +
        `¿Quieres avanzar con este proceso?\n\n` +
        `1️⃣ Sí, ya me decidí — proceder al pago  \n` +
        `2️⃣ Quiero saber si mi perfil aplica a esta visa  \n` +
        `3️⃣ Volver al menú principal`
      );
      S.step = 'f1Opt';
      saveState();
      return;

    case 'f1Opt':
      if (!/^[1-3]$/.test(text)) {
        return fallbackInvalid(msg);
      }
      if (text === '1') {
        S.data.action = 'f1Pago';
        await msg.reply('Por favor, envíame tu nombre completo, email y país para proceder al pago.');
        S.step = 'collectContact';
      } else if (text === '2') {
        S.data.action = 'f1Expert';
        await msg.reply('Por favor, envíame tu nombre completo, email y país. Gracias; un agente experto en Visa F-1 se pondrá en contacto contigo pronto.');
        S.step = 'collectContact';
      } else {
        S.step = 'inicio';
        saveState();
        return sendInicio(msg);
      }
      saveState();
      return;

    // ——— YA SOY CLIENTE ———
    case 'openCase':
      await msg.reply(
        `📂 ¿Quién está llevando tu caso?\n\n` +
        `1️⃣ Gustavo M.  \n` +
        `2️⃣ Vianny J.  \n` +
        `3️⃣ Arelys J.  \n` +
        `4️⃣ Steven P.  \n` +
        `5️⃣ Michael J.  \n` +
        `6️⃣ Cindy P.  \n` +
        `7️⃣ No lo recuerdo  \n` +
        `8️⃣ Volver al menú principal`
      );
      S.step = 'openOpt';
      saveState();
      return;

    case 'openOpt':
      if (!/^[1-8]$/.test(text)) {
        return fallbackInvalid(msg);
      }
      if (text === '8') {
        S.step = 'inicio';
        saveState();
        return sendInicio(msg);
      }
      const advisors = ['Gustavo M.','Vianny J.','Arelys J.','Steven P.','Michael J.','Cindy P.','otro'];
      S.data.action = 'openCase';
      S.data.expert = advisors[Number(text) - 1];
      await msg.reply(`Perfecto. Para agendar con *${S.data.expert}*, envíame tu nombre completo, email y teléfono.`);
      S.step = 'collectContact';
      saveState();
      return;

    // ——— OTRO ASUNTO ———
    case 'other':
      await msg.reply(
        `📩 Para cualquier otro asunto, puedes escribirnos a contacto@gmmigration.com\n\n` +
        `Uno de nuestros asesores te responderá lo antes posible ✉️.`
      );
      S.step = 'inicio';
      saveState();
      return;

    // ——— RECOLECTA DATOS Y NOTIFICA ADMIN ———
    case 'collectContact':
      const contact = text;
      // Notifica al admin
      let adminMsg = `📅 Nueva solicitud – ${S.data.action}\n• Prospecto: ${chat}\n• Datos: ${contact}`;
      if (S.data.expert) adminMsg += `\n• Asesor: ${S.data.expert}`;
      await client.sendMessage(ADMIN, adminMsg);

      // Responde al usuario según el flujo
      switch (S.data.action) {
        case 'asiloPago':
          await msg.reply(`✅ ¡Gracias! En breve un asesor te contactará.\n👉 Para proceder al pago, visita: https://gmmigration.com`);
          break;
        case 'asiloExpert':
          await msg.reply(`✅ Gracias por la confianza. Un agente especializado se pondrá en contacto contigo en breve.`);
          break;
        case 'eb2Plan':
          await msg.reply(`✅ ¡Gracias! En breve un asesor te contactará.\n\nDurante el mes de julio, tenemos una oferta exclusiva solo para las primeras 50 solicitudes. ¡Aprovecha el descuento antes de que se acaben los cupos!\n👉 Para elegir tu plan, visita: https://gmmigration.com`);
          break;
        case 'l1aPago':
          await msg.reply(`✅ ¡Gracias! En breve un asesor te contactará.\n\nDurante el mes de julio, tenemos una oferta exclusiva solo para las primeras 50 solicitudes. ¡Aprovecha el descuento antes de que se acaben los cupos!\n👉 Para proceder al pago, visita: https://gmmigration.com`);
          break;
        case 'l1aExpert':
          await msg.reply(`✅ Gracias. Un agente especializado en visas L-1A se pondrá en contacto contigo en breve.`);
          break;
        case 'f1Pago':
          await msg.reply(`✅ ¡Gracias! En breve un asesor te contactará.\n\nDurante el mes de julio, tenemos una oferta exclusiva solo para las primeras 50 solicitudes. ¡Aprovecha el descuento antes de que se acaben los cupos!\n👉 Para proceder al pago, visita: https://gmmigration.com`);
          break;
        case 'f1Expert':
          await msg.reply(`✅ Gracias. Un agente experto en Visa F-1 se pondrá en contacto contigo pronto.`);
          break;
        case 'openCase':
          await msg.reply(`✅ ¡Listo! En breve un asesor te contactará para agendar tu cita.`);
          break;
        default:
          await msg.reply(`✅ ¡Listo! Pronto nos comunicaremos contigo.`);
      }

      // Reset al inicio
      S.step = 'inicio';
      S.data = {};
      saveState();
      return;

    default:
      return fallbackInvalid(msg);
  }
});

// Inicia el cliente de WhatsApp
client.initialize();
