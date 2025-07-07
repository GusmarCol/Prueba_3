// index.js
const express = require('express');
const fs = require('fs');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// ——— Health-check para Render ———
const app = express();
app.get('/', (_req, res) => res.send('OK'));

// ——— QR endpoint y almacenamiento de último QR ———
let lastQr = '';
app.get('/qr', (_req, res) => {
  if (!lastQr) return res.status(404).send('Aún no hay QR generado');
  const url = encodeURIComponent(lastQr);
  res.redirect(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${url}`);
});

// ——— Levanta el servidor ———
app.listen(process.env.PORT || 3000, () => console.log('HTTP server listening'));

// ——— Estado por chat ———
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

// ——— Admin ———
const ADMIN = '16784579286@c.us';

// ——— FAQs y triggers ———
const faqsRaw = JSON.parse(fs.readFileSync('faq.json', 'utf-8'));
const triggers = ["quiero contratar","precio final","cómo contrato","agendar cita"];
function normalize(s='') {
  return s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[¿?¡!.,]/g,'').trim();
}
const faqMap = {};
for (const q in faqsRaw) faqMap[ normalize(q) ] = faqsRaw[q];

// ——— Inicializa cliente WhatsApp ———
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { args:['--no-sandbox','--disable-setuid-sandbox'] }
});

// Captura QR, guarda en memoria y muestra enlace público
client.on('qr', qr => {
  lastQr = qr;
  const ascii = qrcode.generate(qr, { small: true });
  console.log('ASCII QR:\n', ascii);
  console.log('  ——— Ahora abre en tu teléfono esta URL para escanear:');
  console.log('      https://bot-whatsapp-render-42jc.onrender.com/qr');
});

client.on('ready', () => console.log('✅ Carlos listo y conectado'));

client.on('message', async msg => {
  const chat = msg.from;
  const text = (msg.body||'').trim();

  // Inicializa o reinicia estado si nuevo chat o fallback
  if (!state[chat]) {
    state[chat] = { step:'welcome', data:{}, last:Date.now(), tries:0 };
  }
  const now = Date.now();
  if (now - state[chat].last > 120000) {
    state[chat].step = 'welcome';
    state[chat].tries = 0;
  }
  state[chat].last = now;
  saveState();

  // Comandos admin para pausar / reanudar
  if (chat === ADMIN) {
    const cmd = text.toLowerCase();
    if (cmd === '!pausar') {
      state[chat].status = 'paused'; saveState();
      return msg.reply('⏸️ Carlos PAUSADO. !activar para reanudar.');
    }
    if (cmd === '!activar') {
      state[chat].status = 'active'; saveState();
      return msg.reply('🔔 Carlos REACTIVADO.');
    }
  }
  if (state[chat].status === 'paused') return;

  const S = state[chat];

  switch (S.step) {
    case 'welcome':
      await msg.reply(
        `👋 Hola, te saluda *Carlos*, asistente virtual de GM Migration. Aquí tienes las opciones con las que puedo ayudarte de forma rápida:\n\n`+
        `1️⃣ Asilos\n`+
        `2️⃣ Visa EB-2 NIW (Trabajo / Profesional)\n`+
        `3️⃣ Visa L-1A (Trabajo / Negocios)\n`+
        `4️⃣ Visa F-1 (Estudiante)\n`+
        `5️⃣ Asesoría con un experto\n`+
        `6️⃣ Ya soy cliente con caso abierto\n`+
        `7️⃣ Es otro asunto\n\n`+
        `📌 *Recuerda escoger solo con el número (1–7).*`
      );
      S.step = 'menu'; saveState();
      return;

    case 'menu':
      if (!/^[1-7]$/.test(text)) {
        S.step = 'welcome'; saveState();
        return msg.reply(
          `🔄 ¡Hola de nuevo! Soy *Carlos*, tu asistente virtual de GM Migration. ¿En qué más puedo ayudarte hoy?\n\n`+
          `1️⃣ Asilos\n`+
          `2️⃣ Visa EB-2 NIW (Trabajo / Profesional)\n`+
          `3️⃣ Visa L-1A (Trabajo / Negocios)\n`+
          `4️⃣ Visa F-1 (Estudiante)\n`+
          `5️⃣ Asesoría con un experto\n`+
          `6️⃣ Ya soy cliente con caso abierto\n`+
          `7️⃣ Es otro asunto\n\n`+
          `📌 *Recuerda escoger solo con el número (1–7).*`
        );
      }
      S.data.choice = text;
      const mapStep = {
        '1':'asilo','2':'eb2','3':'l1a','4':'f1',
        '5':'expert','6':'openCase','7':'other'
      };
      S.step = mapStep[text];
      saveState();
      return client.emit('message', msg);

    // ——— Asilos ———
    case 'asilo':
      await msg.reply(
        `Asilo:\n`+
        `1️⃣ Info general\n`+
        `2️⃣ Beneficios\n`+
        `3️⃣ Pagar defensivo\n`+
        `4️⃣ Pagar afirmativo\n`+
        `5️⃣ Hablar con un experto\n\n`+
        `📌 Solo número.`
      );
      S.step = 'asiloOpt'; saveState();
      return;
    case 'asiloOpt':
      if (!/^[1-5]$/.test(text)) {
        return msg.reply('😅 Uy, parece que no te he entendido. Por favor responde con un número del 1 al 5.');
      }
      if (text === '1') {
        await msg.reply('Guía Asilo: https://guias.gmmigration.com/');
        S.step = 'welcome'; saveState();
        return;
      }
      if (text === '2') {
        await msg.reply(
          `🌟 *Beneficios de Asilo*: \n`+
          `- Protección ante deportación\n`+
          `- Permiso de trabajo rápido\n`+
          `- Cobertura para tu familia\n\n`+
          `1️⃣ Ver nuestros planes\n`+
          `2️⃣ Agendar una cita\n`+
          `3️⃣ Regresar al menú principal\n\n`+
          `📌 Responde con el número (1–3).`
        );
        S.step = 'asiloBen'; saveState();
        return;
      }
      if (text === '3' || text === '4') {
        await msg.reply(
          'Visita https://gmmigration.com, sección *Planes*, elige y paga de forma segura 🔒'
        );
        S.step = 'welcome'; saveState();
        return;
      }
      if (text === '5') {
        S.step = 'bookMode'; saveState();
        return client.emit('message', msg);
      }
      // fallback to menu
      S.step = 'welcome'; saveState();
      return client.emit('message', msg);

    case 'asiloBen':
      if (text === '1') {
        await msg.reply('Planes de Asilo: https://gmmigration.com');
      } else if (text === '2') {
        S.step = 'bookMode'; saveState();
        return client.emit('message', msg);
      } else if (text === '3') {
        S.step = 'welcome'; saveState();
        return client.emit('message', msg);
      }
      // fallback
      S.step = 'welcome'; saveState();
      return client.emit('message', msg);

    // ——— EB-2 NIW ———
    case 'eb2':
      await msg.reply(
        `EB-2 NIW:\n`+
        `1️⃣ ¿Aplicas?\n`+
        `2️⃣ Beneficios\n`+
        `3️⃣ Planes y pago\n`+
        `4️⃣ Hablar con un experto\n\n`+
        `📌 Solo número.`
      );
      S.step = 'eb2Opt'; saveState();
      return;
    case 'eb2Opt':
      if (!/^[1-4]$/.test(text)) {
        return msg.reply('😅 Uy, parece que no te he entendido. Por favor responde con un número del 1 al 4.');
      }
      if (text === '1') {
        await msg.reply('Test de calificación: https://tally.so/r/3qq962');
        S.step = 'welcome'; saveState();
        return;
      }
      if (text === '2') {
        await msg.reply(
          `🌟 *Beneficios EB-2 NIW*: \n`+
          `- Autopetición sin oferta de empleo\n`+
          `- Incluye a tu cónyuge e hijos\n`+
          `- Viaja libremente mientras se procesa\n`+
          `- Vía directa a residencia\n\n`+
          `1️⃣ Ver nuestros planes\n`+
          `2️⃣ Agendar una cita\n`+
          `3️⃣ Regresar al menú principal\n\n`+
          `📌 Responde con el número (1–3).`
        );
        S.step = 'eb2Ben'; saveState();
        return;
      }
      if (text === '3') {
        await msg.reply('Planes EB-2 NIW: https://gmmigration.com');
        S.step = 'welcome'; saveState();
        return;
      }
      if (text === '4') {
        S.step = 'bookMode'; saveState();
        return client.emit('message', msg);
      }
      S.step = 'welcome'; saveState();
      return client.emit('message', msg);

    case 'eb2Ben':
      if (text === '1') {
        await msg.reply('Planes EB-2 NIW: https://gmmigration.com');
      } else if (text === '2') {
        S.step = 'bookMode'; saveState();
        return client.emit('message', msg);
      } else if (text === '3') {
        S.step = 'welcome'; saveState();
        return client.emit('message', msg);
      }
      S.step = 'welcome'; saveState();
      return client.emit('message', msg);

    // ——— L-1A ———
    case 'l1a':
      await msg.reply(
        `Visa L-1A:\n`+
        `1️⃣ Info general\n`+
        `2️⃣ Beneficios\n`+
        `3️⃣ Planes y pago\n`+
        `4️⃣ Hablar con un experto\n\n`+
        `📌 Solo número.`
      );
      S.step = 'l1aOpt'; saveState();
      return;
    case 'l1aOpt':
      if (!/^[1-4]$/.test(text)) {
        return msg.reply('😅 No te entendí. Por favor responde con uno de los números del 1 al 4.');
      }
      if (text === '1') {
        await msg.reply('Guía L-1A: https://guias.gmmigration.com/');
        S.step = 'welcome'; saveState();
        return;
      }
      if (text === '2') {
        await msg.reply(
          `🌟 *Beneficios L-1A*: \n`+
          `- Traslado exprés de ejecutivos\n`+
          `- Cónyuge con permiso de trabajo\n`+
          `- Facilita expansión de negocio\n`+
          `- Camino rápido a Green Card\n\n`+
          `1️⃣ Ver nuestros planes\n`+
          `2️⃣ Agendar una cita\n`+
          `3️⃣ Regresar al menú principal\n\n`+
          `📌 Responde con el número (1–3).`
        );
        S.step = 'l1aBen'; saveState();
        return;
      }
      if (text === '3') {
        await msg.reply('Planes L-1A: https://gmmigration.com');
        S.step = 'welcome'; saveState();
        return;
      }
      if (text === '4') {
        S.step = 'bookMode'; saveState();
        return client.emit('message', msg);
      }
      S.step = 'welcome'; saveState();
      return client.emit('message', msg);

    case 'l1aBen':
      if (text === '1') {
        await msg.reply('Planes L-1A: https://gmmigration.com');
      } else if (text === '2') {
        S.step = 'bookMode'; saveState();
        return client.emit('message', msg);
      } else if (text === '3') {
        S.step = 'welcome'; saveState();
        return client.emit('message', msg);
      }
      S.step = 'welcome'; saveState();
      return client.emit('message', msg);

    // ——— F-1 ———
    case 'f1':
      await msg.reply(
        `Visa F-1:\n`+
        `1️⃣ Info general\n`+
        `2️⃣ Beneficios\n`+
        `3️⃣ Planes y pago\n`+
        `4️⃣ Hablar con un experto\n\n`+
        `📌 Solo número.`
      );
      S.step = 'f1Opt'; saveState();
      return;
    case 'f1Opt':
      if (!/^[1-4]$/.test(text)) {
        return msg.reply('😅 No te entendí. Por favor responde con uno de los números del 1 al 4.');
      }
      if (text === '1') {
        await msg.reply('Guía F-1: https://guias.gmmigration.com/');
        S.step = 'welcome'; saveState();
        return;
      }
      if (text === '2') {
        await msg.reply(
          `🌟 *Beneficios Visa F-1*: \n`+
          `- Estudia en EE.UU.\n`+
          `- OPT y trabajo práctico\n`+
          `- Networking profesional\n`+
          `- Puerta a residencia\n\n`+
          `1️⃣ Ver nuestros planes\n`+
          `2️⃣ Agendar una cita\n`+
          `3️⃣ Regresar al menú principal\n\n`+
          `📌 Responde con el número (1–3).`
        );
        S.step = 'f1Ben'; saveState();
        return;
      }
      if (text === '3') {
        await msg.reply('Planes F-1: https://gmmigration.com');
        S.step = 'welcome'; saveState();
        return;
      }
      if (text === '4') {
        S.step = 'bookMode'; saveState();
        return client.emit('message', msg);
      }
      S.step = 'welcome'; saveState();
      return client.emit('message', msg);

    case 'f1Ben':
      if (text === '1') {
        await msg.reply('Planes F-1: https://gmmigration.com');
      } else if (text === '2') {
        S.step = 'bookMode'; saveState();
        return client.emit('message', msg);
      } else if (text === '3') {
        S.step = 'welcome'; saveState();
        return client.emit('message', msg);
      }
      S.step = 'welcome'; saveState();
      return client.emit('message', msg);

    // ——— Asesoría directa ———
    case 'expert':
      await msg.reply(
        `📆 Tenemos dos formas de atenderte:

` +
        `1️⃣ *Cita virtual* – Puedes estar en cualquier parte del mundo y te atendemos en menos de *12 horas* ⏱️\n` +
        `2️⃣ *Cita presencial* – Puedes elegir una oficina, pero la atención podría tomar hasta *7 días* 📍\n` +
        `3️⃣ Regresar al menú principal\n\n` +
        `✍️ *Responde con el número (1–3) para elegir cómo deseas ser atendido.*`
        `1️⃣ Virtual (Muy rápido: en ≤ 12 h)\n`+
        `2️⃣ Presencial (Agendada en ≤ 1 sem)\n`+
        `3️⃣ Regresar al menú principal\n\n`+
        `📌 Responde con el número (1–3).`
      );
      S.step = 'bookMode'; saveState();
      return;

    // ——— Caso abierto ———
    case 'openCase':
      await msg.reply(
        `¿Con quién quieres agendar?\n`+
        `1️⃣ Gustavo M.\n2️⃣ Vianny J.\n3️⃣ Arelys J.\n`+
        `4️⃣ Steven P.\n5️⃣ Michael J.\n6️⃣ Cindy P.\n7️⃣ Otro\n`+
        `8️⃣ Regresar al menú principal\n\n`+
        `📌 Responde con el número (1–8).`
      );
      S.step = 'openOpt'; saveState();
      return;
    case 'openOpt':
      if (text === '8') {
        S.step = 'welcome'; saveState();
        return client.emit('message', msg);
      }
      if (!/^[1-7]$/.test(text)) {
        return msg.reply('😅 Oops, eso no fue una opción válida. Marca un número del menú.');
      }
      const names = ['Gustavo M.','Vianny J.','Arelys J.','Steven P.','Michael J.','Cindy P.','otro'];
      S.data.expert = names[Number(text)-1];
      await msg.reply(
        `Agendaré con ${S.data.expert}. Por favor envía tu nombre completo, email y teléfono.`
      );
      S.step = 'collectContact'; saveState();
      return;

    // ——— Modo cita ———
    case 'bookMode':
      if (!/^[1-3]$/.test(text)) {
        return msg.reply('😅 Ups, no entendí tu elección. Por favor responde con 1, 2 o 3.');
      }
      if (text === '3') {
        S.step = 'welcome'; saveState();
        return client.emit('message', msg);
      }
      if (text === '1') {
        await msg.reply(
          `🚀 Has elegido *cita virtual* (Muy rápido: en ≤ 12 h).\n`+
          `Envíame tu nombre completo, email y teléfono.`
        );
        S.data.mode = 'virtual';
      } else {
        await msg.reply(
          `🏢 Has elegido *cita presencial* (Agendada en ≤ 1 sem).\n`+
          `Elige oficina:\n`+
          `1️⃣ Alpharetta, GA\n`+
          `2️⃣ San Antonio, TX\n`+
          `3️⃣ Barranquilla, CO\n`+
          `4️⃣ Regresar al menú principal\n\n`+
          `📌 Responde con el número (1–4).`
        );
        S.data.mode = 'presencial';
        S.step = 'selectOffice'; saveState();
        return;
      }
      S.step = 'collectContact'; saveState();
      return;

    case 'selectOffice':
      if (text === '4') {
        S.step = 'welcome'; saveState();
        return client.emit('message', msg);
      }
      if (!/^[1-3]$/.test(text)) {
        return msg.reply('😅 No te entendí. Marca uno de los números del 1 al 4.');
      }
      const offices = ['Alpharetta, GA','San Antonio, TX','Barranquilla, CO'];
      S.data.office = offices[Number(text)-1];
      await msg.reply(
        `Agendaré en ${S.data.office}. Ahora envía tu nombre completo, email y teléfono.`
      );
      S.step = 'collectContact'; saveState();
      return;

    // ——— Recolecta datos y notifica admin ———
    case 'collectContact':
      S.data.contact = text;
      saveState();
      await msg.reply(
        `✅ ¡Listo! En breve recibirás los detalles.\n\n`+
        `😊 Recuerda que te habló *Carlos*, tu asistente virtual, y fue un gusto saludarte hoy.`
      );
      await client.sendMessage(
        ADMIN,
        `📅 *Cita GM Migration*\n`+
        `• Prospecto: ${chat}\n`+
        `• Modalidad: ${S.data.mode}\n`+
        (S.data.office ? `• Oficina: ${S.data.office}\n` : '')+
        `• Datos: ${S.data.contact}`
      );
      delete state[chat]; saveState();
      return;

    default:
      // Fallback general: siempre responder menú inicial
      S.step = 'welcome'; saveState();
      return msg.reply(
        `🔄 ¡Hola de nuevo! Soy *Carlos*, tu asistente virtual de GM Migration. ¿En qué más puedo ayudarte hoy?\n\n`+
        `1️⃣ Asilos\n`+
        `2️⃣ Visa EB-2 NIW (Trabajo / Profesional)\n`+
        `3️⃣ Visa L-1A (Trabajo / Negocios)\n`+
        `4️⃣ Visa F-1 (Estudiante)\n`+
        `5️⃣ Asesoría con un experto\n`+
        `6️⃣ Ya soy cliente con caso abierto\n`+
        `7️⃣ Es otro asunto\n\n`+
        `📌 *Recuerda escoger solo con el número (1–7).*`
      );
  }
});

client.initialize();
