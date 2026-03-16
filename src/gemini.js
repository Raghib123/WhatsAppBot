import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const histories = new Map();
const MAX_HISTORY = parseInt(process.env.MAX_HISTORY || '10');

function getHistory(userId) {
  if (!histories.has(userId)) histories.set(userId, []);
  return histories.get(userId);
}

function addToHistory(userId, role, text) {
  const history = getHistory(userId);
  history.push({ role, parts: [{ text }] });
  if (history.length > MAX_HISTORY * 2) history.splice(0, 2);
}

export function clearHistory(userId) {
  histories.delete(userId);
}

export async function geminiChat(userId, userMessage) {
  const history = getHistory(userId);

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [
      ...history,
      { role: 'user', parts: [{ text: userMessage }] },
    ],
    config: {
      systemInstruction: `Kamu adalah asisten WhatsApp yang helpful, friendly, dan sedikit santai.
Jawab dalam bahasa yang sama dengan user (Indonesia atau Inggris).
Jawaban singkat dan to-the-point kecuali user minta penjelasan panjang.
Kalau user minta buat gambar, kasih tau mereka untuk pakai prefix /image diikuti deskripsi gambar.
Hari ini adalah ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`,
      tools: [{ googleSearch: {} }],
    },
  });

  const reply = response.text;

  addToHistory(userId, 'user', userMessage);
  addToHistory(userId, 'model', reply);

  return reply;
}

export async function geminiGenerateImage(prompt) {
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
        parameters: { sampleCount: 1, aspectRatio },
      }),
    }
  );

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Gagal generate image');

  const b64 = data.predictions?.[0]?.bytesBase64Encoded;
  if (!b64) throw new Error('Response kosong dari Imagen');

  return Buffer.from(b64, 'base64');
}
