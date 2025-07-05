const express = require('express');
const app = express();

// Ruta health-check
app.get('/', (req, res) => res.send('OK'));

// Abre el puerto que Render exige
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`HTTP server listening on port ${PORT}`));

// WhatsApp bot
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

// Carga las preguntas frecuentes desde faq.json
const faqs = JSON.parse(fs.readFileSync('faq.json', 'utf-8'));

// Define las palabras que activarán una notificación para ti
const triggers = ["quiero contratar", "precio final", "cómo contrato", "agendar cita"];

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

client.on('qr', qr => {
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('✅ ¡Bot listo y conectado!');
});

client.on('message', async msg => {
  const texto = msg.body.toLowerCase();
  let responded = false;

  // Responder FAQs
  for (let pregunta in faqs) {
    if (texto.includes(pregunta.toLowerCase())) {
      await msg.reply(faqs[pregunta]);
      responded = true;
      break;
    }
  }

  // Notificación por triggers
  if (!responded) {
    for (let word of triggers) {
      if (texto.includes(word)) {
        await client.sendMessage(
          '17864579286@c.us',
          `⚡ ¡Prospecto Calificado! Mensaje: "${msg.body}"`
        );
        responded = true;
        break;
      }
    }
  }

  // Respuesta por defecto
  if (!responded) {
    await msg.reply('Gracias por escribir. Un asesor humano te contactará en breve.');
  }
});

client.initialize();
