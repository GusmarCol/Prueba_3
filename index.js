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
  const qrData = encodeURIComponent(lastQr);
  const qrURL = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${qrData}`;
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>QR Carlos GM Migration</title>
      <style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;}</style>
    </head>
    <body>
      <h2>Escanea este código con tu WhatsApp</h2>
      <img src="${qrURL}" alt="QR Code" />
    </body>
    </html>
  `);
});

// ——— Levanta el servidor ———
app.listen(process.env.PORT || 3000, () => console.log('HTTP server listening'));

// ——— Estado por chat ———
const STATE_FILE = 'state.json';
let state = {};
try { state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')); } catch { state = {}; }
function saveState() { fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8'); }

// ——— Admin ———
const ADMIN = '16784579286@c.us';

// ——— Inicializa cliente WhatsApp ———
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
});

// Captura QR, guarda y muestra enlace
client.on('qr', qr => {
  lastQr = qr;
  qrcode.generate(qr, { small: true }, ascii => console.log('ASCII QR:\n' + ascii));
  console.log('📲 Escanea aquí con tu teléfono:');
  console.log('    https://bot-whatsapp-render-42jc.onrender.com/qr');
});

client.on('ready', () => console.log('✅ Carlos listo y conectado'));

client.on('message', async msg => {
  const chat = msg.from;
  const text = (msg.body || '').trim();

  // Inicializa o reinicia estado
  if (!state[chat]) {
    state[chat] = { step: 'welcome', data: {}, last: Date.now(), status: 'active' };
  }
  const S = state[chat];

  // Timeout >5 min reinicia flujo
  const now = Date.now();
  if (now - S.last > 300000) S.step = 'welcome';
  S.last = now;
  saveState();

  // Comandos admin pausar/activar
  if (chat === ADMIN) {
    const cmd = text.toLowerCase();
    if (cmd === '!pausar') { S.status = 'paused'; saveState(); return msg.reply('⏸️ Carlos PAUSADO. !activar para reanudar.'); }
    if (cmd === '!activar') { S.status = 'active'; saveState(); return msg.reply('🔔 Carlos REACTIVADO.'); }
  }
  if (S.status === 'paused') return;

  const menuText =
    `🔄 ¡Hola de nuevo! Soy *Carlos*, tu asistente virtual de GM Migration. ¿En qué más puedo ayudarte hoy?\n\n` +
    `1️⃣ Asilos\n2️⃣ Visa EB-2 NIW (Trabajo / Profesional)\n3️⃣ Visa L-1A (Trabajo / Negocios)\n4️⃣ Visa F-1 (Estudiante)\n` +
    `5️⃣ Asesoría con un experto\n6️⃣ Ya soy cliente con caso abierto\n7️⃣ Es otro asunto\n\n` +
    `📌 *Recuerda escoger solo con el número (1–7).*`;

  switch (S.step) {
    case 'welcome':
      await msg.reply(
        `👋 Hola, te saluda *Carlos*, asistente virtual de GM Migration. Aquí tienes las opciones para ayudarte de forma rápida:\n\n` +
        menuText.split('\n').slice(2).join('\n')
      );
      S.step = 'menu'; saveState();
      return;

    case 'menu':
      if (!/^[1-7]$/.test(text)) {
        S.step = 'welcome'; saveState();
        return msg.reply(menuText);
      }
      S.data.choice = text;
      S.step = ['asilo', 'eb2', 'l1a', 'f1', 'expert', 'openCase', 'other'][Number(text) - 1];
      saveState();
      return client.emit('message', msg);

    case 'asilo': case 'eb2': case 'l1a': case 'f1': {
      const titles = { asilo: 'Asilo', eb2: 'EB-2 NIW', l1a: 'Visa L-1A', f1: 'Visa F-1' };
      await msg.reply(
        `${titles[S.step]}:\n1️⃣ Info general\n2️⃣ Beneficios\n3️⃣ Planes y pago\n` +
        `4️⃣ Hablar con un experto\n5️⃣ Regresar al menú principal\n\n📌 Solo número.`
      );
      S.step = `${S.step}Opt`; saveState();
      return;
    }

    case 'asiloOpt': case 'eb2Opt': case 'l1aOpt': case 'f1Opt': {
      if (!/^[1-5]$/.test(text)) {
        S.step = 'welcome'; saveState();
        return msg.reply(menuText);
      }
      if (text === '5') {
        S.step = 'welcome'; saveState();
        return msg.reply(menuText);
      }
      const infoLinks = {
        asiloOpt: 'Guía Asilo: https://guias.gmmigration.com/',
        eb2Opt: 'Test de calificación: https://tally.so/r/3qq962',
        l1aOpt: 'Guía L-1A: https://guias.gmmigration.com/',
        f1Opt: 'Guía F-1: https://guias.gmmigration.com/'
      };
      if (text === '1') {
        await msg.reply(infoLinks[S.step]);
        S.step = 'welcome'; saveState();
        return;
      }
      if (text === '3') {
        await msg.reply('🔗 Planes: https://gmmigration.com');
        // Luego de mostrar planes, volver al menú
        S.step = 'welcome'; saveState();
        return msg.reply(menuText);
      }
      if (text === '4') {
        S.step = 'bookMode'; saveState();
        return client.emit('message', msg);
      }
      // text==='2'
      S.step = S.step.replace('Opt', 'Ben'); saveState();
      return client.emit('message', msg);
    }

    case 'asiloBen':
      await msg.reply(`🏛️ Asilo – Beneficios:\n• Protección ante persecución…\n• Cobertura a cónyuge e hijos menores de 21 años\n\n1️⃣ Ver planes\n2️⃣ Agendar cita\n3️⃣ Regresar al menú principal`);
      return;

    case 'eb2Ben':
      await msg.reply(`💼 EB-2 NIW – Beneficios:\n• Self-petition\n• Cobertura familiar\n• Libertad de viaje\n\n1️⃣ Ver planes\n2️⃣ Agendar cita\n3️⃣ Regresar al menú principal`);
      return;

    case 'l1aBen':
      await msg.reply(`🌐 L-1A – Beneficios:\n• Traslado ejecutivo\n• Permiso de trabajo a cónyuge\n\n1️⃣ Ver planes\n2️⃣ Agendar cita\n3️⃣ Regresar al menú principal`);
      return;

    case 'f1Ben':
      await msg.reply(`🎓 F-1 – Beneficios:\n• OPT postgrado\n• Trabajo en campus\n\n1️⃣ Ver planes\n2️⃣ Agendar cita\n3️⃣ Regresar al menú principal`);
      return;

    case 'bookMode':
      await msg.reply(`👍 ¿Cómo prefieres tu cita?\n1️⃣ Virtual (≤12 h)\n2️⃣ Presencial (≤1 sem)\n3️⃣ Regresar al menú principal`);
      S.step = 'chooseCita'; saveState();
      return;

    case 'chooseCita':
      if (!/^[1-3]$/.test(text)) {
        S.step = 'welcome'; saveState();
        return msg.reply(menuText);
      }
      if (text === '3') { S.step = 'welcome'; saveState(); return msg.reply(menuText); }
      S.step = text === '1' ? 'collectContactVirtual' : 'selectOffice';
      saveState();
      return client.emit('message', msg);

    case 'selectOffice':
      await msg.reply(`🏢 Elige oficina para cita presencial:\n1️⃣ Alpharetta, GA\n2️⃣ San Antonio, TX\n3️⃣ Barranquilla, CO\n4️⃣ Regresar al menú principal`);
      S.step = 'collectOffice'; saveState();
      return;

    case 'collectOffice':
      if (!/^[1-4]$/.test(text) || text==='4') {
        S.step = 'welcome'; saveState();
        return msg.reply(menuText);
      }
      const offices = ['Alpharetta, GA','San Antonio, TX','Barranquilla, CO'];
      S.data.office = offices[Number(text)-1];
      S.step = 'collectContactPresencial'; saveState();
      return client.emit('message', msg);

    case 'collectContactVirtual':
      await msg.reply(`🚀 Cita virtual elegida.\nEnvía tu nombre completo, email y teléfono.`);
      S.step = 'end'; saveState();
      return;

    case 'collectContactPresencial':
      await msg.reply(`✅ Oficina ${S.data.office} seleccionada.\nEnvía tu nombre completo, email y teléfono.`);
      S.step = 'end'; saveState();
      return;

    case 'end':
      // Notifica al admin y regresa al menú
      await client.sendMessage(
        ADMIN,
        `📅 Cita GM Migration\n• Prospecto: ${chat}\n` +
        `• Modalidad: ${S.data.office?'Presencial':'Virtual'}\n` +
        (S.data.office?`• Oficina: ${S.data.office}\n`:'') +
        `• Datos: ${msg.body}`
      );
      S.step = 'welcome';
      saveState();
      return msg.reply(menuText);

    case 'expert':
      S.step = 'bookMode'; saveState();
      return client.emit('message', msg);

    case 'openCase':
      await msg.reply(`¿Con quién quieres agendar?\n1️⃣ Gustavo M.\n2️⃣ Vianny J.\n3️⃣ Arelys J.\n4️⃣ Steven P.\n5️⃣ Michael J.\n6️⃣ Cindy P.\n7️⃣ Otro\n8️⃣ Regresar`);
      S.step = 'openOpt'; saveState();
      return;

    case 'openOpt':
      if (!/^[1-8]$/.test(text)) {
        S.step = 'welcome'; saveState();
        return msg.reply(menuText);
      }
      if (text==='8') {
        S.step = 'welcome'; saveState();
        return msg.reply(menuText);
      }
      const experts = ['Gustavo M.','Vianny J.','Arelys J.','Steven P.','Michael J.','Cindy P.','otro'];
      await msg.reply(`Agendaré con ${experts[Number(text)-1]}. Envía tu nombre completo, email y teléfono.`);
      S.step = 'end'; saveState();
      return;

    case 'other':
      await msg.reply(menuText);
      S.step = 'welcome'; saveState();
      return;

    default:
      S.step = 'welcome'; saveState();
      return msg.reply(menuText);
  }
});

client.initialize();
