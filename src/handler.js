import pkg from 'whatsapp-web.js';
import { geminiChat, geminiGenerateImage, clearHistory } from './gemini.js';

const { MessageMedia } = pkg;

const IMAGE_PREFIX = process.env.IMAGE_PREFIX || '/image';

// Rate limiting sederhana biar ga spam
const cooldowns = new Map();
const COOLDOWN_MS = 2000; // 2 detik per user

function isOnCooldown(userId) {
  const last = cooldowns.get(userId);
  if (!last) return false;
  return Date.now() - last < COOLDOWN_MS;
}

function setCooldown(userId) {
  cooldowns.set(userId, Date.now());
}

// ── Main handler ──────────────────────────────────────────
export async function handleMessage(client, msg) {
  const userId = msg.from;
  const body = msg.body?.trim();

  if (!body) return;

  // Log incoming
  const contact = await msg.getContact();
  const name = contact.pushname || contact.number;
  console.log(`📨 [${name}] ${body.substring(0, 60)}${body.length > 60 ? '...' : ''}`);

  // Cooldown check
  if (isOnCooldown(userId)) return;
  setCooldown(userId);

  // ── Command: /reset ───────────────────────────────────
  if (body.toLowerCase() === '/reset') {
    clearHistory(userId);
    await msg.reply('🔄 History chat di-reset! Kita mulai fresh ya.');
    return;
  }

  // ── Command: /help ────────────────────────────────────
  if (body.toLowerCase() === '/help') {
    await msg.reply(
      `🤖 *WA Gemini Bot*\n\n` +
      `💬 *Chat biasa* → Langsung ketik, Gemini akan bales\n` +
      `🎨 */image <deskripsi>* → Generate gambar AI\n` +
      `🔄 */reset* → Reset history percakapan\n` +
      `❓ */help* → Tampilkan bantuan ini\n\n` +
      `_Powered by Gemini 2.0 Flash + Imagen 3_`
    );
    return;
  }

  // ── Command: /image <prompt> ──────────────────────────
  if (body.toLowerCase().startsWith(IMAGE_PREFIX + ' ') || body.toLowerCase() === IMAGE_PREFIX) {
    const prompt = body.slice(IMAGE_PREFIX.length).trim();

    if (!prompt) {
      await msg.reply(`❌ Kasih deskripsi gambarnya dong!\nContoh: \`${IMAGE_PREFIX} kucing astronot di luar angkasa\``);
      return;
    }

    // Kirim "loading" dulu
    await msg.reply(`🎨 Lagi generate gambar...\n_"${prompt}"_\n\nBentar ya ✨`);

    try {
      const imageBuffer = await geminiGenerateImage(prompt);
      const media = new MessageMedia('image/jpeg', imageBuffer.toString('base64'), 'generated.jpg');
      await client.sendMessage(userId, media, {
        caption: `✅ *Generated Image*\n📝 Prompt: _${prompt}_`,
      });
      console.log(`🎨 Image generated for [${name}]: ${prompt}`);
    } catch (err) {
      console.error('Image gen error:', err.message);
      await msg.reply(`❌ Gagal generate gambar: ${err.message}\n\nCoba prompt yang berbeda ya.`);
    }

    return;
  }

  // ── Default: Gemini Chat ──────────────────────────────
  try {
    // Typing indicator
    const chat = await msg.getChat();
    await chat.sendStateTyping();

    const reply = await geminiChat(userId, body);
    await msg.reply(reply);
    console.log(`💬 Replied to [${name}]`);
  } catch (err) {
    console.error('Chat error:', err.message);
    await msg.reply('⚠️ Waduh, ada error nih. Coba lagi ya!');
  }
}
