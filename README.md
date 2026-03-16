# 🤖 WA Gemini Bot

WhatsApp personal bot pakai Gemini 2.0 Flash (chat) + Imagen 3 (image gen).
QR scan lewat browser — support Railway deployment.

---

## 🚀 Deploy ke Railway

### 1. Push ke GitHub dulu
```bash
git init
git add .
git commit -m "init"
git remote add origin https://github.com/username/wa-gemini-bot.git
git push -u origin main
```

### 2. Buat project di Railway
- Buka [railway.app](https://railway.app) → New Project → Deploy from GitHub
- Pilih repo ini

### 3. Set Environment Variables di Railway
Di Railway dashboard → Variables, tambahkan:
```
GEMINI_API_KEY   = your_gemini_api_key
PORT             = 3000
```
> Ambil Gemini API key gratis di: https://aistudio.google.com/app/apikey

### 4. Set Volume untuk persistent session
Di Railway → Add Volume → mount path: `/app/.wwebjs_auth`
> Ini penting biar ga perlu scan QR ulang tiap redeploy!

### 5. Scan QR
- Buka Railway URL lo (misal: `https://wa-bot-xxx.railway.app`)
- Scan QR yang muncul di browser
- **Done!** Bot langsung aktif 🎉

---

## 💻 Jalanin Lokal (Docker)

```bash
cp .env.example .env
# Edit .env, isi GEMINI_API_KEY

docker compose up --build
# Buka http://localhost:3000 untuk scan QR
```

---

## 📱 Cara Pakai Bot

| Command | Fungsi |
|---------|--------|
| Ketik sembarang | Chat dengan Gemini (ada memory per user) |
| `/image <prompt>` | Generate gambar AI pakai Imagen 3 |
| `/reset` | Reset history percakapan |
| `/help` | Lihat semua command |

---

## 📂 Struktur Project

```
wa-gemini-bot/
├── src/
│   ├── index.js    # Entry point + WA client
│   ├── server.js   # Express web server (QR page)
│   ├── handler.js  # Message routing & commands
│   └── gemini.js   # Gemini API (chat + image gen)
├── Dockerfile
├── docker-compose.yml
├── railway.toml
└── .env
```

---

## ⚠️ Troubleshooting

**QR ga muncul di browser?**
Tunggu ~30 detik, Railway butuh waktu build. Refresh halaman.

**Session hilang setelah redeploy?**
Pastikan Railway Volume sudah di-mount ke `/app/.wwebjs_auth`.

**Imagen 3 error "not available"?**
Imagen 3 butuh billing aktif di Google AI.
Ganti di `src/gemini.js` → model: `gemini-2.0-flash-exp-image-generation`
