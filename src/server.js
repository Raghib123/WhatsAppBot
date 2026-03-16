import express from 'express';
import qrcode from 'qrcode';

const app = express();
const PORT = process.env.PORT || 3000;

// State yang di-share ke index.js
export const state = {
  qrData: null,       // raw QR string dari whatsapp-web.js
  isReady: false,
  botName: null,
  botNumber: null,
};

// ── Routes ────────────────────────────────────────────────
app.get('/', (req, res) => {
  if (state.isReady) {
    return res.send(pageReady(state.botName, state.botNumber));
  }
  if (!state.qrData) {
    return res.send(pageWaiting());
  }
  res.send(pageQR());
});

// Endpoint QR sebagai image PNG (buat di-embed di HTML)
app.get('/qr.png', async (req, res) => {
  if (!state.qrData) {
    return res.status(404).send('QR belum tersedia');
  }
  try {
    const buffer = await qrcode.toBuffer(state.qrData, {
      errorCorrectionLevel: 'H',
      width: 400,
      margin: 2,
    });
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-store');
    res.send(buffer);
  } catch (err) {
    res.status(500).send('Gagal generate QR');
  }
});

// Status endpoint (buat auto-refresh cek)
app.get('/status', (req, res) => {
  res.json({ ready: state.isReady, hasQR: !!state.qrData });
});

// ── HTML Pages ────────────────────────────────────────────
function pageWaiting() {
  return html('⏳ Starting...', `
    <div class="card">
      <div class="spinner"></div>
      <h2>Bot lagi starting up...</h2>
      <p>Tunggu bentar, QR code bakal muncul otomatis.</p>
    </div>
    <script>setTimeout(() => location.reload(), 3000)</script>
  `);
}

function pageQR() {
  return html('📱 Scan QR', `
    <div class="card">
      <h1>📱 Scan QR Code</h1>
      <p>Buka WhatsApp → <strong>Linked Devices</strong> → <strong>Link a Device</strong></p>
      <div class="qr-wrap">
        <img id="qrimg" src="/qr.png" alt="QR Code" />
      </div>
      <p class="hint">QR expired tiap ~20 detik, auto-refresh otomatis ✨</p>
    </div>
    <script>
      // Auto refresh QR image tiap 5 detik
      setInterval(() => {
        document.getElementById('qrimg').src = '/qr.png?t=' + Date.now();
      }, 5000);
      // Cek kalau udah connected
      setInterval(async () => {
        const res = await fetch('/status');
        const data = await res.json();
        if (data.ready) location.reload();
      }, 4000);
    </script>
  `);
}

function pageReady(name, number) {
  return html('✅ Bot Aktif', `
    <div class="card success">
      <div class="checkmark">✅</div>
      <h1>Bot Aktif!</h1>
      <div class="info">
        <p>👤 <strong>${name || 'Unknown'}</strong></p>
        <p>📞 <strong>+${number || '?'}</strong></p>
      </div>
      <div class="commands">
        <h3>Commands:</h3>
        <code>/image &lt;prompt&gt;</code> → Generate gambar AI<br>
        <code>/reset</code> → Reset history chat<br>
        <code>/help</code> → List semua command
      </div>
    </div>
  `);
}

function html(title, body) {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>WA Gemini Bot — ${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0a0a0a;
      color: #e0e0e0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: #141414;
      border: 1px solid #2a2a2a;
      border-radius: 16px;
      padding: 40px;
      max-width: 460px;
      width: 100%;
      text-align: center;
    }
    .card.success { border-color: #25d366; }
    h1 { font-size: 1.6rem; margin-bottom: 10px; }
    h2 { font-size: 1.2rem; margin: 16px 0 8px; }
    p  { color: #999; line-height: 1.6; margin: 8px 0; }
    .qr-wrap {
      background: #fff;
      border-radius: 12px;
      padding: 16px;
      display: inline-block;
      margin: 24px 0;
    }
    .qr-wrap img { display: block; width: 240px; height: 240px; }
    .hint { font-size: 0.8rem; color: #555; }
    .spinner {
      width: 48px; height: 48px;
      border: 4px solid #2a2a2a;
      border-top-color: #25d366;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 20px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .checkmark { font-size: 3rem; margin-bottom: 12px; }
    .info { background: #1a1a1a; border-radius: 10px; padding: 16px; margin: 20px 0; }
    .info p { color: #ccc; margin: 6px 0; }
    .commands { text-align: left; background: #1a1a1a; border-radius: 10px; padding: 16px; margin-top: 16px; }
    .commands h3 { margin-bottom: 10px; font-size: 0.9rem; color: #888; }
    code { background: #252525; padding: 2px 8px; border-radius: 4px; font-size: 0.85rem; color: #25d366; }
  </style>
</head>
<body>${body}</body>
</html>`;
}

// ── Start server ──────────────────────────────────────────
export function startServer() {
  app.listen(PORT, () => {
    console.log(`🌐 Web server aktif di port ${PORT}`);
    console.log(`🔗 Buka di browser untuk scan QR`);
  });
}
