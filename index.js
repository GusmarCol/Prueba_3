// index.js
const express = require('express');
const fs = require('fs');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const app = express();
app.get('/', (_req, res) => res.send('OK'));
app.listen(process.env.PORT || 3000, () => console.log('Server up')); 

// Estado por chat
tconst STATE_FILE = 'state.json';
let state = {};
try { state = JSON.parse(fs.readFileSync(STATE_FILE,'utf-8')); } catch {}
function saveState() {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state,null,2),'utf-8');
}

const ADMIN = '16784579286@c.us';

// Inicializa WhatsApp\const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { args:['--no-sandbox','--disable-setuid-sandbox'] }
});
client.on('qr', qr => qrcode.generate(qr,{ small:true }));
client.on('ready', () => console.log('✅ Carlos listo')); 

client.on('message', async msg => {
  const chat = msg.from;
  const text = (msg.body||'').trim();

  // Inicializar estado si es nuevo chat
  if (!state[chat]) {
    state[chat] = { step:'welcome', data:{}, last:Date.now(), tries:0 };
    saveState();
  }
  
  const S = state[chat];
  const now = Date.now();
  if (now - S.last > 300000) {
    S.step = 'welcome'; S.tries = 0;
  }
  S.last = now;
  saveState();

  switch (S.step) {
    case 'welcome':
      await msg.reply(
        `¡Hola! 👋 Bienvenido/a a GM Migration. Estoy aquí para ayudarte.\n\n`+
        `1️⃣ Asilo\n`+
        `2️⃣ Visa EB-2 NIW\n`+
        `3️⃣ Visa L-1A\n`+
        `4️⃣ Visa F-1\n`+
        `5️⃣ Asesoría con un experto\n`+
        `6️⃣ Ya tengo un caso abierto\n`+
        `7️⃣ Otro asunto\n\n`+
        `📌 Responde solo con el número (1️⃣–7️⃣).`
      );
      S.step='menu'; saveState();
      return;

    case 'menu':
      if (!/^[1-7]$/.test(text)) return msg.reply('Por favor responde solo con el número de la opción (1️⃣–7️⃣).');
      const steps = ['asilo','eb2','l1a','f1','expert','openCase','other'];
      S.step = steps[Number(text)-1];
      saveState();
      return client.emit('message', msg);

    case 'asilo':
      await msg.reply(
        `¿Qué necesitas sobre asilo?\n`+
        `1️⃣ Info general\n`+
        `2️⃣ Beneficios\n`+
        `3️⃣ Pagar defensivo\n`+
        `4️⃣ Pagar afirmativo\n`+
        `5️⃣ Hablar con un experto\n\n`+
        `📌 Solo el número, por favor.`
      );
      S.step='asiloOpt'; saveState();
      return;

    case 'asiloOpt':
      if (!/^[1-5]$/.test(text)) return msg.reply('Responde con 1️⃣–5️⃣.');
      if (text==='1') {
        await msg.reply('Guía de asilo: https://guias.gmmigration.com/');
      }
      if (text==='2') {
        await msg.reply(
          `Beneficios de asilo:\n`+
          `- Protección ante persecución\n`+
          `- Permiso de trabajo a 150 días\n`+
          `- Deriva a familia\n\n`+
          `¿1️⃣ Planes 🔒  2️⃣ Cita  3️⃣ Otro?`
        );
        S.step='asiloBen'; saveState();
        return;
      }
      if (text==='3'||text==='4') {
        await msg.reply(
          'Visita https://gmmigration.com, ve a la sección de **Planes**, elige la que más te convenga y haz tu pago de forma segura 🔒'
        );
      }
      if (text==='5') {
        S.step='bookMode'; saveState();
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
        S.step='bookMode'; saveState();
        return client.emit('message', msg);
      } else {
        await msg.reply('Cuéntame tu duda o elige otra opción.');
      }
      S.step='welcome'; saveState();
      return;

    case 'eb2':
      await msg.reply(
        `EB-2 NIW:\n`+
        `1️⃣ ¿Aplicas? 2️⃣ Beneficios\n`+
        `3️⃣ Pagar 🔒 4️⃣ Hablar con un experto\n\n`+
        `📌 Solo número, por favor.`
      );
      S.step='eb2Opt'; saveState();
      return;

    case 'eb2Opt':
      if (!/^[1-4]$/.test(text)) return msg.reply('Responde con 1️⃣–4️⃣.');
      if (text==='1') await msg.reply('Test de calificación: https://tally.so/r/3qq962');
      if (text==='2') await msg.reply(
        `Beneficios EB-2 NIW:\n`+
        `- Sin oferta de empleo\n`+
        `- Autopetición de caso\n`+
        `- Deriva a familia\n`+
        `- Libertad de viaje\n`+
        `- Proceso rápido\n\n`+
        `¿1️⃣ Test  2️⃣ Pagar 🔒  3️⃣ Cita?`
      );
      if (text==='3') await msg.reply(
        'Visita https://gmmigration.com, ve a la sección de **Planes**, elige la que más te convenga y haz tu pago de forma segura 🔒'
      );
      if (text==='4') { S.step='bookMode'; saveState(); return client.emit('message', msg); }
      S.step='welcome'; saveState();
      return;

    case 'l1a':
      await msg.reply(
        `Visa L-1A:\n`+
        `1️⃣ Info general 2️⃣ Beneficios\n`+
        `3️⃣ Pagar 🔒 4️⃣ Hablar con un experto\n\n`+
        `📌 Solo número, por favor.`
      );
      S.step='l1aOpt'; saveState();
      return;
    case 'l1aOpt':
      if (!/^[1-4]$/.test(text)) return msg.reply('Responde con 1️⃣–4️⃣.');
      if (text==='1') await msg.reply('Guía L-1A: https://guias.gmmigration.com/');
      if (text==='2') await msg.reply(
        `Beneficios L-1A:\n`+
        `- Transferencia rápida\n`+
        `- Cónyuge con permiso de trabajo\n`+
        `- Expansión de negocio\n`+
        `- Vía a Green Card\n\n`+
        `¿1️⃣ Planes 🔒  2️⃣ Cita  3️⃣ Otro?`
      );
      if (text==='3') await msg.reply(
        'Visita https://gmmigration.com, ve a la sección de **Planes**, elige la que más te convenga y haz tu pago de forma segura 🔒'
      );
      if (text==='4') { S.step='bookMode'; saveState(); return client.emit('message', msg); }
      S.step='welcome'; saveState();
      return;

    case 'f1':
      await msg.reply(
        `Visa F-1:\n`+
        `1️⃣ Info general 2️⃣ Beneficios\n`+
        `3️⃣ Pagar 🔒 4️⃣ Hablar con un experto\n\n`+
        `📌 Solo número, por favor.`
      );
      S.step='f1Opt'; saveState();
      return;
    case 'f1Opt':
      if (!/^[1-4]$/.test(text)) return msg.reply('Responde con 1️⃣–4️⃣.');
      if (text==='1') await msg.reply('Guía F-1: https://guias.gmmigration.com/');
      if (text==='2') await msg.reply(
        `Beneficios F-1:\n`+
        `- Estudiar en EE.UU.\n`+
        `- Trabajo en campus y OPT\n`+
        `- Networking\n`+
        `- Vías a residencia\n\n`+
        `¿1️⃣ Planes 🔒  2️⃣ Cita  3️⃣ Otro?`
      );
      if (text==='3') await msg.reply(
        'Visita https://gmmigration.com, ve a la sección de **Planes**, elige la que más te convenga y haz tu pago de forma segura 🔒'
      );
      if (text==='4') { S.step='bookMode'; saveState(); return client.emit('message', msg); }
      S.step='welcome'; saveState();
      return;

    case 'expert':
      await msg.reply('Para agendar asesoría, ¿cómo prefieres tu cita?\n1️⃣ Virtual (12 h)\n2️⃣ Presencial (24 h–1 sem)');
      S.step='bookMode'; saveState();
      return;

    case 'openCase':
      await msg.reply(
        `¿Con quién deseas agendar?\n`+
        `1️⃣ Gustavo M.\n2️⃣ Vianny J.\n3️⃣ Arelys J.\n`+
        `4️⃣ Steven P.\n5️⃣ Michael J.\n6️⃣ Cindy P.\n7️⃣ Otro`
      );
      S.step='openOpt'; saveState();
      return;
    case 'openOpt':
      if (!/^[1-7]$/.test(text)) return msg.reply('Responde con 1️⃣–7️⃣.');
      const experts = ['Gustavo M.','Vianny J.','Arelys J.','Steven P.','Michael J.','Cindy P.','otro'];
      S.data.expert = experts[Number(text)-1];
      await msg.reply(
        `Agendaré con ${S.data.expert}. Por favor dime tu nombre completo, email y teléfono.`
      );
      S.step='collectContact'; saveState();
      return;

    case 'other':
      await msg.reply(
        'Entiendo. Cuéntame brevemente tu consulta o deja tu nombre y país/ciudad, y te responderé personalmente.'
      );
      S.step='welcome'; saveState();
      return;

    case 'bookMode':
      if (!['1','2'].includes(text)) return msg.reply('Responde 1️⃣ para Virtual o 2️⃣ para Presencial.');
      if (text==='1') {
        await msg.reply(
          'Cita 100% virtual 📱. Te contactaré en las próximas 12 h.\n' +
          'Por favor, envíame tu nombre completo, email y teléfono.'
        );
        S.data.mode = 'virtual';
      } else {
        await msg.reply(
          `Cita presencial 🏢. Te notificaré fecha y hora en 24 h (hasta 1 sem).\n`+
          `1️⃣ Alpharetta, GA\n2️⃣ San Antonio, TX\n3️⃣ Barranquilla, CO`
        );
        S.data.mode = 'presencial';
        S.step='selectOffice'; saveState();
        return;
      }
      S.step='collectContact'; saveState();
      return;

    case 'selectOffice':
      if (!/^[1-3]$/.test(text)) return msg.reply('Responde 1️⃣,2️⃣ o 3️⃣.');
      const offices = ['Alpharetta, GA','San Antonio, TX','Barranquilla, CO'];
      S.data.office = offices[Number(text)-1];
      await msg.reply(
        `Agendaré en ${S.data.office}. Te notificaré fecha y hora en 24 h (hasta 1 sem).\n`+
        'Ahora dime tu nombre completo, email y teléfono.'
      );
      S.step='collectContact'; saveState();
      return;

    case 'collectContact':
      S.data.contact = text;
      saveState();
      await msg.reply('¡Gracias! En breve te enviaremos los detalles.');
      await client.sendMessage(
        ADMIN,
        `📅 Cita solicitada:\n`+
        `• Prospecto: ${chat}\n`+
        `• Modalidad: ${S.data.mode}\n`+
        `${S.data.office?`• Oficina: ${S.data.office}\n`:''}`+
        `• Datos: ${S.data.contact}`
      );
      delete state[chat]; saveState();
      return;
  }
});

client.initialize();
