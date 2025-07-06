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

  // Inicializa estado si nuevo chat
  if (!state[chat]) {
    state[chat] = { step:'welcome', data:{}, last:Date.now(), tries:0 };
    saveState();
  }

  // Si >5min sin responder, reinicia flujo
  const now = Date.now();
  if (now - state[chat].last > 300000) {
    state[chat].step = 'welcome';
    state[chat].tries = 0;
  }
  state[chat].last = now;
  saveState();

  // (Opcional) Comandos admin para pausar / reanudar
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

  // ——— Flujo de menú principal ———
  switch (S.step) {

    case 'welcome':
      await msg.reply(
        `¡Hola! 👋 Bienvenido/a a GM Migration. ¿Cómo puedo ayudarte hoy?\n\n`+
        `1️⃣ Asilo\n`+
        `2️⃣ Visa EB-2 NIW\n`+
        `3️⃣ Visa L-1A\n`+
        `4️⃣ Visa F-1\n`+
        `5️⃣ Asesoría con un experto\n`+
        `6️⃣ Ya tengo un caso abierto\n`+
        `7️⃣ Otro asunto\n\n`+
        `📌 Responde solo con el número (1–7).`
      );
      S.step = 'menu'; saveState();
      return;

    case 'menu':
      if (!/^[1-7]$/.test(text)) {
        return msg.reply('Solo coloca el número de 1 a 7, por favor.');
      }
      S.data.choice = text;
      // redirige
      const mapStep = {
        '1':'asilo', '2':'eb2', '3':'l1a', '4':'f1',
        '5':'expert', '6':'openCase', '7':'other'
      };
      S.step = mapStep[text];
      saveState();
      return client.emit('message', msg);

    // ——— Submenú Asilo ———
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
        return msg.reply('Responde 1–5, porfa.');
      }
      if (text==='1') {
        await msg.reply('Guía Asilo: https://guias.gmmigration.com/');
      }
      if (text==='2') {
        await msg.reply(
          `Beneficios Asilo:\n`+
          `- Protección\n- Permiso de trabajo\n- Cobertura familiar\n\n`+
          `1️⃣ Planes\n2️⃣ Cita\n3️⃣ Otro`
        );
        S.step = 'asiloBen'; saveState();
        return;
      }
      if (text==='3'||text==='4') {
        await msg.reply(
          'Visita https://gmmigration.com, ve a la sección de **Planes**, elige la que más te convenga y haz tu pago de forma segura 🔒'
        );
      }
      if (text==='5') {
        S.step = 'bookMode'; saveState();
        return client.emit('message', msg);
      }
      S.step='welcome'; saveState();
      return;

    case 'asiloBen':
      if (text==='1') {
        await msg.reply(
          'Visita https://gmmigration.com, ve a la sección de **Planes**, elige la que más te convenga y haz tu pago de forma segura 🔒'
        );
      } else if (text==='2') {
        S.step = 'bookMode'; saveState();
        return client.emit('message', msg);
      } else {
        await msg.reply('Cuéntame tu duda o elige otra opción.');
      }
      S.step='welcome'; saveState();
      return;

    // ——— Submenú EB-2 NIW ———
    case 'eb2':
      await msg.reply(
        `EB-2 NIW:\n`+
        `1️⃣ ¿Aplicas?\n`+
        `2️⃣ Beneficios\n`+
        `3️⃣ Planes y pago\n`+
        `4️⃣ Hablar con un experto\n\n`+
        `📌 Solo número.`
      );
      S.step='eb2Opt'; saveState();
      return;
    case 'eb2Opt':
      if (!/^[1-4]$/.test(text)) {
        return msg.reply('Responde 1–4, porfa.');
      }
      if (text==='1') {
        await msg.reply('Test de calificación: https://tally.so/r/3qq962');
      }
      if (text==='2') {
        await msg.reply(
          `Beneficios EB-2 NIW:\n`+
          `- Sin oferta de empleo\n- Autopetición\n- Familia\n- Viajes libres\n\n`+
          `1️⃣ Test 2️⃣ Planes 3️⃣ Cita`
        );
        S.step='eb2Ben'; saveState();
        return;
      }
      if (text==='3') {
        await msg.reply(
          'Visita https://gmmigration.com, ve a la sección de **Planes**, elige la que más te convenga y haz tu pago de forma segura 🔒'
        );
      }
      if (text==='4') {
        S.step='bookMode'; saveState();
        return client.emit('message', msg);
      }
      S.step='welcome'; saveState();
      return;

    case 'eb2Ben':
      if (text==='1') {
        await msg.reply('Test: https://tally.so/r/3qq962');
      } else if (text==='2') {
        await msg.reply(
          'Visita https://gmmigration.com, ve a la sección de **Planes**, elige la que más te convenga y haz tu pago de forma segura 🔒'
        );
      } else {
        S.step='bookMode'; saveState();
        return client.emit('message', msg);
      }
      S.step='welcome'; saveState();
      return;

    // ——— Submenú L-1A ———
    case 'l1a':
      await msg.reply(
        `Visa L-1A:\n`+
        `1️⃣ Info general\n`+
        `2️⃣ Beneficios\n`+
        `3️⃣ Planes y pago\n`+
        `4️⃣ Hablar con un experto\n\n`+
        `📌 Solo número.`
      );
      S.step='l1aOpt'; saveState();
      return;
    case 'l1aOpt':
      if (!/^[1-4]$/.test(text)) {
        return msg.reply('Responde 1–4.');
      }
      if (text==='1') {
        await msg.reply('Guía L-1A: https://guias.gmmigration.com/');
      }
      if (text==='2') {
        await msg.reply(
          `Beneficios L-1A:\n`+
          `- Transferencia rápida\n- Cónyuge con permiso\n- Expansión\n- Puente a Green Card\n\n`+
          `1️⃣ Planes 2️⃣ Cita`
        );
        S.step='l1aBen'; saveState();
        return;
      }
      if (text==='3') {
        await msg.reply(
          'Visita https://gmmigration.com, ve a la sección de **Planes**, elige la que más te convenga y haz tu pago de forma segura 🔒'
        );
      }
      if (text==='4') {
        S.step='bookMode'; saveState();
        return client.emit('message', msg);
      }
      S.step='welcome'; saveState();
      return;
    case 'l1aBen':
      if (text==='1') {
        await msg.reply(
          'Visita https://gmmigration.com, ve a la sección de **Planes**, elige la que más te convenga y haz tu pago de forma segura 🔒'
        );
      } else {
        S.step='bookMode'; saveState();
        return client.emit('message', msg);
      }
      S.step='welcome'; saveState();
      return;

    // ——— Submenú F-1 ———
    case 'f1':
      await msg.reply(
        `Visa F-1:\n`+
        `1️⃣ Info general\n`+
        `2️⃣ Beneficios\n`+
        `3️⃣ Planes y pago\n`+
        `4️⃣ Hablar con un experto\n\n`+
        `📌 Solo número.`
      );
      S.step='f1Opt'; saveState();
      return;
    case 'f1Opt':
      if (!/^[1-4]$/.test(text)) {
        return msg.reply('Responde 1–4.');
      }
      if (text==='1') {
        await msg.reply('Guía F-1: https://guias.gmmigration.com/');
      }
      if (text==='2') {
        await msg.reply(
          `Beneficios F-1:\n`+
          `- Estudiar en EE.UU.\n- Trabajo y OPT\n- Networking\n- Vía a residencia\n\n`+
          `1️⃣ Planes 2️⃣ Cita`
        );
        S.step='f1Ben'; saveState();
        return;
      }
      if (text==='3') {
        await msg.reply(
          'Visita https://gmmigration.com, ve a la sección de **Planes**, elige la que más te convenga y haz tu pago de forma segura 🔒'
        );
      }
      if (text==='4') {
        S.step='bookMode'; saveState();
        return client.emit('message', msg);
      }
      S.step='welcome'; saveState();
      return;
    case 'f1Ben':
      if (text==='1') {
        await msg.reply(
          'Visita https://gmmigration.com, ve a la sección de **Planes**, elige la que más te convenga y haz tu pago de forma segura 🔒'
        );
      } else {
        S.step='bookMode'; saveState();
        return client.emit('message', msg);
      }
      S.step='welcome'; saveState();
      return;

    // ——— Asesoría directa ———
    case 'expert':
      await msg.reply(
        `Asesoría:\n1️⃣ Virtual (12 h)\n2️⃣ Presencial (24 h–1 sem)\n\n`+
        `📌 Solo número.`
      );
      S.step='bookMode'; saveState();
      return;

    // ——— Caso abierto ———
    case 'openCase':
      await msg.reply(
        `¿Con quién quieres agendar?\n`+
        `1️⃣ Gustavo M.\n2️⃣ Vianny J.\n3️⃣ Arelys J.\n`+
        `4️⃣ Steven P.\n5️⃣ Michael J.\n6️⃣ Cindy P.\n7️⃣ Otro`
      );
      S.step='openOpt'; saveState();
      return;
    case 'openOpt':
      if (!/^[1-7]$/.test(text)) {
        return msg.reply('Responde 1–7.');
      }
      const names = ['Gustavo M.','Vianny J.','Arelys J.','Steven P.','Michael J.','Cindy P.','otro'];
      S.data.expert = names[Number(text)-1];
      await msg.reply(
        `Agendaré con ${S.data.expert}. Por favor envía tu nombre completo, email y teléfono.`
      );
      S.step='collectContact'; saveState();
      return;

    // ——— Otro asunto ———
    case 'other':
      await msg.reply(
        'Entiendo. Cuéntame tu consulta o deja tu nombre y ciudad/país, y te responderé personalmente.'
      );
      S.step='welcome'; saveState();
      return;

    // ——— Modo cita ———
    case 'bookMode':
      if (!/^[1-2]$/.test(text)) {
        return msg.reply('Responde 1️⃣ o 2️⃣.');
      }
      if (text==='1') {
        await msg.reply(
          'Cita virtual 🖥️. Te contactaré en las próximas 12 h. '+ 
          'Envíame tu nombre completo, email y teléfono.'
        );
        S.data.mode='virtual';
      } else {
        await msg.reply(
          'Cita presencial 🏢. Te notifico fecha en 24 h–1 sem. Elige oficina:\n'+
          '1️⃣ Alpharetta, GA\n2️⃣ San Antonio, TX\n3️⃣ Barranquilla, CO'
        );
        S.data.mode='presencial';
        S.step='selectOffice'; saveState();
        return;
      }
      S.step='collectContact'; saveState();
      return;

    case 'selectOffice':
      if (!/^[1-3]$/.test(text)) {
        return msg.reply('Responde 1–3.');
      }
      const offices = ['Alpharetta, GA','San Antonio, TX','Barranquilla, CO'];
      S.data.office = offices[Number(text)-1];
      await msg.reply(
        `Agendaré en ${S.data.office}. Te aviso fecha en 24 h–1 sem. `+
        'Ahora tu nombre completo, email y teléfono.'
      );
      S.step='collectContact'; saveState();
      return;

    // ——— Recolecta datos y notifica admin ———
    case 'collectContact':
      S.data.contact = text;
      saveState();
      await msg.reply('¡Gracias! En breve recibirás los detalles.');
      await client.sendMessage(
        ADMIN,
        `📅 Cita:\n• Prospecto: ${chat}\n`+
        `• Modalidad: ${S.data.mode}\n`+
        (S.data.office?`• Oficina: ${S.data.office}\n`:'')+
        `• Datos: ${S.data.contact}`
      );
      delete state[chat]; saveState();
      return;
  }
});

client.initialize();
