// index.js
const express = require('express');
const fs = require('fs');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// Health-check
const app = express();
app.get('/', (_req, res) => res.send('OK'));
app.listen(process.env.PORT||3000);

// Estado simple por chat
let state = {};
const STATE_FILE = 'state.json';
try { state = JSON.parse(fs.readFileSync(STATE_FILE,'utf-8')); } catch {}
function save() {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state,null,2),'utf-8');
}

// Carga FAQs y triggers
const rawFaq = JSON.parse(fs.readFileSync('faq.json','utf-8'));
function normalize(s='') {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[¿?¡!.,]/g,'').trim();
}
const faqMap = {};
for (let q in rawFaq) faqMap[ normalize(q) ] = rawFaq[q];
const triggers = ["quiero contratar","precio final","cómo contrato","agendar cita"];
const ADMIN = '16784579286@c.us';

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { args:['--no-sandbox','--disable-setuid-sandbox'] }
});
client.on('qr', qr => { qrcode.generate(qr,{small:true}); });
client.on('ready', () => console.log('✅ Bot listo'));

client.on('message', async msg => {
  const chat = msg.from;
  const text = (msg.body||'').trim();
  const low = normalize(text);

  if (!state[chat]) {
    state[chat] = { greeted:false, tries:0 };
    save();
  }

  // 1) Saludo único
  if (!state[chat].greeted) {
    state[chat].greeted = true;
    save();
    return msg.reply('¡Hola! 👋 Soy Carlos M. de GM Migration, ¿en qué puedo ayudarte hoy?');
  }

  // 2) Reconoce FAQ
  for (let key in faqMap) {
    const toks = key.split(' ').filter(w=>w.length>3);
    const hits = toks.filter(w=> low.includes(w) ).length;
    if (hits >= Math.ceil(toks.length/2)) {
      return msg.reply(faqMap[key]);
    }
  }

  // 3) Triggers
  for (let trg of triggers) {
    if (low.includes(normalize(trg))) {
      await client.sendMessage(ADMIN, `⚡ Prospecto: "${msg.body}"`);
      return msg.reply('¡Genial! 😊 Te conectaré con un experto para avanzar.');
    }
  }

  // 4) Fallback con 5 intentos
  state[chat].tries++;
  save();
  if (state[chat].tries < 5) {
    return msg.reply(`No entendí bien 🤔 (intent ${state[chat].tries}/5). ¿Podrías reformular o elegir otra pregunta?`);
  }

  // 5) Tras 5 fallos, notifica y detiene
  await msg.reply('Parece que prefieres hablar con un experto. 👨‍💼 Te conectaré ahora.');
  await client.sendMessage(ADMIN, `🔕 Pausado tras 5 intentos: "${msg.body}"`);
  // marcamos como infinito para no notificar otra vez
  state[chat].tries = Infinity;
  save();
});

client.initialize();
