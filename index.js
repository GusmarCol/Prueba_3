// index.js
const express = require('express');
const fs = require('fs');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// ——— Health-check para Render ———
const app = express();
app.get('/', (_req, res) => res.send('✅ Carlos está en línea'));

// ——— QR endpoint y almacenamiento de último QR ———
let lastQr = '';
app.get('/qr', (_req, res) => {
  if (!lastQr) return res.status(404).send('Aún no hay QR generado');
  const url = encodeURIComponent(lastQr);
  res.redirect(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${url}`);
});

app.listen(process.env.PORT || 3000, () => console.log('🌐 Servidor HTTP activo'));

// ——— Admin ———
const ADMIN = '16784579286@c.us';

// ——— Estado por chat ———
const STATE_FILE = 'state.json';
let state = {};
try { state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')); } catch { state = {}; }
function saveState() {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

// ——— Inicializa cliente WhatsApp ———
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
});

client.on('qr', qr => {
  lastQr = qr;
  console.log('📲 Escanea el QR en: https://TU_DOMINIO/qr');
});

client.on('ready', () => console.log('🤖 Carlos conectado y listo'));

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
        '👋 Hola, soy *Carlos*, tu asistente virtual de GM Migration. ¿Sobre qué tema necesitas información? Elige solo el número:
\n1️⃣ Asilos\n2️⃣ Visa EB-2 NIW (Profesional)\n3️⃣ Visa L-1A (Transferencia Ejecutiva)\n4️⃣ Visa F-1 (Estudiante)\n5️⃣ Ya soy cliente con caso abierto\n6️⃣ Otro asunto'
      );
      S.step = 'menu'; saveState();
      return;

    case 'menu':
      if (!/^[1-6]$/.test(text)) {
        S.step = 'welcome'; saveState();
        return client.emit('message', msg);
      }
      const steps = ['asilo', 'eb2', 'l1a', 'f1', 'caso', 'otro'];
      S.step = steps[parseInt(text) - 1];
      saveState();
      return client.emit('message', msg);

    case 'asilo':
      await msg.reply(
        '📘 *Asilo*: Elige una opción:\n1️⃣ Información general\n2️⃣ Beneficios\n3️⃣ Ver planes y pagar\n4️⃣ Volver al inicio'
      );
      S.step = 'asiloOpt'; saveState();
      return;

    case 'asiloOpt':
      if (text === '1') {
        await msg.reply('📚 Más detalles: https://guias.gmmigration.com/');
      } else if (text === '2') {
        await msg.reply(
          '🌟 *Beneficios del Asilo*:\n- Protección ante persecución\n- Permiso de trabajo a los 150 días\n- Puedes incluir a tu familia\n- Permanencia legal durante el proceso'
        );
      } else if (text === '3') {
        await msg.reply('💳 Ve a https://gmmigration.com y desliza para ver los planes con descuento por julio.');
      }
      S.step = 'welcome'; saveState();
      return;

    case 'eb2':
      await msg.reply(
        '📘 *Visa EB-2 NIW*: ¿Qué deseas saber?\n1️⃣ ¿Quieres saber si tu perfil aplica?\n2️⃣ Beneficios\n3️⃣ Ver planes y pagar\n4️⃣ Volver al inicio'
      );
      S.step = 'eb2Opt'; saveState();
      return;

    case 'eb2Opt':
      if (text === '1') {
        await msg.reply('🔍 Evalúa tu perfil aquí: https://tally.so/r/3qq962');
      } else if (text === '2') {
        await msg.reply(
          '🌟 *Beneficios EB-2 NIW*:\n- No requiere oferta laboral\n- Petición propia (self-petition)\n- Cobertura familiar\n- Camino directo a la residencia'
        );
      } else if (text === '3') {
        await msg.reply('💳 Ve a https://gmmigration.com y desliza para ver los planes con descuento por julio.');
      }
      S.step = 'welcome'; saveState();
      return;

    case 'l1a':
      await msg.reply(
        '📘 *Visa L-1A*: ¿Qué deseas saber?\n1️⃣ Información general\n2️⃣ Beneficios\n3️⃣ Ver planes y pagar\n4️⃣ Volver al inicio'
      );
      S.step = 'l1aOpt'; saveState();
      return;

    case 'l1aOpt':
      if (text === '1') {
        await msg.reply('📚 Más info: https://guias.gmmigration.com/');
      } else if (text === '2') {
        await msg.reply(
          '🌟 *Beneficios L-1A*:\n- Permite expansión de negocios\n- Permiso de trabajo para el cónyuge\n- Opción a Green Card\n- Traslado rápido de ejecutivos'
        );
      } else if (text === '3') {
        await msg.reply('💳 Ve a https://gmmigration.com y desliza para ver los planes con descuento por julio.');
      }
      S.step = 'welcome'; saveState();
      return;

    case 'f1':
      await msg.reply(
        '📘 *Visa F-1 (Estudiante)*:\n1️⃣ Información general\n2️⃣ Beneficios\n3️⃣ Ver planes y pagar\n4️⃣ Volver al inicio'
      );
      S.step = 'f1Opt'; saveState();
      return;

    case 'f1Opt':
      if (text === '1') {
        await msg.reply('📚 Más info: https://guias.gmmigration.com/');
      } else if (text === '2') {
        await msg.reply(
          '🌟 *Beneficios F-1*:\n- Estudio en EE.UU.\n- Trabajo en campus (20h/sem)\n- OPT después del grado\n- Conexiones profesionales'
        );
      } else if (text === '3') {
        await msg.reply('💳 Ve a https://gmmigration.com y desliza para ver los planes con descuento por julio.');
      }
      S.step = 'welcome'; saveState();
      return;

    case 'caso':
      await msg.reply(
        '👤 ¿Quién lleva tu caso? Elige el número:\n1️⃣ Gustavo M.\n2️⃣ Vianny J.\n3️⃣ Arelys J.\n4️⃣ Steven P.\n5️⃣ Michael J.\n6️⃣ Cindy P.\n7️⃣ No recuerdo / Otro'
      );
      S.step = 'collectContact'; saveState();
      return;

    case 'otro':
      await msg.reply(
        '📩 Puedes escribirnos con tu caso a: contacto@gmmigration.com\nUno de nuestros asesores te responderá lo antes posible. 🙌'
      );
      S.step = 'welcome'; saveState();
      return;

    case 'collectContact':
      await msg.reply(
        '📌 Por favor, envía tu nombre completo, correo electrónico y teléfono para ayudarte mejor. 📞'
      );
      S.step = 'end'; saveState();
      return;

    case 'end':
      await msg.reply(
        '✅ ¡Gracias! Tu mensaje ha sido enviado. Te contactaremos pronto. 🙌'
      );
      await client.sendMessage(ADMIN,
        `📥 Nuevo mensaje:
De: ${chat}
Datos: ${text}`
      );
      delete state[chat]; saveState();
      return;

    default:
      S.step = 'welcome'; saveState();
      return client.emit('message', msg);
  }
});

client.initialize();
