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
    model: 'gemini-2.0-flash',
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
  const response = await ai.models.generateImages({
    model: 'imagen-3.0-generate-002',
    prompt,
    config: {
      numberOfImages: 1,
      outputMimeType: 'image/jpeg',
      aspectRatio: '1:1',
    },
  });

  const imageData = response.generatedImages?.[0]?.image?.imageBytes;
  if (!imageData) throw new Error('Gagal generate image, coba lagi.');

  // Return sebagai Buffer
  return Buffer.from(imageData, 'base64');
}
