import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ── In-memory conversation history per user ───────────────
const histories = new Map();
const MAX_HISTORY = parseInt(process.env.MAX_HISTORY || '10');

function getHistory(userId) {
  if (!histories.has(userId)) histories.set(userId, []);
  return histories.get(userId);
}

function addToHistory(userId, role, text) {
  const history = getHistory(userId);
  history.push({ role, parts: [{ text }] });
  // Trim biar ga meledak
  if (history.length > MAX_HISTORY * 2) {
    history.splice(0, 2);
  }
}

export function clearHistory(userId) {
  histories.delete(userId);
}

// ── Chat dengan Gemini (dengan memory) ───────────────────
export async function geminiChat(userId, userMessage) {
  const history = getHistory(userId);

  const chat = ai.chats.create({
    model: 'gemini-3.1-flash-lite-preview',
    history,
    config: {
      systemInstruction: `Kamu adalah asisten WhatsApp yang helpful, friendly, dan sedikit santai.
Jawab dalam bahasa yang sama dengan user (Indonesia atau Inggris).
Jawaban singkat dan to-the-point kecuali user minta penjelasan panjang.
Kalau user minta buat gambar, kasih tau mereka untuk pakai prefix /image diikuti deskripsi gambar.`,
    },
  });

  const response = await chat.sendMessage({ message: userMessage });
  const reply = response.text;

  // Simpan ke history
  addToHistory(userId, 'user', userMessage);
  addToHistory(userId, 'model', reply);

  return reply;
}

// ── Generate Image dengan Imagen 3 ────────────────────────
export async function geminiGenerateImage(prompt) {
  // Detect aspect ratio dari prompt
  let aspectRatio = '1:1';
  const p = prompt.toLowerCase();
  if (p.includes('landscape') || p.includes('wide') || p.includes('horizontal') || p.includes('panorama')) {
    aspectRatio = '16:9';
  } else if (p.includes('portrait') || p.includes('vertical') || p.includes('tall')) {
    aspectRatio = '9:16';
  } else if (p.includes('4:3')) {
    aspectRatio = '4:3';
  } else if (p.includes('3:4')) {
    aspectRatio = '3:4';
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio,
        },
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'Gagal generate image');
  }

  const b64 = data.predictions?.[0]?.bytesBase64Encoded;
  if (!b64) throw new Error('Response kosong dari Imagen');

  return Buffer.from(b64, 'base64');
}
