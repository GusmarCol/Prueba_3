// index.js
const express = require('express');
const fs = require('fs');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// --- Health-check para Render ---
const app = express();
app.get('/', (_req, res) => res.send('OK'));

// --- Endpoint QR público ---
let lastQr = '';
app.get('/qr', (_req, res) => {
  if (!lastQr) return res.status(404).send('Aún no hay QR generado');
  const url = encodeURIComponent(lastQr);
  res.redirect(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${url}`);
});

app.listen(process.env.PORT || 3000, () => console.log('HTTP server listening'));

// --- Estado del bot ---
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

const ADMIN = '16784579286@c.us';

// --- Cliente WhatsApp ---
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
});

client.on('qr', qr => {
  lastQr = qr;
  qrcode.generate(qr, { small: true });
  console.log('Escanea tu QR aquí: https://bot-whatsapp-render-42jc.onrender.com/qr');
});

client.on('ready', () => console.log('✅ Carlos está listo para ayudarte'));

client.on('message', async msg => {
  const chat = msg.from;
  const text = (msg.body || '').trim();

  if (!state[chat]) {
    state[chat] = { step: 'welcome', data: {}, last: Date.now() };
  }

  const now = Date.now();
  if (now - state[chat].last > 300000) {
    state[chat] = { step: 'welcome', data: {}, last: now };
  } else {
    state[chat].last = now;
  }
  saveState();

  const S = state[chat];

  switch (S.step) {
    case 'welcome':
      await msg.reply(
        `👋 *Hola! Soy Carlos*, tu asistente virtual de GM Migration.

✨ Elige una opción para empezar:
1. 👫 Asilo
2. 💼 Visa EB2 NIW
3. 🚪 Visa L1A
4. 🎓 Visa F1
5. 🔐 Ya soy cliente
6. 🚨 Otro asunto

*Responde solo con el número.*`
      );
      S.step = 'main';
      saveState();
      return;

    case 'main':
      if (!/^[1-6]$/.test(text)) {
        S.step = 'welcome';
        return client.emit('message', msg);
      }
      const options = {
        '1': 'asilo',
        '2': 'eb2',
        '3': 'l1a',
        '4': 'f1',
        '5': 'cliente',
        '6': 'otro'
      };
      S.step = options[text];
      saveState();
      return client.emit('message', msg);

    case 'asilo':
      await msg.reply(
        `🌟 *Beneficios de Asilo*:
- ✅ Protección ante persecución
- ✅ Permiso de trabajo tras 150 días
- ✅ Estatus legal durante proceso
- ✅ Cobertura familiar

Planes disponibles aquí: https://gmmigration.com`
      );
      S.step = 'welcome';
      saveState();
      return;

    case 'eb2':
      await msg.reply(
        `💼 *Visa EB-2 NIW*
1. ❓ ¿Quieres saber si tu perfil aplica?
2. ✨ Beneficios
3. 💸 Ver planes y pagar
4. 🔙 Volver al inicio`
      );
      S.step = 'eb2Opt';
      saveState();
      return;

    case 'eb2Opt':
      if (text === '1') {
        await msg.reply('Contesta esta evaluación: https://tally.so/r/3qq962');
      } else if (text === '2') {
        await msg.reply(
          `✨ *Beneficios Visa EB2 NIW*:
- ✅ No necesitas oferta laboral
- ✅ Aplicas tú mismo (Self-petition)
- ✅ Incluye a cónyuge e hijos
- ✅ Libertad para viajar

Planes con descuento en julio 🌟
https://gmmigration.com`
        );
      } else if (text === '3') {
        await msg.reply(
          `⚡ *¡Aprovecha la oferta de julio!* Solo las primeras 50 solicitudes obtienen este beneficio. Desliza y escoge tu plan aquí:
https://gmmigration.com`
        );
      }
      S.step = 'welcome';
      saveState();
      return;

    case 'l1a':
      await msg.reply(
        `🚪 *Visa L-1A*
- ✅ Transferencia ejecutiva
- ✅ Esposa con permiso de trabajo
- ✅ Creación de empresa en USA
- ✅ Camino a green card

Info y pago aquí:
https://gmmigration.com`
      );
      S.step = 'welcome';
      saveState();
      return;

    case 'f1':
      await msg.reply(
        `🎓 *Visa F-1 (Estudiante)*
- ✅ Estudia en una institución acreditada
- ✅ Trabajo en campus
- ✅ OPT (hasta 3 años si es STEM)
- ✅ Red de contactos profesionales

Conoce más: https://guias.gmmigration.com/`
      );
      S.step = 'welcome';
      saveState();
      return;

    case 'cliente':
      await msg.reply(
        `🧑‍💼 *¿Quién es tu asesor?*
1. Gustavo M.
2. Vianny J.
3. Arelys J.
4. Steven P.
5. Michael J.
6. Cindy P.
7. No recuerdo

*Responde solo con el número*`
      );
      S.step = 'clienteSel';
      saveState();
      return;

    case 'clienteSel':
      S.step = 'welcome';
      saveState();
      return msg.reply(`Gracias. Pronto tu asesor se comunicará contigo ✉️`);

    case 'otro':
      await msg.reply(
        `🚨 *Otro asunto*:
Por favor escribe tu mensaje y será leído por nuestro equipo.

También puedes escribirnos a: contacto@gmmigration.com`
      );
      S.step = 'welcome';
      saveState();
      return;
  }
});

client.initialize();
