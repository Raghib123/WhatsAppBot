import 'dotenv/config';
import pkg from 'whatsapp-web.js';
import { handleMessage } from './handler.js';
import { startServer, state } from './server.js';

const { Client, LocalAuth } = pkg;

let readyAt = null;

startServer();

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: '/app/.wwebjs_auth' }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu',
    ],
  },
});

client.on('qr', (qr) => {
  state.qrData = qr;
  state.isReady = false;
  console.log('📱 QR siap! Buka Railway URL di browser untuk scan.');
});

client.on('ready', () => {
  const info = client.info;
  readyAt = Date.now();
  state.isReady = true;
  state.qrData = null;
  state.botName = info.pushname;
  state.botNumber = info.wid.user;

  console.log('✅ Bot aktif!');
  console.log(`📞 Nomor  : ${info.wid.user}`);
  console.log(`👤 Nama   : ${info.pushname}`);
  console.log('─'.repeat(40));
  console.log('🤖 Semua pesan masuk akan dibalas Gemini');
  console.log('🎨 Kirim "/image <prompt>" untuk generate gambar');
  console.log('─'.repeat(40));
});

client.on('message', async (msg) => {
  if (msg.from === 'status@broadcast') return;
  if (msg.fromMe) return;
  if (msg.isStatus) return;

  // Ignore pesan lama sebelum bot ready
  const msgTime = msg.timestamp * 1000;
  if (!readyAt || msgTime < readyAt) return;

  await handleMessage(client, msg);
});

client.on('authenticated', () => console.log('🔐 Authenticated!'));
client.on('auth_failure', (msg) => {
  console.error('❌ Auth gagal:', msg);
  state.isReady = false;
  state.qrData = null;
});
client.on('disconnected', (reason) => {
  console.warn('⚠️  Disconnected:', reason);
  state.isReady = false;
  state.qrData = null;
  readyAt = null;
  console.log('🔄 Reconnecting...');
  client.initialize();
});

console.log('🚀 Starting WA Gemini Bot...');
client.initialize();
