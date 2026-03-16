import 'dotenv/config';
import pkg from 'whatsapp-web.js';
import { handleMessage } from './handler.js';
import { startServer, state } from './server.js';

const { Client, LocalAuth } = pkg;

// Start web server dulu (Railway butuh PORT bound segera)
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

// ── QR Code → simpan ke state, tampil di web ─────────────
client.on('qr', (qr) => {
  state.qrData = qr;
  state.isReady = false;
  console.log('📱 QR siap! Buka Railway URL di browser untuk scan.');
});

// ── Ready ─────────────────────────────────────────────────
client.on('ready', () => {
  const info = client.info;
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

// ── Message ───────────────────────────────────────────────
client.on('message', async (msg) => {
  if (msg.from === 'status@broadcast') return;
  if (msg.fromMe) return;
  await handleMessage(client, msg);
});

// ── Auth ──────────────────────────────────────────────────
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
  console.log('🔄 Reconnecting...');
  client.initialize();
});

// ── Init ──────────────────────────────────────────────────
console.log('🚀 Starting WA Gemini Bot...');
client.initialize();
