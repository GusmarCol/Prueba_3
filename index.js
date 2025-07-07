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
    await client.sendMessage(chat, '⏳ Parece que ya no sigues conmigo. Reiniciaremos la conversación.');
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

  // --- BENEFICIOS ---
  const beneficios = {
    asilo: `🏛️ *Asilo*
• Protección ante persecución por motivos de raza, religión, nacionalidad, opinión política o pertenencia a un grupo social
• Permiso de trabajo a los 150 días de haber presentado la solicitud
• Derecho a permanecer legalmente en EE.UU. durante el proceso
• Posibilidad de derivar estatus a cónyuge e hijos menores de 21 años
• Acceso a servicios públicos y asistencia mientras tu caso está en trámite`,

    f1: `🎓 *Visa F-1*
• Estudiar en una institución acreditada
• Trabajo en campus (20h/sem)
• OPT: trabajo a tiempo completo hasta 12 meses tras graduarte
• Networking y oportunidades académicas
• Plataforma de lanzamiento para otros visados`,

    eb2: `💼 *Visa EB-2 NIW*
• No necesitas oferta de empleo ni certificación laboral
• Tú mismo presentas la petición (self-petition)
• Deriva estatus a cónyuge e hijos menores de 21 años
• Libertad de viaje una vez haces el ajuste de estatus
• Camino directo a la Green Card`,

    l1a: `🌐 *Visa L-1A*
• Permite trasladar ejecutivos o gerentes de tu empresa extranjera a EE.UU.
• Visa rápida (meses en vez de años)
• Cónyuge con L-2 puede obtener permiso de trabajo abierto
• Facilita expansión de tu negocio en EE.UU.
• Vía preferente y ágil para solicitar la Green Card a futuro`
  };

  // --- RESPUESTAS por TEMA ---
  const tema = S.step;
  if (beneficios[tema]) {
    await msg.reply(`${beneficios[tema]}

🔗 Más información: https://guias.gmmigration.com/

¿Quieres avanzar con este proceso?
1️⃣ Ver planes con descuento
2️⃣ Saber si aplico
3️⃣ Volver al menú principal`);
    S.step = `${tema}_opciones`;
    saveState();
    return;
  }

  if (/_opciones$/.test(S.step)) {
    if (text === '1') {
      await msg.reply(
        `💸 Durante *julio*, tenemos una *oferta exclusiva* solo para las *primeras 50 solicitudes*.
¡Aprovecha el descuento antes de que se acaben los cupos!

👉 Visita https://gmmigration.com y desliza hacia abajo para ver los planes.`
      );
    } else if (text === '2') {
      await msg.reply('🔍 Revisa si calificas aquí: https://tally.so/r/3qq962');
    } else if (text === '3') {
      S.step = 'inicio';
      saveState();
      return client.emit('message', msg);
    } else {
      await msg.reply('❗ Responde con 1, 2 o 3.');
    }
    return;
  }

  // --- CLIENTES EXISTENTES ---
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
8️⃣ Volver al menú`
    );
    S.step = 'cliente_opciones';
    saveState();
    return;
  }

  if (S.step === 'cliente_opciones') {
    if (text === '8') {
      S.step = 'inicio';
      saveState();
      return client.emit('message', msg);
    }
    const nombres = ['Gustavo M.', 'Vianny J.', 'Arelys J.', 'Steven P.', 'Michael J.', 'Cindy P.', 'Otro agente'];
    const i = parseInt(text);
    if (i >= 1 && i <= 7) {
      await msg.reply(`✅ Gracias. Hemos registrado que tu caso lo lleva *${nombres[i-1]}*. Si deseas agendar algo, escríbenos directamente.`);
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
