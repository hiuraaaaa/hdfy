const express  = require('express');
const multer   = require('multer');
const fetch    = require('node-fetch');
const FormData = require('form-data');

const app    = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ── CORS ──
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ─────────────────────────────────────────
// POST /api/upload
// Forward file ke restfull-api-2
// ─────────────────────────────────────────
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    const fd = new FormData();
    fd.append('file', req.file.buffer, {
      filename    : req.file.originalname,
      contentType : req.file.mimetype,
    });

    const upstream = await fetch('https://restfull-api-2.vercel.app/api/tools/upload', {
      method  : 'POST',
      body    : fd,
      headers : fd.getHeaders(),
    });

    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    console.error('[upload]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────
// GET /api/enhance?url=...
// Proxy ke Theresa HD API, stream balik gambar
// ─────────────────────────────────────────
app.get('/api/enhance', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Missing url param' });

    const THERESA_KEY = process.env.THERESA_KEY || 'zMslo';
    const apiUrl = `https://api.theresav.biz.id/tools/hd?url=${encodeURIComponent(url)}&apikey=${THERESA_KEY}`;

    const upstream = await fetch(apiUrl);
    if (!upstream.ok) {
      const text = await upstream.text();
      return res.status(upstream.status).json({ error: text });
    }

    const ct = upstream.headers.get('content-type') || 'image/png';
    res.setHeader('Content-Type', ct);
    upstream.body.pipe(res);
  } catch (err) {
    console.error('[enhance]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────
// GET /api/removebg?url=...
// Proxy ke Theresa Remove BG API, stream balik gambar
// ─────────────────────────────────────────
app.get('/api/removebg', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Missing url param' });

    const THERESA_KEY = process.env.THERESA_KEY || 'zMslo';
    const apiUrl = `https://api.theresav.biz.id/tools/removebg?url=${encodeURIComponent(url)}&apikey=${THERESA_KEY}`;

    const upstream = await fetch(apiUrl);
    if (!upstream.ok) {
      const text = await upstream.text();
      return res.status(upstream.status).json({ error: text });
    }

    const ct = upstream.headers.get('content-type') || 'image/png';
    res.setHeader('Content-Type', ct);
    upstream.body.pipe(res);
  } catch (err) {
    console.error('[removebg]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── LOCAL DEV ──
if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => console.log(`Proxy running on http://localhost:${PORT}`));
}

module.exports = app;
